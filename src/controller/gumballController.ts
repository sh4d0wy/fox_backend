import { responseHandler } from "../utils/resHandler";
import { Request, Response } from "express";
import {
  gumballSchema,
  confirmGumballCreationSchema,
  activateGumballSchema,
  updateBuyBackSchema,
  createGumballSchema,
} from "../schemas/gumball/createGumball.schema";
import { addPrizeSchema, addMultiplePrizesSchema, addMultiplePrizesSchemaTx } from "../schemas/gumball/addPrize.schema";
import { spinSchema } from "../schemas/gumball/spin.schema";
import { claimGumballPrizeSchema } from "../schemas/gumball/claimPrize.schema";
import { claimMultiplePrizesBackSchemaTx, creatorClaimPrizeSchema } from "../schemas/gumball/creatorClaimBack.schema";
import { cancelAndClaimGumballSchema, cancelGumballSchema } from "../schemas/gumball/cancelGumball.schema";
import { verifyTransaction } from "../utils/verifyTransaction";
import prismaClient from "../database/client";
import logger from "../utils/logger";
import { ADMIN_KEYPAIR, connection, gumballProgram, provider } from "../services/solanaconnector";
import { ComputeBudgetProgram, PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY, Transaction, TransactionInstruction } from "@solana/web3.js";
import { ensureAtaIx, FAKE_ATA, FAKE_MINT, getAtaAddress, getMasterEditionPda, getMetadataPda, getRuleSet, getTokenProgramFromMint, getTokenRecordPda, METAPLEX_METADATA_PROGRAM_ID, MPL_TOKEN_AUTH_RULES_PROGRAM_ID } from "../utils/helpers";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as sb from "@switchboard-xyz/on-demand";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "bn.js";

const createGumball = async (req: Request, res: Response) => {
  const body = req.body;
  const { success, data: parsedData, error } = gumballSchema.safeParse(body);
  if (!success) {
    console.log(error);
    return responseHandler.error(res, "Invalid payload");
  }
  if (parsedData.endTime <= parsedData.startTime) {
    return responseHandler.error(res, "End time must be after start time");
  }

  const isTransactionConfirmed = await verifyTransaction(parsedData.txSignature);
  if (!isTransactionConfirmed) {
    return responseHandler.error(res, "Transaction not confirmed");
  }

  let gumball;

  await prismaClient.$transaction(async (tx) => {
    const existingTransaction = await tx.transaction.findUnique({
      where: {
        transactionId: parsedData.txSignature,
      },
    });
    if (existingTransaction) {
      throw new Error("Transaction already exists");
    }

    const status =
      parsedData.startTime && parsedData.startTime <= new Date()
        ? "ACTIVE"
        : "INITIALIZED";

    // Calculate max proceeds based on ticket price and total tickets
    const ticketPrice = BigInt(parsedData.ticketPrice);
    const maxProceeds = ticketPrice * BigInt(parsedData.totalTickets);

    gumball = await tx.gumball.create({
      data: {
        id: parsedData.id,
        creatorAddress: parsedData.creatorAddress,
        name: parsedData.name,
        manualStart: parsedData.manualStart,
        startTime: parsedData.startTime,
        endTime: parsedData.endTime,
        totalTickets: parsedData.totalTickets,
        ticketMint: parsedData.ticketMint,
        ticketPrice: BigInt(parsedData.ticketPrice),
        isTicketSol: parsedData.isTicketSol,
        minPrizes: parsedData.minPrizes,
        maxPrizes: parsedData.maxPrizes,
        buyBackEnabled: parsedData.buyBackEnabled,
        buyBackPercentage: parsedData.buyBackPercentage,
        maxProceeds: maxProceeds,
        rentAmount: parsedData.rentAmount ? BigInt(parsedData.rentAmount) : null,
        status: status,
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        transactionId: parsedData.txSignature,
        type: "GUMBALL_CREATION",
        sender: parsedData.creatorAddress,
        receiver: "system",
        amount: BigInt(0),
        mintAddress: parsedData.ticketMint || "So11111111111111111111111111111111111111112",
        gumballId: parsedData.id,
      },
    });
    if (!transaction) {
      throw new Error("Transaction not created");
    }
  });

  responseHandler.success(res, {
    message: "Gumball creation initiated successfully",
    error: null,
    gumball
  });
};

