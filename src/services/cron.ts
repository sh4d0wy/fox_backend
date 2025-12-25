import cron from "node-cron";
import prismaClient from "../database/client";
import logger from "../utils/logger";
import { announceWinners, startAuction, endAuction, startGumball, endGumball } from "./solanaconnector";
import { PublicKey } from "@solana/web3.js";

// ============== AUCTION CRON FUNCTIONS ==============

async function processAuctionsToStart(): Promise<void> {
  const now = new Date();

  try {
    const auctionsToStart = await prismaClient.auction.findMany({
      where: {
        status: "INITIALIZED",
        startsAt: {
          lte: now,
        },
      },
    });

    if (auctionsToStart.length === 0) {
      return;
    }

    logger.log(
      `[CRON] Found ${auctionsToStart.length} auction(s) to start`
    );

    for (const auction of auctionsToStart) {
      try {
        await prismaClient.auction.update({
          where: { id: auction.id },
          data: {
            status: "ACTIVE",
          },
        });

        await startAuction(auction.id);

        logger.log(`[CRON] Auction ${auction.id} started successfully`);
      } catch (error) {
        logger.error(`[CRON] Error starting auction ${auction.id}:`, error);
      }
    }
  } catch (error) {
    logger.error("[CRON] Error fetching auctions to start:", error);
  }
}

async function processAuctionsToEnd(): Promise<void> {
  const now = new Date();

  try {
    const auctionsToEnd = await prismaClient.auction.findMany({
      where: {
        status: "ACTIVE",
        endsAt: {
          lte: now,
        },
      },
      include: {
        bids: true,
      },
    });

    if (auctionsToEnd.length === 0) {
      return;
    }

    logger.log(
      `[CRON] Found ${auctionsToEnd.length} auction(s) to end`
    );

    for (const auction of auctionsToEnd) {
      try {
        if (!auction.hasAnyBid || auction.bids.length === 0) {
          endAuction(auction.id);

          await prismaClient.auction.update({
            where: { id: auction.id },
            data: {
              status: "COMPLETED_FAILED",
              completedAt: now,
            },
          });

          logger.log(
            `[CRON] Auction ${auction.id} ended as COMPLETED_FAILED (no bids)`
          );
        } else {
          endAuction(auction.id);

          await prismaClient.auction.update({
            where: { id: auction.id },
            data: {
              status: "COMPLETED_SUCCESSFULLY",
              completedAt: now,
              finalPrice: auction.highestBidAmount,
            },
          });

          logger.log(
            `[CRON] Auction ${auction.id} ended as COMPLETED_SUCCESSFULLY with highest bid: ${auction.highestBidAmount}`
          );
        }
      } catch (error) {
        logger.error(`[CRON] Error ending auction ${auction.id}:`, error);
      }
    }
  } catch (error) {
    logger.error("[CRON] Error fetching auctions to end:", error);
  }
}

// ============== GUMBALL CRON FUNCTIONS ==============

async function processGumballsToStart(): Promise<void> {
  const now = new Date();

  try {
    const gumballsToStart = await prismaClient.gumball.findMany({
      where: {
        status: "INITIALIZED",
        manualStart: false,
        startTime: {
          lte: now,
        },
      },
    });

    if (gumballsToStart.length === 0) {
      return;
    }

    logger.log(
      `[CRON] Found ${gumballsToStart.length} gumball(s) to start`
    );

    for (const gumball of gumballsToStart) {
      try {
        await startGumball(gumball.id);

        await prismaClient.gumball.update({
          where: { id: gumball.id },
          data: {
            status: "ACTIVE",
            activatedAt: now,
          },
        });

        logger.log(`[CRON] Gumball ${gumball.id} started successfully`);
      } catch (error) {
        logger.error(`[CRON] Error starting gumball ${gumball.id}:`, error);
      }
    }
  } catch (error) {
    logger.error("[CRON] Error fetching gumballs to start:", error);
  }
}

async function processGumballsToEnd(): Promise<void> {
  const now = new Date();
  console.log("now", now.toISOString());

  try {
    const gumballsToEnd = await prismaClient.gumball.findMany({
      where: {
        status: "ACTIVE",
        endTime: {
          lte: now,
        },
      },
    });

    if (gumballsToEnd.length === 0) {
      return;
    }

    logger.log(
      `[CRON] Found ${gumballsToEnd.length} gumball(s) to end`
    );

    for (const gumball of gumballsToEnd) {
      try {
        await endGumball(gumball.id);

        const status = gumball.ticketsSold > 0
          ? "COMPLETED_SUCCESSFULLY"
          : "COMPLETED_FAILED";

        await prismaClient.gumball.update({
          where: { id: gumball.id },
          data: {
            status: status,
            endedAt: now,
          },
        });
        logger.log(
          `[CRON] Gumball ${gumball.id} ended as ${status} (tickets sold: ${gumball.ticketsSold})`
        );
      } catch (error) {
        logger.error(`[CRON] Error ending gumball ${gumball.id}:`, error);
      }
    }
  } catch (error) {
    logger.error("[CRON] Error fetching gumballs to end:", error);
  }
}

// ============== RAFFLE FUNCTIONS ==============

