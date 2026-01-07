import { Request, Response } from "express";
import prismaClient from "../database/client";
import { responseHandler } from "../utils/resHandler";
import logger from "../utils/logger";

const getRecentWinnings = async (req: Request, res: Response) => {
  try {
    const walletAddress = req.user as string;
    const { page = 1, limit = 10 } = req.query;

    const user = await prismaClient.user.findUnique({
      where: { walletAddress },
      select: {
        raffleWinnings: {
          orderBy: { endsAt: "desc" },
          include: {
            prizeData: true,
            creator: {
              select: { walletAddress: true, twitterId: true },
            },
          },
        },
      },
    });

    if (!user) {
      return responseHandler.error(res, "User not found");
    }

    // Check which prizes the user has already claimed
    const claimedPrizes = await prismaClient.transaction.findMany({
      where: {
        type: "RAFFLE_CLAIM",
        sender: walletAddress,
        raffleId: {
          in: user.raffleWinnings.map((raffle) => raffle.id),
        },
      },
      select: {
        raffleId: true,
      },
    });

    const claimedRaffleIds = new Set(claimedPrizes.map((t) => t.raffleId));

    const rafflesWithClaimStatus = user.raffleWinnings
    .filter((raffle) => !claimedRaffleIds.has(raffle.id))
    .map((raffle) => ({
      id: raffle.id,
      claimed: claimedRaffleIds.has(raffle.id),
    }));

    const total = rafflesWithClaimStatus.length;

    return responseHandler.success(res, {
      message: "Recent winnings fetched successfully",
      raffles: rafflesWithClaimStatus,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    logger.error(error);
    return responseHandler.error(res, error);
  }
};

export default {
  getRecentWinnings,
};