const confirmGumballCreation = async (req: Request, res: Response) => {
  const params = req.params;
  const gumballId = parseInt(params.gumballId);
  const body = req.body;
  const { success, data: parsedData } = confirmGumballCreationSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }
  try {
    const isTransactionConfirmed = await verifyTransaction(parsedData.txSignature);
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
      const gumball = await tx.gumball.findUnique({
        where: {
          id: gumballId,
        },
      });
      if (!gumball) {
        throw {
          code: "DB_ERROR",
          message: "Gumball not found",
        };
      }
      let state = "INITIALIZED";
      if (gumball.startTime <= new Date()) {
        state = "ACTIVE";
      }
      await tx.gumball.update({
        where: {
          id: gumballId,
        },
        data: {
          status: state as "INITIALIZED" | "ACTIVE",
        },
      });

      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "GUMBALL_CREATION",
          sender: gumball.creatorAddress,
          receiver: "system",
          amount: BigInt(0),
          mintAddress: gumball.ticketMint || "So11111111111111111111111111111111111111112",
          gumballId: gumballId,
        },
      });
    });
    responseHandler.success(res, {
      message: "Gumball creation confirmed successfully",
      error: null,
      gumballId: gumballId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const activateGumball = async (req: Request, res: Response) => {
  const params = req.params;
  const gumballId = parseInt(params.gumballId);
  const userAddress = req.user as string;
  const body = req.body;

  const { success, data: parsedData } = activateGumballSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }

  try {
    const isTransactionConfirmed = await verifyTransaction(parsedData.txSignature);
    if (!isTransactionConfirmed) {
      return responseHandler.error(res, "Transaction not confirmed");
    }

    await prismaClient.$transaction(async (tx) => {
      const gumball = await tx.gumball.findUnique({
        where: {
          id: gumballId,
          creatorAddress: userAddress,
        },
      });
      if (!gumball) {
        throw {
          code: "DB_ERROR",
          message: "Gumball not found or not owned by user",
        };
      }
      if (gumball.status === "ACTIVE") {
        throw {
          code: "DB_ERROR",
          message: "Gumbal already activated",
        };
      }
      if (gumball.prizesAdded < gumball.minPrizes) {
        throw {
          code: "DB_ERROR",
          message: `Gumball must have at least ${gumball.minPrizes} prizes to activate`,
        };
      }

      await tx.gumball.update({
        where: {
          id: gumballId,
        },
        data: {
          status: "ACTIVE",
          activatedAt: new Date(),
        },
      });

      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "GUMBALL_ACTIVATE",
          sender: userAddress,
          receiver: "system",
          amount: BigInt(0),
          mintAddress: gumball.ticketMint || "So11111111111111111111111111111111111111112",
          gumballId: gumballId,
        },
      });
    });

    responseHandler.success(res, {
      message: "Gumball activated successfully",
      error: null,
      gumballId: gumballId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const updateBuyBackSettings = async (req: Request, res: Response) => {
  const params = req.params;
  const gumballId = parseInt(params.gumballId);
  const userAddress = req.user as string;
  const body = req.body;

  const { success, data: parsedData } = updateBuyBackSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }

  try {
    const isTransactionConfirmed = await verifyTransaction(parsedData.txSignature);
    if (!isTransactionConfirmed) {
      return responseHandler.error(res, "Transaction not confirmed");
    }

    await prismaClient.$transaction(async (tx) => {
      const gumball = await tx.gumball.findUnique({
        where: {
          id: gumballId,
          creatorAddress: userAddress,
        },
      });
      if (!gumball) {
        throw {
          code: "DB_ERROR",
          message: "Gumball not found or not owned by user",
        };
      }
      if (gumball.status === "ACTIVE" && !gumball.buyBackEnabled && parsedData.buyBackEnabled) {
        throw {
          code: "DB_ERROR",
          message: "Cannot enable buy backs after gumball is live",
        };
      }

      await tx.gumball.update({
        where: {
          id: gumballId,
        },
        data: {
          buyBackEnabled: parsedData.buyBackEnabled,
          buyBackPercentage: parsedData.buyBackPercentage,
          buyBackEscrow: parsedData.buyBackEscrow,
        },
      });

      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "GUMBALL_UPDATE",
          sender: userAddress,
          receiver: "system",
          amount: BigInt(0),
          mintAddress: gumball.ticketMint || "So11111111111111111111111111111111111111112",
          gumballId: gumballId,
          metadata: {
            action: "buyBackSettings",
            buyBackEnabled: parsedData.buyBackEnabled,
            buyBackPercentage: parsedData.buyBackPercentage,
          },
        },
      });
    });

    responseHandler.success(res, {
      message: "Buy back settings updated successfully",
      error: null,
      gumballId: gumballId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const addPrize = async (req: Request, res: Response) => {
  const params = req.params;
  const gumballId = parseInt(params.gumballId);
  const userAddress = req.user as string;
  const body = req.body;

  const { success, data: parsedData, error } = addPrizeSchema.safeParse(body);
  if (!success) {
    console.log(error);
    return responseHandler.error(res, "Invalid payload");
  }

  try {
    const isTransactionConfirmed = await verifyTransaction(parsedData.txSignature);
    if (!isTransactionConfirmed) {
      return responseHandler.error(res, "Transaction not confirmed");
    }

    let assignedPrizeIndex: number;

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

      const gumball = await tx.gumball.findUnique({
        where: {
          id: gumballId,
          creatorAddress: userAddress,
        },
        include: {
          prizes: {
            select: {
              quantity: true,
            },
          },
        },
      });
      if (!gumball) {
        throw {
          code: "DB_ERROR",
          message: "Gumball not found or not owned by user",
        };
      }
      if (gumball.status !== "INITIALIZED" && gumball.status !== "NONE") {
        throw {
          code: "DB_ERROR",
          message: "Cannot add prizes to active or completed gumball",
        };
      }

      // Calculate total prize count including quantities
      const currentTotalPrizeCount = gumball.prizes.reduce((acc, p) => acc + p.quantity, 0);
      if (currentTotalPrizeCount + parsedData.quantity > gumball.maxPrizes) {
        throw {
          code: "DB_ERROR",
          message: `Adding this prize would exceed maximum prize count (${gumball.maxPrizes}). Current: ${currentTotalPrizeCount}, Adding: ${parsedData.quantity}`,
        };
      }

      // Use prizeIndex from request
      assignedPrizeIndex = parsedData.prizeIndex;

      const prizeAmount = BigInt(parsedData.totalAmount);

      await tx.gumballPrize.create({
        data: {
          gumballId: gumballId,
          prizeIndex: parsedData.prizeIndex,
          isNft: parsedData.isNft,
          mint: parsedData.mint,
          name: parsedData.name,
          symbol: parsedData.symbol,
          image: parsedData.image,
          decimals: parsedData.decimals,
          totalAmount: prizeAmount,
          prizeAmount: BigInt(parsedData.prizeAmount),
          quantity: parsedData.quantity,
          floorPrice: parsedData.floorPrice ? BigInt(parsedData.floorPrice) : null,
        },
      });

      const newTotalPrizeValue = gumball.totalPrizeValue + prizeAmount;
      const maxRoi = gumball.maxProceeds > BigInt(0)
        ? Number(newTotalPrizeValue) / Number(gumball.maxProceeds)
        : null;

      await tx.gumball.update({
        where: {
          id: gumballId,
        },
        data: {
          prizesAdded: gumball.prizesAdded + 1,
          totalTickets: { increment: parsedData.quantity },
          totalPrizeValue: newTotalPrizeValue,
          maxRoi: maxRoi,
        },
      });

      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "GUMBALL_PRIZE_ADD",
          sender: userAddress,
          receiver: "system",
          amount: prizeAmount,
          mintAddress: parsedData.mint,
          isNft: parsedData.isNft,
          gumballId: gumballId,
          metadata: {
            prizeIndex: assignedPrizeIndex,
            quantity: parsedData.quantity,
            name: parsedData.name,
            symbol: parsedData.symbol,
          },
        },
      });
    });

    responseHandler.success(res, {
      message: "Prize added successfully",
      error: null,
      gumballId: gumballId,
      prizeIndex: assignedPrizeIndex!,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const addMultiplePrizes = async (req: Request, res: Response) => {
  const params = req.params;
  const gumballId = parseInt(params.gumballId);
  const userAddress = req.user as string;
  const body = req.body;

  const { success, data: parsedData, error } = addMultiplePrizesSchema.safeParse(body);
  if (!success) {
    console.log(error);
    return responseHandler.error(res, "Invalid payload");
  }

  try {
    const isTransactionConfirmed = await verifyTransaction(parsedData.txSignature);
    if (!isTransactionConfirmed) {
      return responseHandler.error(res, "Transaction not confirmed");
    }

    let assignedPrizeIndices: number[] = [];

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

      const gumball = await tx.gumball.findUnique({
        where: {
          id: gumballId,
          creatorAddress: userAddress,
        },
        include: {
          prizes: {
            select: {
              quantity: true,
            },
          },
        },
      });
      if (!gumball) {
        throw {
          code: "DB_ERROR",
          message: "Gumball not found or not owned by user",
        };
      }
      if (gumball.status !== "INITIALIZED" && gumball.status !== "NONE" && gumball.status !== "ACTIVE") {
        throw {
          code: "DB_ERROR",
          message: "Cannot add prizes to completed or cancelled gumball",
        };
      }

      // Calculate total prize count including quantities
      const currentTotalPrizeCount = gumball.prizes.reduce((acc, p) => acc + p.quantity, 0);
      const newTotalQuantity = parsedData.prizes.reduce((acc, p) => acc + p.quantity, 0);
      if (currentTotalPrizeCount + newTotalQuantity > gumball.maxPrizes) {
        throw {
          code: "DB_ERROR",
          message: `Adding these prizes would exceed maximum prize count (${gumball.maxPrizes}). Current: ${currentTotalPrizeCount}, Adding: ${newTotalQuantity}`,
        };
      }

      let totalAddedValue = BigInt(0);

      for (const prize of parsedData.prizes) {
        const prizeAmount = BigInt(prize.totalAmount);
        totalAddedValue += prizeAmount;

        await tx.gumballPrize.create({
          data: {
            gumballId: gumballId,
            prizeIndex: prize.prizeIndex,
            isNft: prize.isNft,
            mint: prize.mint,
            name: prize.name,
            symbol: prize.symbol,
            image: prize.image,
            decimals: prize.decimals,
            totalAmount: prizeAmount,
            prizeAmount: BigInt(prize.prizeAmount),
            quantity: prize.quantity,
            floorPrice: prize.floorPrice ? BigInt(prize.floorPrice) : null,
          },
        });

        assignedPrizeIndices.push(prize.prizeIndex);
      }

      // Calculate max ROI
      const newTotalPrizeValue = gumball.totalPrizeValue + totalAddedValue;
      const maxRoi = gumball.maxProceeds > BigInt(0)
        ? Number(newTotalPrizeValue) / Number(gumball.maxProceeds)
        : null;

      await tx.gumball.update({
        where: {
          id: gumballId,
        },
        data: {
          prizesAdded: gumball.prizesAdded + parsedData.prizes.length,
          totalTickets: { increment: newTotalQuantity },
          totalPrizeValue: newTotalPrizeValue,
          maxRoi: maxRoi,
        },
      });

      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "GUMBALL_PRIZE_ADD",
          sender: userAddress,
          receiver: "system",
          amount: totalAddedValue,
          mintAddress: "multiple",
          gumballId: gumballId,
          metadata: {
            prizesCount: parsedData.prizes.length,
            prizes: parsedData.prizes.map((p, index) => ({
              prizeIndex: assignedPrizeIndices[index],
              mint: p.mint,
              quantity: p.quantity,
            })),
          },
        },
      });
    });

    responseHandler.success(res, {
      message: "Prizes added successfully",
      error: null,
      gumballId: gumballId,
      prizesAdded: parsedData.prizes.length,
      prizeIndices: assignedPrizeIndices,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const prepareSpin = async (req: Request, res: Response) => {
  const params = req.params;
  const gumballId = parseInt(params.gumballId);

  try {
    const gumball = await prismaClient.gumball.findUnique({
      where: {
        id: gumballId,
      },
    });
    if (!gumball) {
      return responseHandler.error(res, "Gumball not found");
    }
    if (gumball.status !== "ACTIVE") {
      return responseHandler.error(res, "Gumball is not active");
    }
    if (!gumball.manualStart && new Date() < gumball.startTime) {
      return responseHandler.error(res, "Gumball has not started yet");
    }
    if (new Date() > gumball.endTime) {
      return responseHandler.error(res, "Gumball has ended");
    }
    if (gumball.ticketsSold >= gumball.totalTickets) {
      return responseHandler.error(res, "All tickets have been sold");
    }

    // Get all prizes for this gumball
    const allPrizes = await prismaClient.gumballPrize.findMany({
      where: {
        gumballId: gumballId,
      },
    });

    // Filter prizes that still have remaining quantity
    const prizesWithRemaining = allPrizes.filter(
      (p) => p.quantityClaimed < p.quantity
    );

    if (prizesWithRemaining.length === 0) {
      return responseHandler.error(res, "No prizes available");
    }

    // Randomly select a prize from available prizes
    const randomIndex = Math.floor(Math.random() * prizesWithRemaining.length);
    const selectedPrize = prizesWithRemaining[randomIndex];

    responseHandler.success(res, {
      message: "Spin prepared successfully",
      error: null,
      gumballId: gumballId,
      prizeIndex: selectedPrize.prizeIndex,
      prizeMint: selectedPrize.mint,
      ticketPrice: gumball.ticketPrice.toString(),
      ticketMint: gumball.ticketMint,
      isTicketSol: gumball.isTicketSol,
      prizeImage: selectedPrize.image,
      prizeAmount: selectedPrize.prizeAmount.toString(),
      isNft: selectedPrize.isNft
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const spin = async (req: Request, res: Response) => {
  const params = req.params;
  const gumballId = parseInt(params.gumballId);
  const userAddress = req.user as string;
  const body = req.body;

  const { success, data: parsedData } = spinSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }

  try {
    const isTransactionConfirmed = await verifyTransaction(parsedData.txSignature);
    if (!isTransactionConfirmed) {
      return responseHandler.error(res, "Transaction not confirmed");
    }

    let spinResult: any;

    const MAX_RETRIES = 3;
    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
      try {
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

          const gumball = await tx.gumball.findUnique({
            where: {
              id: gumballId,
            },
          });
          if (!gumball) {
            throw {
              code: "DB_ERROR",
              message: "Gumball not found",
            };
          }
          if (gumball.status !== "ACTIVE") {
            throw {
              code: "DB_ERROR",
              message: "Gumball is not active",
            };
          }
          if (!gumball.manualStart && new Date() < gumball.startTime) {
            throw {
              code: "DB_ERROR",
              message: "Gumball has not started yet",
            };
          }
          if (new Date() > gumball.endTime) {
            throw {
              code: "DB_ERROR",
              message: "Gumball has ended",
            };
          }
          if (gumball.ticketsSold >= gumball.totalTickets) {
            throw {
              code: "DB_ERROR",
              message: "All tickets have been sold",
            };
          }

          const existingSpin = await tx.gumballSpin.findFirst({
            where: {
              gumballId: gumballId,
              spinnerAddress: userAddress,
            },
          });
          const isNewBuyer = !existingSpin;

          const spinRecord = await tx.gumballSpin.create({
            data: {
              gumballId: gumballId,
              spinnerAddress: userAddress,
              prizeAmount: BigInt(0),
              isPendingClaim: true,
            },
          });

          await tx.gumball.update({
            where: {
              id: gumballId,
            },
            data: {
              ticketsSold: { increment: 1 },
              totalProceeds: { increment: gumball.ticketPrice },
              ...(isNewBuyer && { uniqueBuyers: { increment: 1 } }),
            },
          });

          // Create transaction
          await tx.transaction.create({
            data: {
              transactionId: parsedData.txSignature,
              type: "GUMBALL_SPIN",
              sender: userAddress,
              receiver: "system",
              amount: gumball.ticketPrice,
              mintAddress: gumball.ticketMint || "So11111111111111111111111111111111111111112",
              gumballId: gumballId,
              gumballSpinId: spinRecord.id,
            },
          });

          spinResult = {
            spinId: spinRecord.id,
          };
        });

        break;
      } catch (txError: any) {
        if (txError?.code === "P2034" && retryCount < MAX_RETRIES - 1) {
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 50 * Math.pow(2, retryCount)));
          continue;
        }
        throw txError;
      }
    }

    responseHandler.success(res, {
      message: "Spin successful",
      error: null,
      spin: spinResult,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const claimPrize = async (req: Request, res: Response) => {
  const params = req.params;
  const gumballId = parseInt(params.gumballId);
  const userAddress = req.user as string;
  const body = req.body;

  const { success, data: parsedData } = claimGumballPrizeSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }

  try {
    const isTransactionConfirmed = await verifyTransaction(parsedData.txSignature);
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

      const spin = await tx.gumballSpin.findUnique({
        where: {
          id: parsedData.spinId,
        },
        include: {
          gumball: true,
        },
      });

      if (!spin) {
        throw {
          code: "DB_ERROR",
          message: "Spin not found",
        };
      }
      if (spin.gumballId !== gumballId) {
        throw {
          code: "DB_ERROR",
          message: "Spin does not belong to this gumball",
        };
      }
      if (spin.spinnerAddress !== userAddress) {
        throw {
          code: "DB_ERROR",
          message: "User is not the spinner of this spin",
        };
      }
      if (!spin.isPendingClaim) {
        throw {
          code: "DB_ERROR",
          message: "Prize already claimed",
        };
      }

      // Find the prize by prizeIndex
      const prize = await tx.gumballPrize.findUnique({
        where: {
          gumballId_prizeIndex: {
            gumballId: gumballId,
            prizeIndex: parsedData.prizeIndex,
          },
        },
      });

      if (!prize) {
        throw {
          code: "DB_ERROR",
          message: `Prize with index ${parsedData.prizeIndex} not found`,
        };
      }

      if (prize.quantityClaimed >= prize.quantity) {
        throw {
          code: "DB_ERROR",
          message: "This prize is no longer available",
        };
      }

      await tx.gumballSpin.update({
        where: {
          id: parsedData.spinId,
        },
        data: {
          prizeId: prize.id,
          winnerAddress: userAddress,
          prizeAmount: prize.prizeAmount,
          isPendingClaim: false,
          claimedAt: new Date(),
        },
      });

      await tx.gumballPrize.update({
        where: {
          id: prize.id,
        },
        data: {
          quantityClaimed: { increment: 1 },
        },
      });

      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "GUMBALL_CLAIM_PRIZE",
          sender: userAddress,
          receiver: userAddress,
          amount: prize.prizeAmount,
          mintAddress: prize.mint,
          isNft: prize.isNft,
          gumballId: gumballId,
          metadata: {
            spinId: parsedData.spinId,
            prizeId: prize.id,
            prizeIndex: parsedData.prizeIndex,
            prizeName: prize.name,
          },
        },
      });
    });

    responseHandler.success(res, {
      message: "Prize claimed successfully",
      error: null,
      gumballId: gumballId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const cancelGumball = async (req: Request, res: Response) => {
  const params = req.params;
  const gumballId = parseInt(params.gumballId);
  const userAddress = req.user as string;
  const body = req.body;

  const { success, data: parsedData } = cancelGumballSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }

  try {
    const isTransactionConfirmed = await verifyTransaction(parsedData.txSignature);
    if (!isTransactionConfirmed) {
      return responseHandler.error(res, "Transaction not confirmed");
    }

    await prismaClient.$transaction(async (tx) => {
      const gumball = await tx.gumball.findUnique({
        where: {
          id: gumballId,
          creatorAddress: userAddress,
        },
      });
      if (!gumball) {
        throw {
          code: "DB_ERROR",
          message: "Gumball not found or not owned by user",
        };
      }
      if (gumball.ticketsSold > 0) {
        throw {
          code: "DB_ERROR",
          message: "Cannot cancel gumball with sold tickets",
        };
      }

      await tx.gumball.update({
        where: {
          id: gumballId,
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "GUMBALL_CANCEL",
          sender: userAddress,
          receiver: "system",
          amount: BigInt(0),
          mintAddress: gumball.ticketMint || "So11111111111111111111111111111111111111112",
          gumballId: gumballId,
        },
      });
    });

    responseHandler.success(res, {
      message: "Gumball cancelled successfully",
      error: null,
      gumballId: gumballId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const getGumballs = async (req: Request, res: Response) => {
  const { page, limit } = req.query;
  if (!page || !limit) {
    return responseHandler.error(res, "Page and limit are required");
  }
  const gumballs = await prismaClient.gumball.findMany({
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    orderBy: {
      createdAt: "desc",
    },
    include: {
      prizes: true,
      _count: {
        select: {
          spins: true,
        },
      },
      creator: {
        select: {
          walletAddress: true,
          twitterId: true,
          profileImage: true,
        },
      },
    },
  });

  // Convert BigInt to string for JSON serialization
  const serializedGumballs = gumballs.map((g) => ({
    ...g,
    ticketPrice: g.ticketPrice.toString(),
    totalPrizeValue: g.totalPrizeValue.toString(),
    totalProceeds: g.totalProceeds.toString(),
    maxProceeds: g.maxProceeds.toString(),
    buyBackProfit: g.buyBackProfit.toString(),
    rentAmount: g.rentAmount?.toString(),
    prizes: g.prizes.map((p) => ({
      ...p,
      totalAmount: p.totalAmount.toString(),
      prizeAmount: p.prizeAmount.toString(),
      floorPrice: p.floorPrice?.toString(),
    })),
  }));

  responseHandler.success(res, {
    message: "Gumballs fetched successfully",
    error: null,
    gumballs: serializedGumballs,
  });
};

const getGumballDetails = async (req: Request, res: Response) => {
  const params = req.params;
  const gumballId = parseInt(params.gumballId);
  const gumball = await prismaClient.gumball.findUnique({
    where: {
      id: gumballId,
    },
    include: {
      prizes: true,
      spins: {
        orderBy: {
          spunAt: "desc",
        },
        include: {
          spinner: {
            select: {
              walletAddress: true,
              twitterId: true,
            },
          },
          prize: true,
        },
      },
      transactions: {
        where: {
          type: "GUMBALL_CLAIM_PRIZE",
        },
        select: {
          transactionId: true,
          type: true,
          sender: true,
          receiver: true,
          amount: true,
          mintAddress: true,
          isNft: true,
          metadata: true,
        },
      },
      creator: {
        select: {
          walletAddress: true,
          twitterId: true,
          profileImage: true,
        },
      },
    },
  });
  if (!gumball) {
    return responseHandler.error(res, "Gumball not found");
  }

  const claimTransactionsBySpinId = new Map<number, typeof gumball.transactions[0]>();
  for (const tx of gumball.transactions) {
    const metadata = tx.metadata as { spinId?: number } | null;
    if (metadata?.spinId) {
      claimTransactionsBySpinId.set(metadata.spinId, tx);
    }
  }

  const serializedGumball = {
    ...gumball,
    ticketPrice: gumball.ticketPrice.toString(),
    totalPrizeValue: gumball.totalPrizeValue.toString(),
    totalProceeds: gumball.totalProceeds.toString(),
    maxProceeds: gumball.maxProceeds.toString(),
    buyBackProfit: gumball.buyBackProfit.toString(),
    rentAmount: gumball.rentAmount?.toString(),
    prizes: gumball.prizes.map((p) => ({
      ...p,
      totalAmount: p.totalAmount.toString(),
      prizeAmount: p.prizeAmount.toString(),
      floorPrice: p.floorPrice?.toString(),
    })),
    spins: gumball.spins.map((s) => {
      const claimTx = claimTransactionsBySpinId.get(s.id);
      return {
        ...s,
        prizeAmount: s.prizeAmount.toString(),
        prize: s.prize ? {
          ...s.prize,
          totalAmount: s.prize.totalAmount.toString(),
          prizeAmount: s.prize.prizeAmount.toString(),
          floorPrice: s.prize.floorPrice?.toString(),
        } : null,
        transaction: claimTx ? {
          ...claimTx,
          amount: claimTx.amount.toString(),
        } : null,
      };
    }),
    transactions: undefined,
  };

  responseHandler.success(res, {
    message: "Gumball fetched successfully",
    error: null,
    gumball: serializedGumball,
  });
};

const getGumballsByUser = async (req: Request, res: Response) => {
  const userAddress = req.user as string;
  const gumballs = await prismaClient.gumball.findMany({
    where: {
      creatorAddress: userAddress,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      prizes: true,
      _count: {
        select: {
          spins: true,
        },
      },
    },
  });

  // Convert BigInt to string for JSON serialization
  const serializedGumballs = gumballs.map((g) => ({
    ...g,
    ticketPrice: g.ticketPrice.toString(),
    totalPrizeValue: g.totalPrizeValue.toString(),
    totalProceeds: g.totalProceeds.toString(),
    maxProceeds: g.maxProceeds.toString(),
    buyBackProfit: g.buyBackProfit.toString(),
    rentAmount: g.rentAmount?.toString(),
    prizes: g.prizes.map((p) => ({
      ...p,
      totalAmount: p.totalAmount.toString(),
      prizeAmount: p.prizeAmount.toString(),
      floorPrice: p.floorPrice?.toString(),
    })),
  }));

  responseHandler.success(res, {
    message: "Gumballs fetched successfully",
    error: null,
    gumballs: serializedGumballs,
  });
};

const getSpinsByUser = async (req: Request, res: Response) => {
  const userAddress = req.user as string;
  const spins = await prismaClient.gumballSpin.findMany({
    where: {
      spinnerAddress: userAddress,
    },
    orderBy: {
      spunAt: "desc",
    },
    include: {
      gumball: true,
      prize: true,
    },
  });

  // Convert BigInt to string for JSON serialization
  const serializedSpins = spins.map((s) => ({
    ...s,
    prizeAmount: s.prizeAmount.toString(),
    gumball: {
      ...s.gumball,
      ticketPrice: s.gumball.ticketPrice.toString(),
      totalPrizeValue: s.gumball.totalPrizeValue.toString(),
      totalProceeds: s.gumball.totalProceeds.toString(),
      maxProceeds: s.gumball.maxProceeds.toString(),
      buyBackProfit: s.gumball.buyBackProfit.toString(),
      rentAmount: s.gumball.rentAmount?.toString(),
    },
    prize: s.prize ? {
      ...s.prize,
      totalAmount: s.prize.totalAmount.toString(),
      prizeAmount: s.prize.prizeAmount.toString(),
      floorPrice: s.prize.floorPrice?.toString(),
    } : null,
  }));

  responseHandler.success(res, {
    message: "Spins fetched successfully",
    error: null,
    spins: serializedSpins,
  });
};

const deleteGumball = async (req: Request, res: Response) => {
  const params = req.params;
  const gumballId = parseInt(params.gumballId);
  const userAddress = req.user as string;

  try {
    if (!gumballId) {
      return responseHandler.error(res, "Gumball ID is required");
    }
    const gumball = await prismaClient.gumball.findUnique({
      where: {
        id: gumballId,
      },
    });
    if (!gumball) {
      return responseHandler.error(res, "Gumball not found");
    }
    if (gumball.creatorAddress !== userAddress) {
      return responseHandler.error(res, "You are not the creator of this gumball");
    }
    if (gumball.ticketsSold > 0) {
      return responseHandler.error(res, "Cannot delete gumball with sold tickets");
    }

    await prismaClient.gumball.delete({
      where: {
        id: gumballId,
      },
    });

    responseHandler.success(res, {
      message: "Gumball deleted successfully",
      error: null,
      gumballId: gumballId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const getGumballStats = async (req: Request, res: Response) => {
  const params = req.params;
  const gumballId = parseInt(params.gumballId);

  const gumball = await prismaClient.gumball.findUnique({
    where: {
      id: gumballId,
    },
    include: {
      prizes: true,
      _count: {
        select: {
          spins: true,
        },
      },
    },
  });

  if (!gumball) {
    return responseHandler.error(res, "Gumball not found");
  }

  // Calculate stats
  const prizesLoaded = gumball.prizes.reduce((acc, p) => acc + p.quantity, 0);
  const prizesClaimed = gumball.prizes.reduce((acc, p) => acc + p.quantityClaimed, 0);

  responseHandler.success(res, {
    message: "Gumball stats fetched successfully",
    error: null,
    stats: {
      prizesLoaded: `${prizesClaimed} / ${prizesLoaded}`,
      totalPrizeValue: gumball.totalPrizeValue.toString(),
      maxProceeds: gumball.maxProceeds.toString(),
      maxRoi: gumball.maxRoi,
      ticketsSold: gumball.ticketsSold,
      totalTickets: gumball.totalTickets,
      uniqueBuyers: gumball.uniqueBuyers,
      totalProceeds: gumball.totalProceeds.toString(),
      buyBackCount: gumball.buyBackCount,
      buyBackProfit: gumball.buyBackProfit.toString(),
      status: gumball.status,
      startTime: gumball.startTime,
      endTime: gumball.endTime,
    },
  });
};

const creatorClaimPrize = async (req: Request, res: Response) => {
  const params = req.params;
  const gumballId = parseInt(params.gumballId);
  const userAddress = req.user as string;
  const body = req.body;
  const { success, data: parsedData } = creatorClaimPrizeSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }

  try {
    const isTransactionConfirmed = await verifyTransaction(parsedData.txSignature);
    if (!isTransactionConfirmed) {
      return responseHandler.error(res, "Transaction not confirmed");
    }

    await prismaClient.$transaction(async (tx) => {
      const gumball = await tx.gumball.findUnique({
        where: {
          id: gumballId,
        },
      });
      if (!gumball) {
        return responseHandler.error(res, "Gumball not found");
      }
      if (gumball.creatorAddress !== userAddress) {
        return responseHandler.error(res, "You are not the creator of this gumball");
      }
      const prizes = await tx.gumballPrize.findMany({
        where: {
          gumballId: gumballId,
        },
      });
      if (prizes.length === 0) {
        return responseHandler.error(res, "No prizes found for this gumball");
      }
      for (const prize of prizes) {
        if (prize.creatorClaimed) {
          continue;
        }
        await tx.gumballPrize.update({
          where: {
            id: prize.id,
          },
          data: {
            creatorClaimed: true,
            creatorClaimedAt: new Date(),
          },
        });
      }
      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "GUMBALL_CLAIM_PRIZE",
          sender: userAddress,
          receiver: userAddress,
          amount: BigInt(0),
          mintAddress: "So11111111111111111111111111111111111111112",
          gumballId: gumballId,
        },
      });
    });
    responseHandler.success(res, {
      message: "Prize claimed successfully",
      error: null,
      gumballId: gumballId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const gumballPda = async (gumballId: number): Promise<PublicKey> => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("gumball"),
      new BN(gumballId).toArrayLike(Buffer, "le", 4),
    ],
    gumballProgram.programId
  )[0];
};

const gumballConfigPda = async () => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("gumball")],
    gumballProgram.programId
  )[0];
};

const prizePda = async (gumballId: number, prizeIndex: number): Promise<PublicKey> => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("gumball"),
      new BN(gumballId).toArrayLike(Buffer, "le", 4),
      new BN(prizeIndex).toArrayLike(Buffer, "le", 2),
    ],
    gumballProgram.programId
  )[0];
};

