//TODO: Implement raffle controller

import { responseHandler } from "../utils/resHandler";
import { Request, Response } from "express";
import {
  confirmRaffleCreationSchema,
  raffleSchema,
} from "../schemas/raffle/createRaffle.schema";
import { verifyTransaction } from "../utils/verifyTransaction";
import prismaClient from "../database/client";
import logger from "../utils/logger";
import { cancelRaffleSchema } from "../schemas/raffle/cancelRaffle.schema";
import { buyTicketSchema } from "../schemas/raffle/buyTicket.schema";
import { claimPrizeSchema } from "../schemas/raffle/claimPrize.schema";

const createRaffle = async (req: Request, res: Response) => {
  const body = req.body;
  const { success, data: parsedData } = raffleSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }
  if (parsedData.createdAt && parsedData.createdAt < new Date()) {
    return responseHandler.error(res, "Invalid createdAt");
  }
  if (
    parsedData.endsAt &&
    parsedData.createdAt &&
    parsedData.endsAt < parsedData.createdAt
  ) {
    return responseHandler.error(res, "Invalid endsAt");
  }

  const { prizeData, ...raffleData } = parsedData;

  const raffle = await prismaClient.raffle.create({
    data: {
      ...raffleData,
      prizeData: {
        create: {
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

  responseHandler.success(res, {
    message: "Raffle creation initiated successfully",
    error: null,
    raffle,
  });
};

const confirmRaffleCreation = async (req: Request, res: Response) => {
  const { raffleId } = req.params;
  const body = req.body;
  const { success, data: parsedData } =
    confirmRaffleCreationSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }
  try {
    const isTransactionConfirmed = await verifyTransaction(
      parsedData.txSignature
    );
    if (!isTransactionConfirmed) {
      return responseHandler.error(res, "Transaction not confirmed");
    }

    await prismaClient.$transaction(async (tx) => {
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
      const raffle = await tx.raffle.findUnique({
        where: {
          id: raffleId,
        },
      });
      if (!raffle) {
        throw {
          code: "DB_ERROR",
          message: "Raffle not found",
        };
      }
      if (raffle.createdAt && raffle.createdAt <= new Date()) {
        const updatedRaffle = await tx.raffle.update({
          where: {
            id: raffleId,
          },
          data: {
            state: "Active",
          },
        });
        if (!updatedRaffle) {
          throw {
            code: "DB_ERROR",
            message: "Raffle not updated",
          };
        }
      } else if (raffle.createdAt && raffle.createdAt > new Date()) {
        const updatedRaffle = await tx.raffle.update({
          where: {
            id: raffleId,
          },
          data: {
            state: "Initialized",
          },
        });
        if (!updatedRaffle) {
          throw {
            code: "DB_ERROR",
            message: "Raffle not updated",
          };
        }
      }

      //TODO: Fetch the raffle, entries, prize pda address and update in the raffle model

      const transaction = await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "RAFFLE_CREATION",
          sender: raffle.createdBy,
          receiver: raffle.raffle || "system",
          amount: BigInt(0),
          mintAddress: "So11111111111111111111111111111111111111112",
        },
      });
      if (!transaction) {
        throw {
          code: "DB_ERROR",
          message: "Transaction not created",
        };
      }
    });
    responseHandler.success(res, {
      message: "Raffle creation confirmed successfully",
      error: null,
      raffleId: raffleId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
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
  });
  responseHandler.success(res, {
    message: "Raffles fetched successfully",
    error: null,
    raffles,
  });
};

const getRaffleDetails = async (req: Request, res: Response) => {
  const { raffleId } = req.params;
  const raffle = await prismaClient.raffle.findUnique({
    where: {
      id: raffleId,
    },
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
  const { raffleId } = req.params;
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
      const updatedRaffle = await tx.raffle.update({
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
          sender: "system",
          receiver: raffle.createdBy,
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
  const { raffleId } = req.params;
  const userAddress = req.user as string;
  console.log("userAddress", userAddress);
  const body = req.body;
  const { success, data: parsedData } = buyTicketSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }

  const validatedTransaction = await verifyTransaction(parsedData.txSignature);
  console.log("validatedTransaction", validatedTransaction);
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
          message: "Raffle is sold out",
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
      if (existingEntry) {
        if (existingEntry.quantity + parsedData.quantity > raffle.maxEntries) {
          throw {
            code: "DB_ERROR",
            message: "Quantity exceeds max entries",
          };
        } else if (
          existingEntry.quantity + parsedData.quantity >
          raffle.ticketSold
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

const claimPrize = async (req: Request, res: Response) => {
  const { raffleId } = req.params;
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
          receiver: raffle.raffle || raffleId,
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
          receiver: raffle.raffle || raffleId,
          amount: amount,
          mintAddress: raffle.prize || "unknown",
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

//TODO: create a cron job to end the raffle
//TODO: Create a function to draw the winners by a user
//TODO: Create a function to end the raffle by a user

export default {
  createRaffle,
  confirmRaffleCreation,
  getRaffles,
  getRaffleDetails,
  getRafflesByUser,
  cancelRaffle,
  buyTicket,
  claimPrize,
};
