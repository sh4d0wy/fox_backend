import { responseHandler } from "../utils/resHandler";
import { Request, Response } from "express";
import {
  createRaffleSchema,
  raffleSchema,
} from "../schemas/raffle/createRaffle.schema";
import { verifyTransaction } from "../utils/verifyTransaction";
import prismaClient from "../database/client";
import logger from "../utils/logger";
import { cancelRaffleSchema } from "../schemas/raffle/cancelRaffle.schema";
import { buyTicketSchema, buyTicketTxSchema } from "../schemas/raffle/buyTicket.schema";
import { claimPrizeSchema } from "../schemas/raffle/claimPrize.schema";
import { ADMIN_KEYPAIR, connection } from "../services/solanaconnector";
import { PublicKey, Transaction } from "@solana/web3.js";
import { ensureAtaIx, FAKE_ATA, FAKE_MINT, getTokenProgramFromMint, raffleProgram } from "../utils/helpers";
import { BN } from "@coral-xyz/anchor";
import { claimTicketAmountSchema } from "../schemas/raffle/claimTicketAmountSchema";

const getCollectionFloorPrice = async (req: Request, res: Response) => {
  const { symbol } = req.params;
  if (!symbol) {
    return responseHandler.error(res, "Collection is required");
  }
  const url = `https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`;
  const options = { method: 'GET', headers: { accept: 'application/json' } };
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Failed to fetch floor price for ${symbol}`);
  }
  const data = await response.json() as { floorPrice: number };
  const floorPrice = data?.floorPrice || null;

  responseHandler.success(res, {
    message: "Collection floor price fetched successfully",
    error: null,
    floorPrice: floorPrice,
  });
}

const createRaffle = async (req: Request, res: Response) => {
  const body = req.body;
  const { success, data: parsedData, error } = raffleSchema.safeParse(body);
  if (!success) {
    console.log(error);
    return responseHandler.error(res, "Invalid payload");
  }
  if (
    parsedData.endsAt &&
    parsedData.createdAt &&
    parsedData.endsAt < parsedData.createdAt
  ) {
    return responseHandler.error(res, "Invalid endsAt");
  }

  // const isTransactionConfirmed = await verifyTransaction(
  //   parsedData.txSignature
  // );
  // if (!isTransactionConfirmed) {
  //   return responseHandler.error(res, "Transaction not confirmed");
  // }

  const { prizeData, txSignature, ...raffleData} = parsedData;
  let raffle;

  await prismaClient.$transaction(async (tx) => {
    const existingTransaction = await tx.transaction.findUnique({
      where: {
        transactionId: txSignature,
      },
    });
    if (existingTransaction) {
      throw new Error("Transaction already exists");
    }

    const status =
      parsedData.createdAt && parsedData.createdAt <= new Date()
        ? "Active"
        : "Initialized";

    raffle = await tx.raffle.create({
      data: {
        ...raffleData,
        state: status,
        prizeData: {
          create: {
            type: prizeData.type,
            address: prizeData.address,
            mintAddress: prizeData.mintAddress,
            mint: prizeData.mint,
            name: prizeData.name,
            verified: prizeData.verified,
            symbol: prizeData.symbol,
            decimals: prizeData.decimals,
            image: prizeData.image,
            attributes: prizeData.attributes,
            collection: prizeData.collection,
            creator: prizeData.creator,
            description: prizeData.description,
            externalUrl: prizeData.externalUrl,
            properties: prizeData.properties,
            amount: prizeData.amount,
            floor: prizeData.floor,
          },
        },
      },
      include: {
        prizeData: true,
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        transactionId: txSignature,
        type: "RAFFLE_CREATION",
        sender: raffle.createdBy,
        receiver: raffle.raffle || "system",
        amount: BigInt(0),
        mintAddress: "So11111111111111111111111111111111111111112",
      },
    });
    if (!transaction) {
      throw new Error("Transaction not created");
    }
  });

  responseHandler.success(res, {
    message: "Raffle created successfully",
    error: null,
    raffle,
  });
};

const getRaffles = async (req: Request, res: Response) => {
  const { page, limit } = req.query;
  if (!page || !limit) {
    return responseHandler.error(res, "Page and limit are required");
  }
  const raffles = await prismaClient.raffle.findMany({
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    orderBy: {
      createdAt: "desc",
    },
    include: {
      prizeData: true,
    }
  });
  responseHandler.success(res, {
    message: "Raffles fetched successfully",
    error: null,
    raffles,
  });
};

const getRaffleDetails = async (req: Request, res: Response) => {
  const params = req.params;
  const raffleId = parseInt(params.raffleId);
  const raffle = await prismaClient.raffle.findUnique({
    where: {
      id: raffleId,
    },
    include: {
      prizeData: true,
      raffleEntries: {
        include: {
          transactions: true,
        },
      },
      winners: {
        select: {
          walletAddress: true,
          twitterId: true,
        }
      },
      favouritedBy: {
        select: {
          walletAddress: true,
          twitterId: true,
        }
      },
    }
  });
  if (!raffle) {
    return responseHandler.error(res, "Raffle not found");
  }
  responseHandler.success(res, {
    message: "Raffle fetched successfully",
    error: null,
    raffle,
  });
};

const getRafflesByUser = async (req: Request, res: Response) => {
  console.log("entered getRafflesByUser");
  const userAddress = req.user;
  console.log("userAddress", userAddress);
  const raffles = await prismaClient.raffle.findMany({
    where: {
      createdBy: userAddress,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  if (!raffles) {
    logger.error("Raffles not found for user", userAddress);
    return responseHandler.error(res, "Raffles not found");
  }
  responseHandler.success(res, {
    message: "Raffles fetched successfully",
    error: null,
    raffles,
  });
};

const cancelRaffle = async (req: Request, res: Response) => {
  const params = req.params;
  const raffleId = parseInt(params.raffleId);
  const userAddress = req.user;
  const body = req.body;

  if (!userAddress) {
    return responseHandler.error(res, "User not found");
  }
  const { success, data: parsedData } = cancelRaffleSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }

  const validatedTransaction = await verifyTransaction(parsedData.txSignature);
  if (!validatedTransaction) {
    return responseHandler.error(res, "Invalid transaction");
  }
  if (!raffleId) {
    return responseHandler.error(res, "Raffle ID is required");
  }
  try {
    const raffle = await prismaClient.raffle.findUnique({
      where: {
        id: raffleId,
        createdBy: userAddress,
      },
    });
    if (!raffle) {
      throw {
        code: "DB_ERROR",
        message: "Raffle not found",
      };
    }
    if (raffle.ticketSold != 0) {
      throw {
        code: "DB_ERROR",
        message: "Raffle has tickets sold, cannot be cancelled",
      };
    }
    await prismaClient.$transaction(async (tx) => {
      await tx.raffle.update({
        where: {
          id: raffleId,
        },
        data: {
          state: "Cancelled",
        },
      });
      //TODO: Include multiple txns like prize return , fee refund etc. in 1 txn
      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "RAFFLE_CANCEL",
          sender: raffle.createdBy,
          receiver: "system",
          amount: BigInt(0),
          mintAddress: "So11111111111111111111111111111111111111112",
        },
      });
    });

    responseHandler.success(res, {
      message: "Raffle cancelled successfully",
      error: null,
      raffleId: raffleId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const buyTicket = async (req: Request, res: Response) => {
  const params = req.params;
  const raffleId = parseInt(params.raffleId);
  const userAddress = req.user as string;
  const body = req.body;
  const { success, data: parsedData } = buyTicketSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }

  const validatedTransaction = await verifyTransaction(parsedData.txSignature);
  if (!validatedTransaction) {
    return responseHandler.error(res, "Invalid transaction");
  }
  try {
    await prismaClient.$transaction(async (tx) => {
      //Verify the raffle
      const raffle = await tx.raffle.findUnique({
        where: {
          id: raffleId,
        },
      });

      if (!raffle || raffle.state != "Active") {
        throw {
          code: "DB_ERROR",
          message: "Raffle not found or not active",
        };
      }
      if (raffle.ticketSold + parsedData.quantity > raffle.ticketSupply) {
        throw {
          code: "DB_ERROR",
          message: "Quantity exceeds ticket supply",
        };
      }
      if (parsedData.quantity > raffle.maxEntries) {
        throw {
          code: "DB_ERROR",
          message: "Quantity exceeds max entries",
        };
      }

      //Verify the entry
      const existingEntry = await tx.entry.findFirst({
        where: {
          raffleId: raffleId,
          userAddress: userAddress,
        },
      });
      let entryId = null;
      if (existingEntry) {
        if (existingEntry.quantity + parsedData.quantity > raffle.maxEntries) {

          throw {
            code: "DB_ERROR",
            message: "Quantity exceeds max entries",
          };
        } else if (
          existingEntry.quantity + parsedData.quantity >
          raffle.ticketSupply
        ) {
          throw {
            code: "DB_ERROR",
            message: "Quantity exceeds ticket sold",
          };
        } else {
          await tx.entry.update({
            where: {
              id: existingEntry.id,
            },
            data: {
              quantity: existingEntry.quantity + parsedData.quantity,
            },
          });
          entryId = existingEntry.id;
        }
      } else {
        const entry = await tx.entry.create({
          data: {
            raffleId: raffleId,
            userAddress,
            quantity: parsedData.quantity,
          },
        });

        if (!entry) {
          throw {
            code: "DB_ERROR",
            message: "Entry not created",
          };
        }
        entryId = entry.id;
      }

      //Update the raffle
      const updatedRaffle = await tx.raffle.update({
        where: {
          id: raffleId,
        },
        data: {
          ticketSold: raffle.ticketSold + parsedData.quantity,
        },
      });
      if (!updatedRaffle) {
        throw {
          code: "DB_ERROR",
          message: "Raffle not updated",
        };
      }
      const existingTransaction = await tx.transaction.findUnique({
        where: {
          transactionId: parsedData.txSignature,
        },
      });
      if (existingTransaction) {
        throw {
          code: "DB_ERROR",
          message: "Transaction already exists",
        };
      }
      //Create the transaction
      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "RAFFLE_ENTRY",
          sender: userAddress,
          receiver: raffle.raffle || "system",
          amount: parsedData.quantity * raffle.ticketPrice,
          mintAddress: raffle.ticketTokenAddress,
          metadata: {
            quantity: parsedData.quantity,
            raffleId: raffleId.toString(),
          },
          entryId: entryId,
        },
      });
    });
    responseHandler.success(res, {
      message: "Ticket bought successfully",
      error: null,
      raffleId: raffleId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const deleteRaffle = async (req: Request, res: Response) => {
  const params = req.params;
  const raffleId = parseInt(params.raffleId);
  const userAddress = req.user as string;
  try {
    if (!raffleId) {
      return responseHandler.error(res, "Raffle ID is required");
    }
    const raffle = await prismaClient.raffle.findUnique({
      where: {
        id: raffleId,
      },
    });
    if (!raffle) {
      return responseHandler.error(res, "Raffle not found");
    }
    if (raffle.createdBy !== userAddress) {
      return responseHandler.error(res, "You are not the creator of this raffle");
    }
    await prismaClient.raffle.delete({
      where: {
        id: raffleId,
      },
    });
    responseHandler.success(res, {
      message: "Raffle deleted successfully",
      error: null,
      raffleId: raffleId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};
const claimPrize = async (req: Request, res: Response) => {
  const params = req.params;
  const raffleId = parseInt(params.raffleId);
  const userAddress = req.user as string;
  const body = req.body;

  const { success, data: parsedData } = claimPrizeSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }

  const validatedTransaction = await verifyTransaction(parsedData.txSignature);
  if (!validatedTransaction) {
    return responseHandler.error(res, "Invalid transaction");
  }

  try {
    await prismaClient.$transaction(async (tx) => {
      // Verify the raffle exists and has ended successfully
      const raffle = await tx.raffle.findUnique({
        where: {
          id: raffleId,
        },
        include: {
          winners: true,
          prizeData: true,
        },
      });

      if (!raffle) {
        throw {
          code: "DB_ERROR",
          message: "Raffle not found",
        };
      }

      if (raffle.state !== "SuccessEnded") {
        throw {
          code: "DB_ERROR",
          message: "Raffle has not ended successfully",
        };
      }

      if (!raffle.winnerPicked) {
        throw {
          code: "DB_ERROR",
          message: "Winners have not been picked yet",
        };
      }

      // Check if the user is one of the winners
      const isWinner = raffle.winners.some(
        (winner) => winner.walletAddress === userAddress
      );
      if (!isWinner) {
        throw {
          code: "DB_ERROR",
          message: "User is not a winner of this raffle",
        };
      }

      // Check if all prizes have been claimed
      if (raffle.claimed >= raffle.numberOfWinners) {
        throw {
          code: "DB_ERROR",
          message: "All prizes have already been claimed",
        };
      }

      // Check if transaction already exists (prevents duplicate claims)
      const existingTransaction = await tx.transaction.findUnique({
        where: {
          transactionId: parsedData.txSignature,
        },
      });
      if (existingTransaction) {
        throw {
          code: "DB_ERROR",
          message: "Transaction already exists",
        };
      }

      // Check if user has already claimed their prize
      const existingClaim = await tx.transaction.findFirst({
        where: {
          type: "RAFFLE_CLAIM",
          sender: userAddress,
          receiver: raffle.raffle || raffleId.toString(),
        },
      });
      if (existingClaim) {
        throw {
          code: "DB_ERROR",
          message: "User has already claimed their prize",
        };
      }

      // Update the claimed count
      const updatedRaffle = await tx.raffle.update({
        where: {
          id: raffleId,
        },
        data: {
          claimed: raffle.claimed + 1,
        },
      });

      if (!updatedRaffle) {
        throw {
          code: "DB_ERROR",
          message: "Failed to update raffle claimed count",
        };
      }
      const amount = raffle.prizeData
        ? (raffle.prizeData.amount ? raffle.prizeData.amount : raffle.prizeData.floor!) / raffle.numberOfWinners
        : 0;

      // Create the transaction record
      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "RAFFLE_CLAIM",
          sender: userAddress,
          receiver: raffle.raffle || raffleId.toString(),
          amount: amount,
          mintAddress: raffle.prizeData?.mintAddress || "unknown",
          raffleId: raffleId,
        },
      });
    });

    responseHandler.success(res, {
      message: "Prize claimed successfully",
      error: null,
      raffleId: raffleId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const claimTicketAmount = async (req: Request, res: Response) => {
  const params = req.params;
  const raffleId = parseInt(params.raffleId);
  const userAddress = req.user as string;
  const body = req.body;
  const { success, data: parsedData } = claimTicketAmountSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }
  const validatedTransaction = await verifyTransaction(parsedData.txSignature);
  if (!validatedTransaction) {
    return responseHandler.error(res, "Invalid transaction");
  }
  try {
    await prismaClient.$transaction(async (tx) => {
      const raffle = await tx.raffle.findUnique({
        where: {
          id: raffleId,
        },
      });
      if (!raffle) {
        return responseHandler.error(res, "Raffle not found");
      }
      if (raffle.createdBy !== userAddress) {
        return responseHandler.error(res, "You are not the creator of this raffle");
      }
      if (raffle.ticketAmountClaimedByCreator) {
        return responseHandler.error(res, "Ticket amount has already been claimed by the creator");
      }
      const existingTransaction = await tx.transaction.findUnique({
        where: {
          transactionId: parsedData.txSignature,
        },
      });
      if (existingTransaction) {
        return responseHandler.error(res, "Transaction already exists");
      }
      const updatedRaffle = await tx.raffle.update({
        where: {
          id: raffleId,
        },
        data: {
          ticketAmountClaimedByCreator: true,
        },
      });
      if (!updatedRaffle) {
        return responseHandler.error(res, "Failed to update raffle");
      }
      const amount = raffle.ticketPrice * raffle.ticketSold;
      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "RAFFLE_CLAIM_TICKET_AMOUNT",
          sender: userAddress,
          receiver: raffle.raffle || raffleId.toString(),
          amount: amount,
          mintAddress: raffle.ticketTokenAddress,
          raffleId: raffleId,
        },
      });
    });
    responseHandler.success(res, {
      message: "Ticket amount claimed successfully",
      error: null,
      raffleId: raffleId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};
const getWinnersClaimedPrizes = async (req: Request, res: Response) => {
  const params = req.params;
  const raffleId = parseInt(params.raffleId);
  if (!raffleId) {
    return responseHandler.error(res, "Raffle ID is required");
  }
  const prizesClaimed = await prismaClient.transaction.findMany({
    where: {
      type: "RAFFLE_CLAIM",
      raffleId: raffleId,
    },
    select: {
      sender: true,
    }

  });
  console.log(prizesClaimed);
  if (!prizesClaimed) {
    return responseHandler.error(res, "Prizes not claimed");
  }
  responseHandler.success(res, {
    message: "Winners data fetched successfully",
    error: null,
    prizesClaimed: prizesClaimed,
  });
}

const rafflePda = (raffleId: number): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("raffle"),
      new BN(raffleId).toArrayLike(Buffer, "le", 4), // u32
    ],
    raffleProgram.programId
  )[0];
};

const raffleConfigPda = PublicKey.findProgramAddressSync(
  [Buffer.from("raffle")],
  raffleProgram.programId
)[0];

function prizeTypeToAnchor(prizeType: number) {
  switch (prizeType) {
    case 0:
      return { nft: {} };

    case 1:
      return { spl: {} };

    case 2:
      return { sol: {} };

    default:
      throw new Error(`Invalid prizeType: ${prizeType}`);
  }
}

// const raffleBuyerPda = (raffleId: number, buyerAddress: string): PublicKey => {
//   const buyerPubkey = new PublicKey(buyerAddress);

//   return PublicKey.findProgramAddressSync(
//     [
//       Buffer.from("raffle"),
//       new BN(raffleId).toArrayLike(Buffer, "le", 4),
//       buyerPubkey.toBuffer(),
//     ],
//     raffleProgram.programId
//   )[0];
// };

const cancelRaffleTx = async (req: Request, res: Response) => {
  const params = req.params;
  const raffleId = parseInt(params.raffleId);
  const userAddress = req.user as string;
  const userPublicKey = new PublicKey(userAddress);

  try {
    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: userPublicKey,
    });

    /* ---------------- PDAs ---------------- */
    const raffleAccountPda = rafflePda(raffleId);

    /* ---------------- Fetch raffle ---------------- */
    const raffleData = await raffleProgram.account.raffle.fetch(
      raffleAccountPda
    );

    /* ---------------- Prize type ---------------- */
    const isSolPrize = raffleData.prizeMint === null;
    const prizeMint = raffleData.prizeMint ?? FAKE_MINT;

    /* ---------------- Token program ---------------- */
    const prizeTokenProgram = await getTokenProgramFromMint(
      connection,
      prizeMint
    );

    /* ---------------- Accounts ---------------- */
    let prizeEscrow: PublicKey = FAKE_ATA;
    let creatorPrizeAta: PublicKey = FAKE_ATA;

    if (!isSolPrize) {
      // Prize escrow ATA (owner = raffle PDA)
      const escrowRes = await ensureAtaIx({
        connection,
        mint: prizeMint,
        owner: raffleAccountPda,
        payer: userPublicKey,
        tokenProgram: prizeTokenProgram,
        allowOwnerOffCurve: true,
      });

      prizeEscrow = escrowRes.ata;
      if (escrowRes.ix) transaction.add(escrowRes.ix);

      // Creator prize ATA (owner = creator wallet)
      const creatorAtaRes = await ensureAtaIx({
        connection,
        mint: prizeMint,
        owner: userPublicKey,
        payer: userPublicKey,
        tokenProgram: prizeTokenProgram,
      });

      creatorPrizeAta = creatorAtaRes.ata;
      if (creatorAtaRes.ix) transaction.add(creatorAtaRes.ix);
    }

    /* ---------------- Anchor Instruction ---------------- */
    const ix = await raffleProgram.methods
      .cancelRaffle(raffleId)
      .accounts({
        creator: userPublicKey,
        raffleAdmin: ADMIN_KEYPAIR.publicKey,

        prizeMint,
        prizeEscrow,
        creatorPrizeAta,

        prizeTokenProgram,
      })
      .instruction();

    transaction.add(ix);

    transaction.partialSign(ADMIN_KEYPAIR);

    const serializedTransaction = transaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    });

    const base64Transaction = serializedTransaction.toString('base64');

    res.status(200).json({
      base64Transaction,
      minContextSlot,
      blockhash,
      lastValidBlockHeight,
      message: "OK",
    });

  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const buyerClaimPrizeTx = async (req: Request, res: Response) => {
  const params = req.params;
  const raffleId = parseInt(params.raffleId);
  const userAddress = req.user as string;
  const userPublicKey = new PublicKey(userAddress);

  try {
    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: userPublicKey,
    });

    /* ---------------- PDAs ---------------- */
    const raffleAccountPda = rafflePda(raffleId);

    // const buyerAccountPda = raffleBuyerPda(
    //   raffleId,
    //   userAddress
    // );

    /* ---------------- Fetch raffle ---------------- */
    const raffleData = await raffleProgram.account.raffle.fetch(
      raffleAccountPda
    );

    /* ---------------- Prize mint ---------------- */
    const isSolPrize = raffleData.prizeMint === null;
    const prizeMint = raffleData.prizeMint ?? FAKE_MINT;

    /* ---------------- Token program ---------------- */
    const prizeTokenProgram = await getTokenProgramFromMint(
      connection,
      prizeMint
    );

    /* ---------------- Accounts ---------------- */
    let prizeEscrow: PublicKey = FAKE_ATA;
    let winnerPrizeAta: PublicKey = FAKE_ATA;

    if (!isSolPrize) {
      // Prize escrow ATA (owner = raffle PDA)
      const escrowRes = await ensureAtaIx({
        connection,
        mint: prizeMint,
        owner: raffleAccountPda,
        payer: userPublicKey,
        tokenProgram: prizeTokenProgram,
        allowOwnerOffCurve: true,
      });

      prizeEscrow = escrowRes.ata;
      if (escrowRes.ix) transaction.add(escrowRes.ix);

      // Winner prize ATA (owner = winner)
      const winnerAtaRes = await ensureAtaIx({
        connection,
        mint: prizeMint,
        owner: userPublicKey,
        payer: userPublicKey,
        tokenProgram: prizeTokenProgram,
      });

      winnerPrizeAta = winnerAtaRes.ata;
      if (winnerAtaRes.ix) transaction.add(winnerAtaRes.ix);
    }

    /* ---------------- Anchor Instruction ---------------- */
    const ix = await raffleProgram.methods
      .buyerClaimPrize(raffleId)
      .accounts({
        raffleAdmin: ADMIN_KEYPAIR.publicKey,
        winner: userPublicKey,

        prizeMint,
        prizeEscrow,
        winnerPrizeAta,

        prizeTokenProgram,
      })
      .instruction();

    transaction.add(ix);


    transaction.partialSign(ADMIN_KEYPAIR);

    const serializedTransaction = transaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    });

    const base64Transaction = serializedTransaction.toString('base64');

    res.status(200).json({
      base64Transaction,
      minContextSlot,
      blockhash,
      lastValidBlockHeight,
      message: "OK",
    });

  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const buyTicketTx = async (req: Request, res: Response) => {
  const userAddress = req.user as string;
  const userPublicKey = new PublicKey(userAddress);
  const body = req.body;
  const { success, data: parsedData } = buyTicketTxSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }
  try {
    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: userPublicKey,
    });

    const raffleAccountPda = rafflePda(parsedData.raffleId);

    // const buyerAccountPda = raffleBuyerPda(
    //   parsedData.raffleId,
    //   userAddress
    // );

    // ---------------- Fetch raffle ----------------
    const raffleData = await raffleProgram.account.raffle.fetch(
      raffleAccountPda
    );

    // ---------------- Ticket mint ----------------
    const isSolTicket = raffleData.ticketMint === null;
    const ticketMint = raffleData.ticketMint ?? FAKE_MINT;

    // ---------------- Token program ----------------
    const ticketTokenProgram = await getTokenProgramFromMint(
      connection,
      ticketMint
    );

    // ---------------- Accounts ----------------
    let buyerTicketAta: PublicKey = FAKE_ATA;
    let ticketEscrow: PublicKey = FAKE_ATA;

    if (!isSolTicket) {
      // Buyer ticket ATA
      const buyerAtaRes = await ensureAtaIx({
        connection,
        mint: ticketMint,
        owner: userPublicKey,
        payer: userPublicKey,
        tokenProgram: ticketTokenProgram,
      });

      buyerTicketAta = buyerAtaRes.ata;
      if (buyerAtaRes.ix) transaction.add(buyerAtaRes.ix);

      // Ticket escrow ATA (owner = raffle PDA)
      const escrowRes = await ensureAtaIx({
        connection,
        mint: ticketMint,
        owner: raffleAccountPda,
        payer: userPublicKey,
        tokenProgram: ticketTokenProgram,
        allowOwnerOffCurve: true,
      });

      ticketEscrow = escrowRes.ata;
      if (escrowRes.ix) transaction.add(escrowRes.ix);
    }

    // ---------------- Anchor Instruction ----------------
    const ix = await raffleProgram.methods
      .buyTicket(
        parsedData.raffleId,
        parsedData.ticketsToBuy
      )
      .accounts({
        buyer: userPublicKey,
        raffleAdmin: ADMIN_KEYPAIR.publicKey,

        ticketMint,
        buyerTicketAta,
        ticketEscrow,

        ticketTokenProgram,
      })
      .instruction();

    transaction.add(ix);

    transaction.partialSign(ADMIN_KEYPAIR);

    const serializedTransaction = transaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    });

    const base64Transaction = serializedTransaction.toString('base64');

    res.status(200).json({
      base64Transaction,
      minContextSlot,
      blockhash,
      lastValidBlockHeight,
      message: "OK",
    });

  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const createRaffleTx = async (req: Request, res: Response) => {
  const userAddress = req.user as string;
  const userPublicKey = new PublicKey(userAddress);
  const body = req.body;
  const { success, data: parsedData } = createRaffleSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }
  try {
    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: userPublicKey,
    });

    const config = await raffleProgram.account.raffleConfig.fetch(
      raffleConfigPda
    );

    // ---------------- Derive raffle PDA ----------------
    const rafflePda = PublicKey.findProgramAddressSync(
      [
        Buffer.from("raffle"),
        new BN(config.raffleCount).toArrayLike(Buffer, "le", 4),
      ],
      raffleProgram.programId
    )[0];

    // ---------------- Resolve mints ----------------
    const ticketMint = parsedData.isTicketSol ? FAKE_MINT : new PublicKey(parsedData.ticketMint);
    const prizeMint = parsedData.prizeType == 2 ? FAKE_MINT : new PublicKey(parsedData.prizeMint);

    // ---------------- Resolve token programs ----------------
    const ticketTokenProgram = await getTokenProgramFromMint(
      connection,
      ticketMint
    );

    const prizeTokenProgram = await getTokenProgramFromMint(
      connection,
      prizeMint
    );

    // ---------------- Ticket Escrow ATA ----------------
    let ticketEscrow = FAKE_ATA;

    if (!parsedData.isTicketSol) {
      const res = await ensureAtaIx({
        connection,
        mint: ticketMint,
        owner: rafflePda,
        payer: userPublicKey,
        tokenProgram: ticketTokenProgram,
        allowOwnerOffCurve: true,
      });

      ticketEscrow = res.ata;
      if (res.ix) transaction.add(res.ix);
    }

    // ---------------- Prize Escrow + Creator ATA ----------------
    let prizeEscrow = FAKE_ATA;
    let creatorPrizeAta = FAKE_ATA;

    if (parsedData.prizeType !== 2) {
      if (prizeMint.equals(ticketMint)) {
        prizeEscrow = ticketEscrow;
      }
      else {
        const escrowRes = await ensureAtaIx({
          connection,
          mint: prizeMint,
          owner: rafflePda,
          payer: userPublicKey,
          tokenProgram: prizeTokenProgram,
          allowOwnerOffCurve: true,
        });

        prizeEscrow = escrowRes.ata;
        if (escrowRes.ix) transaction.add(escrowRes.ix);
      }

      const creatorRes = await ensureAtaIx({
        connection,
        mint: prizeMint,
        owner: userPublicKey,
        payer: userPublicKey,
        tokenProgram: prizeTokenProgram,
      });

      creatorPrizeAta = creatorRes.ata;
      if (creatorRes.ix) transaction.add(creatorRes.ix);
    }

    // ---------------- Anchor Instruction ----------------
    const ix = await raffleProgram.methods
      .createRaffle(
        new BN(parsedData.startTime.toString()),
        new BN(parsedData.endTime.toString()),
        parsedData.totalTickets,
        new BN(parsedData.ticketPrice),
        parsedData.isTicketSol,
        parsedData.maxPerWalletPct,
        prizeTypeToAnchor(parsedData.prizeType),
        new BN(parsedData.prizeAmount),
        parsedData.numWinners,
        Buffer.from(parsedData.winShares),
        parsedData.isUniqueWinners,
        parsedData.startRaffle,
        parsedData.maximumTickets,
      )
      .accounts({
        creator: userPublicKey,
        raffleAdmin: ADMIN_KEYPAIR.publicKey,

        ticketMint,
        prizeMint,

        ticketEscrow,
        prizeEscrow,
        creatorPrizeAta,

        ticketTokenProgram,
        prizeTokenProgram,
      })
      .instruction();

    transaction.add(ix);

    transaction.partialSign(ADMIN_KEYPAIR);

    const serializedTransaction = transaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    });

    const base64Transaction = serializedTransaction.toString('base64');

    res.status(200).json({
      base64Transaction,
      minContextSlot,
      blockhash,
      lastValidBlockHeight,
      message: "OK",
    });

  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const claimPrizeBackTx = async (req: Request, res: Response) => {
  const params = req.params;
  const raffleId = parseInt(params.raffleId);
  const userAddress = req.user as string;
  const userPublicKey = new PublicKey(userAddress);

  try {
    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: userPublicKey,
    });

    /* ---------------- PDAs ---------------- */
    const raffleAccountPda = rafflePda(raffleId);

    /* ---------------- Fetch raffle ---------------- */
    const raffleData = await raffleProgram.account.raffle.fetch(
      raffleAccountPda
    );

    /* ---------------- Prize side ---------------- */
    const isSolPrize = raffleData.prizeMint === null;
    const prizeMint = raffleData.prizeMint ?? FAKE_MINT;

    /* ---------------- Ticket side ---------------- */
    const isSolTicket = raffleData.ticketMint === null;
    const ticketMint = raffleData.ticketMint ?? FAKE_MINT;

    /* ---------------- Token programs ---------------- */
    const prizeTokenProgram = await getTokenProgramFromMint(
      connection,
      prizeMint
    );
    const ticketTokenProgram = await getTokenProgramFromMint(
      connection,
      ticketMint
    );

    /* ---------------- Accounts ---------------- */
    let prizeEscrow: PublicKey = FAKE_ATA;
    let creatorPrizeAta: PublicKey = FAKE_ATA;
    let ticketEscrow: PublicKey = FAKE_ATA;
    let creatorTicketAta: PublicKey = FAKE_ATA;

    // ---- Prize SPL / NFT ----
    if (!isSolPrize) {
      // Prize escrow ATA (owner = raffle PDA)
      const prizeEscrowRes = await ensureAtaIx({
        connection,
        mint: prizeMint,
        owner: raffleAccountPda,
        payer: userPublicKey,
        tokenProgram: prizeTokenProgram,
        allowOwnerOffCurve: true,
      });

      prizeEscrow = prizeEscrowRes.ata;
      if (prizeEscrowRes.ix) transaction.add(prizeEscrowRes.ix);

      // Creator prize ATA
      const creatorPrizeRes = await ensureAtaIx({
        connection,
        mint: prizeMint,
        owner: userPublicKey,
        payer: userPublicKey,
        tokenProgram: prizeTokenProgram,
      });

      creatorPrizeAta = creatorPrizeRes.ata;
      if (creatorPrizeRes.ix) transaction.add(creatorPrizeRes.ix);
    }

    // ---- Ticket SPL ----
    if (!isSolTicket) {
      // Ticket escrow ATA (owner = raffle PDA)
      const ticketEscrowRes = await ensureAtaIx({
        connection,
        mint: ticketMint,
        owner: raffleAccountPda,
        payer: userPublicKey,
        tokenProgram: ticketTokenProgram,
        allowOwnerOffCurve: true,
      });

      ticketEscrow = ticketEscrowRes.ata;
      if (ticketEscrowRes.ix) transaction.add(ticketEscrowRes.ix);

      // Creator ticket ATA
      const creatorTicketRes = await ensureAtaIx({
        connection,
        mint: ticketMint,
        owner: userPublicKey,
        payer: userPublicKey,
        tokenProgram: ticketTokenProgram,
      });

      creatorTicketAta = creatorTicketRes.ata;
      if (creatorTicketRes.ix) transaction.add(creatorTicketRes.ix);
    }

    /* ---------------- Anchor Instruction ---------------- */
    const ix = await raffleProgram.methods
      .claimAmountBack(raffleId)
      .accounts({
        creator: userPublicKey,
        raffleAdmin: ADMIN_KEYPAIR.publicKey,

        prizeMint,
        ticketMint,

        prizeEscrow,
        ticketEscrow,

        creatorPrizeAta,
        creatorTicketAta,

        prizeTokenProgram,
        ticketTokenProgram,
      })
      .instruction();


    transaction.add(ix);

    transaction.partialSign(ADMIN_KEYPAIR);

    const serializedTransaction = transaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    });

    const base64Transaction = serializedTransaction.toString('base64');

    res.status(200).json({
      base64Transaction,
      minContextSlot,
      blockhash,
      lastValidBlockHeight,
      message: "OK",
    });

  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

export default {
  getCollectionFloorPrice,
  createRaffle,
  getRaffles,
  getRaffleDetails,
  getRafflesByUser,
  cancelRaffle,
  buyTicket,
  claimPrize,
  claimTicketAmount,
  deleteRaffle,
  getWinnersClaimedPrizes,
  cancelRaffleTx,
  buyerClaimPrizeTx,
  buyTicketTx,
  createRaffleTx,
  claimPrizeBackTx,
};