const calculateWinner = (revealedValue: number[], totalItemsAvailable: number, prizeMap: number[]) => {
  // 1. Validate randomness is resolved
  if (!revealedValue || revealedValue.every((v: any) => v === 0)) {
    throw new Error("Randomness not yet resolved");
  }

  // 2. Extract first 8 bytes and convert to u64 (Little Endian)
  // Equivalent to Rust: let mut data = [0u8; 8]; data.copy_from_slice(&revealed_random_value[..8]);
  const randomBuffer = Buffer.from(revealedValue.slice(0, 8));
  const randomU64 = new anchor.BN(randomBuffer, 'le');

  // 3. Perform Modulo
  // Equivalent to Rust: let target_pointer = (random_u64 % total_left) as usize;
  const totalLeftBN = new anchor.BN(totalItemsAvailable);
  const targetPointer = randomU64.mod(totalLeftBN).toNumber();

  // 4. Map the pointer to the Prize Index
  // Equivalent to Rust: let winning_prize_index = gumball.prize_map[target_pointer];
  const winningPrizeIndex = prizeMap[targetPointer];

  return {
    targetPointer,
    winningPrizeIndex
  };
};


export async function loadSbProgram(
  provider: anchor.Provider
): Promise<anchor.Program> {
  const sbProgramId = await sb.getProgramId(provider.connection);
  const sbIdl = await anchor.Program.fetchIdl(sbProgramId, provider);
  const sbProgram = new anchor.Program(sbIdl!, provider);
  return sbProgram;
}