function selectRandomWinners(
  entries: { userAddress: string; quantity: number }[],
  numberOfWinners: number
): string[] {
  if (entries.length === 0) return [];

  const weightedPool: string[] = [];
  for (const entry of entries) {
    for (let i = 0; i < entry.quantity; i++) {
      weightedPool.push(entry.userAddress);
    }
  }

  const uniqueParticipants = [...new Set(entries.map((e) => e.userAddress))];

  if (uniqueParticipants.length <= numberOfWinners) {
    return uniqueParticipants;
  }

  for (let i = weightedPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [weightedPool[i], weightedPool[j]] = [weightedPool[j], weightedPool[i]];
  }

  const winners: Set<string> = new Set();
  let index = 0;

  while (winners.size < numberOfWinners && index < weightedPool.length) {
    winners.add(weightedPool[index]);
    index++;
  }

  if (winners.size < numberOfWinners) {
    for (const participant of uniqueParticipants) {
      if (!winners.has(participant)) {
        winners.add(participant);
        if (winners.size >= numberOfWinners) break;
      }
    }
  }

  return Array.from(winners);
}


async function processExpiredRaffles(): Promise<void> {
  const now = new Date();

  try {
    const expiredRaffles = await prismaClient.raffle.findMany({
      where: {
        state: "Active",
        endsAt: {
          lte: now,
        },
        winnerPicked: false,
      },
      include: {
        raffleEntries: true,
      },
    });

    if (expiredRaffles.length === 0) {
      return;
    }

    logger.log(
      `[CRON] Found ${expiredRaffles.length} expired raffle(s) to process`
    );

    for (const raffle of expiredRaffles) {
      try {
        await prismaClient.$transaction(async (tx) => {
          if (raffle.raffleEntries.length === 0 || raffle.ticketSold === 0) {
            await tx.raffle.update({
              where: { id: raffle.id },
              data: {
                state: "FailedEnded",
                winnerPicked: true,
              },
            });
            logger.log(
              `[CRON] Raffle ${raffle.id} ended as FailedEnded (no entries)`
            );
            return;
          }

          const winnerAddresses = selectRandomWinners(
            raffle.raffleEntries,
            raffle.numberOfWinners
          );
          logger.log(`[CRON] Winner addresses: ${winnerAddresses.join(", ")}`);
          if (winnerAddresses.length === 0) {
            await tx.raffle.update({
              where: { id: raffle.id },
              data: {
                state: "FailedEnded",
                winnerPicked: true,
              },
            });
            logger.log(
              `[CRON] Raffle ${raffle.id} ended as FailedEnded (no valid winners)`
            );
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const signature = await announceWinners(
            {
              raffleId: raffle.id,
              winners: winnerAddresses.map((address) => new PublicKey(address)),
            }
          );
          if (!signature) {
            console.error(`[CRON] Transaction of announce winner failed for raffle ${raffle.id}`);
            throw new Error("Transaction of announce winner failed");
          }

          await tx.raffle.update({
            where: { id: raffle.id },
            data: {
              state: "SuccessEnded",
              winnerPicked: true,
              winners: {
                connect: winnerAddresses.map((address) => ({
                  walletAddress: address,
                })),
              },
            },
          });

          await tx.transaction.create({
            data: {
              raffleId: raffle.id,
              transactionId: signature,
              type: "RAFFLE_END",
              sender: raffle.createdBy,
              receiver: "system",
              amount: BigInt(0),
              isNft: false,
              mintAddress: "So11111111111111111111111111111111111111112",
            },
          });
          await tx.raffle.update({
            where: { id: raffle.id },
            data: {
              state: "SuccessEnded",
              winnerPicked: true,
            },
          });
          logger.log(
            `[CRON] Raffle ${raffle.id} ended successfully with ${winnerAddresses.length} winner(s): ${winnerAddresses.join(", ")}`
          );
        }, { timeout: 10000 });
      } catch (error) {
        logger.error(`[CRON] Error processing raffle ${raffle.id}:`, error);
      }
    }
  } catch (error) {
    logger.error("[CRON] Error fetching expired raffles:", error);
  }
}

export function startRaffleCronJob(): void {
  cron.schedule("* * * * *", async () => {
    logger.log("[CRON] Checking for expired raffles...");
    await processExpiredRaffles();
  });

  logger.log("[CRON] Raffle cron job started - checking every minute");
}

export function startAuctionCronJob(): void {
  cron.schedule("* * * * *", async () => {
    logger.log("[CRON] Checking for auctions to start/end...");
    await processAuctionsToStart();
    await processAuctionsToEnd();
  });

  logger.log("[CRON] Auction cron job started - checking every minute");
}

export function startGumballCronJob(): void {
  cron.schedule("* * * * *", async () => {
    logger.log("[CRON] Checking for gumballs to start/end...");
    await processGumballsToStart();
    await processGumballsToEnd();
  });

  logger.log("[CRON] Gumball cron job started - checking every minute");
}

export function startAllCronJobs(): void {
  startRaffleCronJob();
  startAuctionCronJob();
  startGumballCronJob();
  logger.log("[CRON] All cron jobs started successfully");
}

export default {
  startRaffleCronJob,
  startAuctionCronJob,
  startGumballCronJob,
  startAllCronJobs,
  processExpiredRaffles,
  processAuctionsToStart,
  processAuctionsToEnd,
  processGumballsToStart,
  processGumballsToEnd,
};
