import { Request, Response } from "express";
import prismaClient from "../database/client";
import { responseHandler } from "../utils/resHandler";
import logger from "../utils/logger";

const getEndedCreatedRaffles = async (req: Request, res: Response) => {
  try {
    const walletAddress = req.user as string;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Find all raffles created by the user that have ended
    const endedRaffles = await prismaClient.raffle.findMany({
      where: {
        createdBy: walletAddress,
        ticketAmountClaimedByCreator: false,
        OR: [
          { state: "SuccessEnded" },
          { state: "FailedEnded" },
        ],
      },
      orderBy: { endsAt: "desc" },
      skip,
      take: limitNum,
      include: {
        prizeData: true,
        winners: {
          select: {
            walletAddress: true,
            twitterId: true,
            profileImage: true,
          },
        },
        _count: {
          select: {
            raffleEntries: true,
          },
        },
      },
    });

    // Get total count for pagination
    const total = await prismaClient.raffle.count({
      where: {
        createdBy: walletAddress,
        ticketAmountClaimedByCreator: false,
        OR: [
          { state: "SuccessEnded" },
          { state: "FailedEnded" },
        ],
      },
    });

    // Check which raffles have unclaimed ticket amounts
    const rafflesWithClaimStatus = endedRaffles.map((raffle) => ({
      id: raffle.id,
      raffle: raffle.raffle,
      state: raffle.state,
      endsAt: raffle.endsAt,
      ticketPrice: raffle.ticketPrice,
      ticketSold: raffle.ticketSold,
      ticketSupply: raffle.ticketSupply,
      numberOfWinners: raffle.numberOfWinners,
      winnerPicked: raffle.winnerPicked,
      claimed: raffle.claimed,
      ticketAmountClaimedByCreator: raffle.ticketAmountClaimedByCreator,
      totalEntries: raffle._count.raffleEntries,
      prizeData: raffle.prizeData,
      winners: raffle.winners,
      // Calculate total ticket revenue
      ticketRevenue: raffle.ticketPrice * raffle.ticketSold,
      // Check if creator can claim ticket amount
      canClaimTicketAmount: raffle.state === "SuccessEnded" && !raffle.ticketAmountClaimedByCreator,
    }));

    return responseHandler.success(res, {
      message: "Ended raffles with unclaimed ticket amount fetched successfully",
      raffles: rafflesWithClaimStatus,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    logger.error(error);
    return responseHandler.error(res, error);
  }
};

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
  getEndedCreatedRaffles,
};