export async function setupQueue(program: anchor.Program): Promise<PublicKey> {
  const queueAccount = await sb.getDefaultQueue(
    program.provider.connection.rpcEndpoint
  );
  console.log("Queue account", queueAccount.pubkey.toString());
  try {
    await queueAccount.loadData();
  } catch (err) {
    console.error("Queue not found, ensure you are using devnet in your env");
    process.exit(1);
  }
  return queueAccount.pubkey;
}


const spinGumballTx = async (req: Request, res: Response) => {
  const params = req.params;
  const userAddress = req.user as string;
  const gumballId = parseInt(params.gumballId);

  try {
    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: new PublicKey(userAddress),
    });

    const userPublicKey = new PublicKey(userAddress);
    const sbProgram = await loadSbProgram(gumballProgram.provider);
    const queue = await setupQueue(sbProgram);

    const [randomness, rngKp, createAndCommitIx] = await sb.Randomness.createAndCommitIxs(sbProgram as any, queue);

    // Only create the randomness account if it's new
    for (const ix of createAndCommitIx) {
      transaction.add(ix);
    }

    /* ---------------- PDAs ---------------- */
    const gumballAddress = await gumballPda(gumballId);
    // const prizeAddress = prizePda(args.gumballId, args.prizeIndex);

    const gumballState =
      await gumballProgram.account.gumballMachine.fetch(
        gumballAddress
      );

    const ticketMint: PublicKey | null = gumballState.ticketMint;

    const ticketTokenProgram = ticketMint
      ? await getTokenProgramFromMint(connection, ticketMint)
      : TOKEN_PROGRAM_ID;

    /* ---------------- Ticket ATAs (CLIENT MUST ENSURE) ---------------- */
    let ticketEscrow = FAKE_ATA;
    let spinnerTicketAta = FAKE_ATA;

    if (ticketMint) {
      /* -------- Ticket escrow ATA (owner = gumball PDA) -------- */
      const ticketEscrowRes = await ensureAtaIx({
        connection,
        mint: ticketMint,
        owner: gumballAddress,
        payer: userPublicKey,
        tokenProgram: ticketTokenProgram,
        allowOwnerOffCurve: true, // PDA owner
      });

      ticketEscrow = ticketEscrowRes.ata;
      if (ticketEscrowRes.ix) transaction.add(ticketEscrowRes.ix);

      /* -------- Spinner ticket ATA -------- */
      const spinnerTicketRes = await ensureAtaIx({
        connection,
        mint: ticketMint,
        owner: userPublicKey,
        payer: userPublicKey,
        tokenProgram: ticketTokenProgram,
      });

      spinnerTicketAta = spinnerTicketRes.ata;
      if (spinnerTicketRes.ix) transaction.add(spinnerTicketRes.ix);
    }

    /* ---------------- Anchor Instruction ---------------- */
    const ix = await gumballProgram.methods
      .spinGumball(gumballId)
      .accounts({
        spinner: userPublicKey,
        gumballAdmin: ADMIN_KEYPAIR.publicKey,

        ticketMint: ticketMint ?? FAKE_MINT,

        ticketEscrow,
        spinnerTicketAta,

        ticketTokenProgram,
        randomnessAccountData: randomness.pubkey,
      })
      .instruction();

    transaction.add(ix);

    transaction.partialSign(ADMIN_KEYPAIR);
    transaction.partialSign(rngKp);

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


