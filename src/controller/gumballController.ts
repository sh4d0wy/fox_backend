import { responseHandler } from "../utils/resHandler";
import { Request, Response } from "express";
import {
  gumballSchema,
  confirmGumballCreationSchema,
  activateGumballSchema,
  updateBuyBackSchema,
} from "../schemas/gumball/createGumball.schema";
import { addPrizeSchema, addMultiplePrizesSchema } from "../schemas/gumball/addPrize.schema";
import { spinSchema } from "../schemas/gumball/spin.schema";
import { claimGumballPrizeSchema } from "../schemas/gumball/claimPrize.schema";
import { cancelGumballSchema } from "../schemas/gumball/cancelGumball.schema";
import { verifyTransaction } from "../utils/verifyTransaction";
import prismaClient from "../database/client";
import logger from "../utils/logger";

//TODO: Creating cron to schedule the activation of gumballs
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

  // Calculate max proceeds based on ticket price and total tickets
  const ticketPrice = BigInt(parsedData.ticketPrice);
  const maxProceeds = ticketPrice * BigInt(parsedData.totalTickets);

  const gumball = await prismaClient.gumball.create({
    data: {
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
      status: "NONE",
    },
  });

  responseHandler.success(res, {
    message: "Gumball creation initiated successfully",
    error: null,
    gumball: {
      ...gumball,
      ticketPrice: gumball.ticketPrice.toString(),
      maxProceeds: gumball.maxProceeds.toString(),
      totalPrizeValue: gumball.totalPrizeValue.toString(),
      totalProceeds: gumball.totalProceeds.toString(),
      buyBackProfit: gumball.buyBackProfit.toString(),
      rentAmount: gumball.rentAmount?.toString(),
    },
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

      await tx.gumball.update({
        where: {
          id: gumballId,
        },
        data: {
          status: "INITIALIZED",
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
      if (gumball.prizesAdded >= gumball.maxPrizes) {
        throw {
          code: "DB_ERROR",
          message: `Maximum number of prizes (${gumball.maxPrizes}) reached`,
        };
      }

      // Calculate prizeIndex based on current prizes count
      assignedPrizeIndex = gumball.prizesAdded;

      const prizeAmount = BigInt(parsedData.totalAmount);

      await tx.gumballPrize.create({
        data: {
          gumballId: gumballId,
          prizeIndex: assignedPrizeIndex,
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
      if (gumball.prizesAdded + parsedData.prizes.length > gumball.maxPrizes) {
        throw {
          code: "DB_ERROR",
          message: `Adding these prizes would exceed maximum (${gumball.maxPrizes})`,
        };
      }

      let totalAddedValue = BigInt(0);
      // Start prizeIndex from current prizes count
      let currentPrizeIndex = gumball.prizesAdded;

      for (const prize of parsedData.prizes) {
        const prizeAmount = BigInt(prize.totalAmount);
        totalAddedValue += prizeAmount;

        await tx.gumballPrize.create({
          data: {
            gumballId: gumballId,
            prizeIndex: currentPrizeIndex,
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

        assignedPrizeIndices.push(currentPrizeIndex);
        currentPrizeIndex++;
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
      ticketPrice: gumball.ticketPrice.toString(),
      ticketMint: gumball.ticketMint,
      isTicketSol: gumball.isTicketSol,
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
          prizeId: prize.id,
          spinnerAddress: userAddress,
          winnerAddress: userAddress,
          prizeAmount: prize.prizeAmount,
        },
      });

      await tx.gumballPrize.update({
        where: {
          id: prize.id,
        },
        data: {
          quantityClaimed: prize.quantityClaimed + 1,
        },
      });

      await tx.gumball.update({
        where: {
          id: gumballId,
        },
        data: {
          ticketsSold: gumball.ticketsSold + 1,
          totalProceeds: gumball.totalProceeds + gumball.ticketPrice,
          uniqueBuyers: isNewBuyer ? gumball.uniqueBuyers + 1 : gumball.uniqueBuyers,
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
          metadata: {
            prizeId: prize.id,
            prizeIndex: parsedData.prizeIndex,
            prizeAmount: prize.prizeAmount.toString(),
            prizeName: prize.name,
          },
        },
      });

      spinResult = {
        spinId: spinRecord.id,
        prizeId: prize.id,
        prizeIndex: parsedData.prizeIndex,
        prizeAmount: prize.prizeAmount.toString(),
        prizeName: prize.name,
        prizeSymbol: prize.symbol,
        prizeImage: prize.image,
        prizeMint: prize.mint,
        isNft: prize.isNft,
      };
    });

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
          prize: true,
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
      if (spin.winnerAddress !== userAddress) {
        throw {
          code: "DB_ERROR",
          message: "User is not the winner of this spin",
        };
      }
      if (spin.claimed) {
        throw {
          code: "DB_ERROR",
          message: "Prize already claimed",
        };
      }

      await tx.gumballSpin.update({
        where: {
          id: parsedData.spinId,
        },
        data: {
          claimed: true,
          claimedAt: new Date(),
        },
      });

      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "GUMBALL_CLAIM_PRIZE",
          sender: userAddress,
          receiver: userAddress,
          amount: spin.prizeAmount,
          mintAddress: spin.prize.mint,
          isNft: spin.prize.isNft,
          gumballId: gumballId,
          metadata: {
            spinId: parsedData.spinId,
            prizeId: spin.prizeId,
            prizeName: spin.prize.name,
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
      creator: {
        select: {
          walletAddress: true,
          twitterId: true,
        },
      },
    },
  });
  if (!gumball) {
    return responseHandler.error(res, "Gumball not found");
  }

  // Convert BigInt to string for JSON serialization
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
    spins: gumball.spins.map((s) => ({
      ...s,
      prizeAmount: s.prizeAmount.toString(),
      prize: {
        ...s.prize,
        totalAmount: s.prize.totalAmount.toString(),
        prizeAmount: s.prize.prizeAmount.toString(),
        floorPrice: s.prize.floorPrice?.toString(),
      },
    })),
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
    prize: {
      ...s.prize,
      totalAmount: s.prize.totalAmount.toString(),
      prizeAmount: s.prize.prizeAmount.toString(),
      floorPrice: s.prize.floorPrice?.toString(),
    },
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
    if(!gumballId){
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
  getGumballs,
  getGumballDetails,
  getGumballsByUser,
  getSpinsByUser,
  deleteGumball,
  getGumballStats,
};