const claimGumballTx = async (req: Request, res: Response) => {
  const params = req.params;
  const userAddress = req.user as string;
  const gumballId = parseInt(params.gumballId);

  try {
    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: new PublicKey(userAddress),
    });

    const userPublicKey = new PublicKey(userAddress);
    const sbProgram = await loadSbProgram(gumballProgram.provider);

    const [spinStateAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("gumball"),
        new anchor.BN(gumballId).toBuffer("le", 4), // u32 = 4 bytes, Little Endian
        userPublicKey.toBuffer()
      ],
      gumballProgram.programId
    );

    const spinStateData = await gumballProgram.account.spinState.fetch(
      spinStateAddress
    );

    const randomnessAddress = spinStateData.randomnessAccount;

    const randomness = new sb.Randomness(sbProgram as any, randomnessAddress);

    let revealed = await randomness.loadData();

    if (!revealed.value || revealed.value.every((v: any) => v === 0)) {
      console.log("Revealing randomness...");
      const { blockhash: blockhash1, lastValidBlockHeight: lastValidBlockHeight1 } =
        await connection.getLatestBlockhash("confirmed");

      const revealTx = new Transaction({
        blockhash: blockhash1,
        lastValidBlockHeight: lastValidBlockHeight1,
        feePayer: ADMIN_KEYPAIR.publicKey,
      });

      const revealIx = await randomness.revealIx();
      revealTx.add(revealIx);

      const revealTxSig = await connection.sendTransaction(
        revealTx,
        [ADMIN_KEYPAIR],
        { skipPreflight: false }
      );

      const confirmation = await connection.confirmTransaction(
        {
          signature: revealTxSig,
          blockhash: blockhash1,
          lastValidBlockHeight: lastValidBlockHeight1,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(
          `announceWinners failed: ${JSON.stringify(confirmation.value.err)}`
        );
      }
      revealed = await randomness.loadData();
    }

    console.log("Randomness account after reveal:", revealed.value);

    /* ---------------- PDAs ---------------- */
    const gumballAddress = await gumballPda(gumballId);
    // const prizeAddress = prizePda(args.gumballId, args.prizeIndex);

    const gumballState =
      await gumballProgram.account.gumballMachine.fetch(
        gumballAddress
      );

    const { winningPrizeIndex: prizeIndex } = calculateWinner(revealed.value, gumballState.totalItemsAvailable, gumballState.prizeMap);

    console.log("Calculated winning prize index:", prizeIndex);

    const [prizeAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("gumball"),
        new anchor.BN(gumballId).toBuffer("le", 4), // u32 = 4 bytes, Little Endian
        new anchor.BN(prizeIndex).toBuffer("le", 2), // u16 = 2 bytes, Little Endian
      ],
      gumballProgram.programId
    );

    console.log("Derived prize address:", prizeAddress.toString());

    const prizeAccountData = await gumballProgram.account.prize.fetch(prizeAddress);

    const prizeMint: PublicKey = prizeAccountData.mint;

    /* ---------------- Token programs ---------------- */
    const prizeTokenProgram = await getTokenProgramFromMint(
      connection,
      prizeMint
    );

    const creatorPrizeAta = await getAtaAddress(
      connection,
      prizeMint,
      new PublicKey(userAddress)
    );

    const prizeEscrowAta = await getAtaAddress(
      connection,
      prizeMint,
      gumballAddress,
      true // PDA owner
    );

    // ---------------- Metaplex Accounts (New) ----------------
    const metadataAccount = getMetadataPda(prizeMint);
    const editionAccount = getMasterEditionPda(prizeMint);
    const ownerTokenRecord = getTokenRecordPda(prizeMint, prizeEscrowAta);
    const destTokenRecord = getTokenRecordPda(prizeMint, creatorPrizeAta);
    const ruleSet = await getRuleSet(prizeMint);
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000
    });

    /* ---------------- Anchor Instruction ---------------- */
    const ix = await gumballProgram.methods
      .claimPrize(gumballId, prizeIndex)
      .accounts({
        spinner: userPublicKey,
        gumballAdmin: ADMIN_KEYPAIR.publicKey,

        prizeMint: prizeMint,

        prizeTokenProgram: prizeTokenProgram,
        randomnessAccountData: randomness.pubkey,
        // Metaplex & pNFT Accounts
        metadataAccount,
        editionAccount,
        ownerTokenRecord,
        destTokenRecord,
        authorizationRules: ruleSet, // Pass null if Option<T> is not used
        authRulesProgram: MPL_TOKEN_AUTH_RULES_PROGRAM_ID, // Or a specific rules program if applicable
        tokenMetadataProgram: METAPLEX_METADATA_PROGRAM_ID,
        sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .instruction();

    transaction.add(modifyComputeUnits);
    transaction.add(ix);

    transaction.partialSign(ADMIN_KEYPAIR);

    const serializedTransaction = transaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    });

    const base64Transaction = serializedTransaction.toString('base64');

    res.status(200).json({
      prizeIndex,
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

const cancelGumballTx = async (req: Request, res: Response) => {
  const params = req.params;
  const gumballId = parseInt(params.gumballId);
  const userAddress = req.user as string;

  try {
    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: new PublicKey(userAddress),
    });

    const ix = await gumballProgram.methods
      .cancelGumball(gumballId)
      .accounts({
        creator: new PublicKey(userAddress),
        gumballAdmin: ADMIN_KEYPAIR.publicKey,
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

const createGumballTx = async (req: Request, res: Response) => {
  const userAddress = req.user as string;
  const body = req.body;
  const { success, data: parsedData } = createGumballSchema.safeParse(body);
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
      feePayer: new PublicKey(userAddress),
    });

    // // You MUST fetch config before creating
    // const config = await gumballProgram.account.gumballConfig.fetch(
    //   await gumballConfigPda()
    // );

    // const gumballId = config.gumballCount;
    // const gumballPdaAddress = await gumballPda(gumballId);

    const ix = await gumballProgram.methods
      .createGumball(
        new BN(parsedData.startTime),
        new BN(parsedData.endTime),
        parsedData.totalTickets,
        new BN(parsedData.ticketPrice),
        parsedData.isTicketSol,
        parsedData.startGumball
      )
      .accounts({
        // gumball: gumballPdaAddress,
        creator: new PublicKey(userAddress),
        gumballAdmin: ADMIN_KEYPAIR.publicKey,
        ticketMint: parsedData.ticketMint ?? FAKE_MINT,
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

const cancelAndClaimGumballTx = async (req: Request, res: Response) => {
  const userAddress = req.user as string;
  const body = req.body;
  const { success, data: parsedData } = cancelAndClaimGumballSchema.safeParse(body);
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
      feePayer: new PublicKey(userAddress),
    });

    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000
    });
    transaction.add(modifyComputeUnits);

    const ix = await gumballProgram.methods
      .cancelGumball(parsedData.gumballId)
      .accounts({
        creator: new PublicKey(userAddress),
        gumballAdmin: ADMIN_KEYPAIR.publicKey,
      })
      .instruction();

    transaction.add(ix);

    const gumballAddress = await gumballPda(parsedData.gumballId);

    // 2. Claim back only the selected prize indexes
    const claimIxs: TransactionInstruction[] = [];

    for (const prizeIndex of parsedData.prizeIndexes) {
      const prizeAddress = await prizePda(parsedData.gumballId, prizeIndex);

      let prizeState;
      try {
        prizeState = await gumballProgram.account.prize.fetch(prizeAddress);
      } catch (err) {
        console.log(err);
        continue; // Skip if prize doesn't exist
      }

      const prizeMint: PublicKey = prizeState.mint;

      const prizeTokenProgram = await getTokenProgramFromMint(connection, prizeMint);

      // Ensure escrow ATA (owned by gumball)
      // const prizeEscrowRes = await ensureAtaIx({
      //     connection,
      //     mint: prizeMint,
      //     owner: gumballAddress,
      //     payer: wallet.publicKey,
      //     tokenProgram: prizeTokenProgram,
      //     allowOwnerOffCurve: true,
      // });

      // Ensure creator ATA (user's wallet)
      const creatorPrizeRes = await ensureAtaIx({
        connection,
        mint: prizeMint,
        owner: new PublicKey(userAddress),
        payer: new PublicKey(userAddress),
        tokenProgram: prizeTokenProgram,
      });

      if (creatorPrizeRes.ix) transaction.add(creatorPrizeRes.ix);

      const creatorPrizeAta = await getAtaAddress(
        connection,
        prizeMint,
        new PublicKey(userAddress)
      );

      const prizeEscrowAta = await getAtaAddress(
        connection,
        prizeMint,
        gumballAddress,
        true // PDA owner
      );

      // ---------------- Metaplex Accounts (New) ----------------
      const metadataAccount = getMetadataPda(prizeMint);
      const editionAccount = getMasterEditionPda(prizeMint);
      const ownerTokenRecord = getTokenRecordPda(prizeMint, prizeEscrowAta);
      const destTokenRecord = getTokenRecordPda(prizeMint, creatorPrizeAta);
      const ruleSet = await getRuleSet(prizeMint);

      const claimIx = await gumballProgram.methods
        .claimPrizeBack(parsedData.gumballId, prizeIndex)
        .accounts({
          // gumballConfig: gumballConfigPda,
          // gumball: gumballAddress,
          // prize: prizeAddress,

          creator: new PublicKey(userAddress),
          gumballAdmin: ADMIN_KEYPAIR.publicKey,

          prizeMint,

          // prizeEscrow: prizeEscrowRes.ata,
          // creatorPrizeAta: creatorPrizeRes.ata,

          prizeTokenProgram,
          // associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          // systemProgram: anchor.web3.SystemProgram.programId,

          // Metaplex & pNFT Accounts
          metadataAccount,
          editionAccount,
          ownerTokenRecord,
          destTokenRecord,
          authorizationRules: ruleSet, // Pass null if Option<T> is not used
          authRulesProgram: MPL_TOKEN_AUTH_RULES_PROGRAM_ID, // Or a specific rules program if applicable
          tokenMetadataProgram: METAPLEX_METADATA_PROGRAM_ID,
          sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .instruction();

      claimIxs.push(claimIx);
    }
    transaction.add(...claimIxs);

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

const addMultiplePrizesTx = async (req: Request, res: Response) => {
  const userAddress = req.user as string;
  const body = req.body;
  const { success, data: parsedData } = addMultiplePrizesSchemaTx.safeParse(body);
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
      feePayer: new PublicKey(userAddress),
    });

    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000
    });
    transaction.add(modifyComputeUnits);

    const gumballAddress = await gumballPda(parsedData.gumballId);

    for (const prize of parsedData.prizes) {
      const prizeTokenProgram = await getTokenProgramFromMint(
        connection,
        new PublicKey(prize.prizeMint)
      );

      // /* -------- Ensure Prize Escrow ATA (PDA-owned), ATA's are cretated in onchain if does not exist -------- */
      // const prizeEscrowRes = await ensureAtaIx({
      //     connection,
      //     mint: prize.prizeMint,
      //     owner: gumballAddress,
      //     payer: wallet.publicKey,
      //     tokenProgram: prizeTokenProgram,
      //     allowOwnerOffCurve: true,
      // });

      // /* -------- Ensure Creator Prize ATA -------- */
      // const creatorPrizeRes = await ensureAtaIx({
      //     connection,
      //     mint: prize.prizeMint,
      //     owner: wallet.publicKey,
      //     payer: wallet.publicKey,
      //     tokenProgram: prizeTokenProgram,
      // });

      const prizeMintPubkey = new PublicKey(prize.prizeMint);

      const creatorPrizeAta = await getAtaAddress(
        connection,
        prizeMintPubkey,
        new PublicKey(userAddress)
      );

      const prizeEscrowAta = await getAtaAddress(
        connection,
        prizeMintPubkey,
        gumballAddress,
        true // PDA owner
      );

      // ---------------- Metaplex Accounts (New) ----------------
      const metadataAccount = getMetadataPda(prizeMintPubkey);
      const editionAccount = getMasterEditionPda(prizeMintPubkey);
      const ownerTokenRecord = getTokenRecordPda(prizeMintPubkey, creatorPrizeAta);
      const destTokenRecord = getTokenRecordPda(prizeMintPubkey, prizeEscrowAta);
      const ruleSet = await getRuleSet(prizeMintPubkey);

      /* -------- Add Prize Instruction -------- */
      const ix = await gumballProgram.methods
        .addPrize(

          parsedData.gumballId,
          prize.prizeIndex,
          new BN(prize.prizeAmount),
          prize.quantity
        )
        .accounts({
          creator: new PublicKey(userAddress),
          gumballAdmin: ADMIN_KEYPAIR.publicKey,

          prizeMint: new PublicKey(prize.prizeMint),
          prizeTokenProgram,

          // Metaplex & pNFT Accounts
          metadataAccount,
          editionAccount,
          ownerTokenRecord,
          destTokenRecord,
          authorizationRules: ruleSet, // Pass null if Option<T> is not used
          authRulesProgram: MPL_TOKEN_AUTH_RULES_PROGRAM_ID, // Or a specific rules program if applicable
          tokenMetadataProgram: METAPLEX_METADATA_PROGRAM_ID,
          sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .instruction();

      transaction.add(ix);
    }

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


const claimMultiplePrizesBackTx = async (req: Request, res: Response) => {
  const userAddress = req.user as string;
  const body = req.body;
  const { success, data: parsedData } = claimMultiplePrizesBackSchemaTx.safeParse(body);
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
      feePayer: new PublicKey(userAddress),
    });

    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000
    });
    transaction.add(modifyComputeUnits);

    const gumballAddress = await gumballPda(parsedData.gumballId);

    for (const prize of parsedData.prizes) {
      const prizeAddress = await prizePda(
        parsedData.gumballId,
        prize.prizeIndex
      );

      // Fetch prize account to get mint
      const prizeState = await gumballProgram.account.prize.fetch(prizeAddress);

      const prizeMint: PublicKey = prizeState.mint;

      const prizeTokenProgram = await getTokenProgramFromMint(
        connection,
        prizeMint
      );

      // const prizeEscrowRes = await ensureAtaIx({
      //     connection,
      //     mint: prizeMint,
      //     owner: gumballAddress,
      //     payer: wallet.publicKey,
      //     tokenProgram: prizeTokenProgram,
      //     allowOwnerOffCurve: true,
      // });

      // const creatorPrizeRes = await ensureAtaIx({
      //     connection,
      //     mint: prizeMint,
      //     owner: wallet.publicKey,
      //     payer: wallet.publicKey,
      //     tokenProgram: prizeTokenProgram,
      // });

      const creatorPrizeAta = await getAtaAddress(
        connection,
        prizeMint,
        new PublicKey(userAddress)
      );

      const prizeEscrowAta = await getAtaAddress(
        connection,
        prizeMint,
        gumballAddress,
        true // PDA owner
      );

      // ---------------- Metaplex Accounts (New) ----------------
      const metadataAccount = getMetadataPda(prizeMint);
      const editionAccount = getMasterEditionPda(prizeMint);
      const ownerTokenRecord = getTokenRecordPda(prizeMint, prizeEscrowAta);
      const destTokenRecord = getTokenRecordPda(prizeMint, creatorPrizeAta);
      const ruleSet = await getRuleSet(prizeMint);

      const ix = await gumballProgram.methods
        .claimPrizeBack(parsedData.gumballId, prize.prizeIndex)
        .accounts({
          creator: new PublicKey(userAddress),
          gumballAdmin: ADMIN_KEYPAIR.publicKey,

          prizeMint,

          prizeTokenProgram,

          // Metaplex & pNFT Accounts
          metadataAccount,
          editionAccount,
          ownerTokenRecord,
          destTokenRecord,
          authorizationRules: ruleSet, // Pass null if Option<T> is not used
          authRulesProgram: MPL_TOKEN_AUTH_RULES_PROGRAM_ID, // Or a specific rules program if applicable
          tokenMetadataProgram: METAPLEX_METADATA_PROGRAM_ID,
          sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .instruction();

      transaction.add(ix);
    }

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
  createGumball,
  confirmGumballCreation,
  activateGumball,
  updateBuyBackSettings,
  addPrize,
  addMultiplePrizes,
  prepareSpin,
  spin,
  claimPrize,
  cancelGumball,
  creatorClaimPrize,
  getGumballs,
  getGumballDetails,
  getGumballsByUser,
  getSpinsByUser,
  deleteGumball,
  getGumballStats,
  spinGumballTx,
  claimGumballTx,
  cancelGumballTx,
  createGumballTx,
  cancelAndClaimGumballTx,
  addMultiplePrizesTx,
  claimMultiplePrizesBackTx
};
