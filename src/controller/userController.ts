//userController
import { Request, response, Response } from "express";
import {
  validatePublicKey,
  generateAuthMessage,
  verifySignature,
  verifyNonce,
  findOrCreateUser,
} from "../helpers/user/authHelpers";
import logger from "../utils/logger";
import { responseHandler } from "../utils/resHandler";
import { authVerifySchema } from "../schemas";
import jwt from "jsonwebtoken";
import prismaClient from "../database/client";

export default {
  requestMessage: async (req: Request, res: Response) => {
    try {
      const publicKey = req.params.publicKey;
      validatePublicKey(publicKey);
      const payload = await generateAuthMessage(publicKey);
      return responseHandler.success(res, payload);
    } catch (e) {
      logger.error(e);
      responseHandler.error(res, e);
    }
  },

  verifyMessage: async (req: Request, res: Response) => {
    const data = req.body;
    const { success, data: parsedData } = authVerifySchema.safeParse(data);

    try {

      if (!success) {
        throw "Invalid payload"
      }

      const { publicKey, signature, message } = parsedData;

      await verifySignature(publicKey, signature, message);
      const nonce = message.split("Nonce:")[1].trim();

      if (!nonce) {
        throw "Missing nonce"
      }

      await verifyNonce(nonce, publicKey);

      const { user, token } = await findOrCreateUser(publicKey);

      return responseHandler.success(res, {
        message: "Signature verified",
        error: null,
        token,
        user,
      });
    } catch (e) {
      logger.error(e);
      return responseHandler.error(res, e);
    }
  },
  refreshToken: async (req: Request, res: Response) => {
    const token = req.headers?.authorization?.split(" ")[1];
    try {
      const decoded = jwt.verify(
        token!,
        process.env.JWT_SECRET as string,
        { ignoreExpiration: true }
      ) as { publicKey: string, userId: string };

      const newToken = jwt.sign(
        {
          publicKey: decoded.publicKey,
          userId: decoded.userId
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
      );

      res.json({ token: newToken });
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Invalid token" });
    }

  },

  // Get user profile by wallet address (public)
  getProfile: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          id: true,
          walletAddress: true,
          twitterId: true,
          twitterConnected: true,
          createdAt: true,
        },
      });

      if (!user) {
        return responseHandler.error(res, "User not found");
      }

      return responseHandler.success(res, {
        message: "User profile fetched successfully",
        user,
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  // Get authenticated user's own profile
  getMyProfile: async (req: Request, res: Response) => {
    try {
      const walletAddress = req.user as string;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          id: true,
          walletAddress: true,
          twitterId: true,
          twitterConnected: true,
          createdAt: true,
        },
      });

      if (!user) {
        return responseHandler.error(res, "User not found");
      }

      return responseHandler.success(res, {
        message: "Profile fetched successfully",
        user,
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  // ==================== RAFFLE PROFILE DATA ====================

  // Get raffles created by user
  getRafflesCreated: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { page = 1, limit = 10, sortBy = "createdAt", order = "desc" } = req.query;

      const raffles = await prismaClient.raffle.findMany({
        where: { createdBy: walletAddress },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { [sortBy as string]: order },
        include: {
          prizeData: true,
          _count: {
            select: { raffleEntries: true },
          },
        },
      });

      const total = await prismaClient.raffle.count({
        where: { createdBy: walletAddress },
      });

      return responseHandler.success(res, {
        message: "Raffles created fetched successfully",
        raffles,
        total,
        page: Number(page),
        limit: Number(limit),
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  // Get raffles purchased/entered by user
  getRafflesPurchased: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { page = 1, limit = 10, sortBy = "createdAt", order = "desc" } = req.query;

      const entries = await prismaClient.entry.findMany({
        where: { userAddress: walletAddress },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          raffle: {
            include: {
              prizeData: true,
              creator: {
                select: { walletAddress: true, twitterId: true },
              },
              winners: {
                select: { walletAddress: true },
              },
            },
          },
        },
        orderBy: {
          raffle: { [sortBy as string]: order },
        },
      });

      const total = await prismaClient.entry.count({
        where: { userAddress: walletAddress },
      });

      // Transform to include win status
      const raffles = entries.map((entry: { raffle: { winners: any[]; }; quantity: any; }) => ({
        ...entry.raffle,
        ticketsBought: entry.quantity,
        isWinner: entry.raffle.winners.some((w) => w.walletAddress === walletAddress),
      }));

      return responseHandler.success(res, {
        message: "Raffles purchased fetched successfully",
        raffles,
        total,
        page: Number(page),
        limit: Number(limit),
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  // Get favourite raffles
  getFavouriteRaffles: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          favouriteRaffles: {
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            include: {
              prizeData: true,
              creator: {
                select: { walletAddress: true, twitterId: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!user) {
        return responseHandler.error(res, "User not found");
      }

      return responseHandler.success(res, {
        message: "Favourite raffles fetched successfully",
        raffles: user.favouriteRaffles,
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  // Get raffle stats for user
  getRaffleStats: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;

      // Get entries data
      const entries = await prismaClient.entry.findMany({
        where: { userAddress: walletAddress },
        select: {
          quantity: true,
          raffle: {
            select: {
              id: true,
              ticketPrice: true,
            },
          },
        },
      });

      // Get winnings
      const winnings = await prismaClient.raffle.count({
        where: {
          winners: {
            some: { walletAddress },
          },
        },
      });

      const rafflesBought = entries.length;
      const ticketsBought = entries.reduce((sum: any, e: { quantity: any; }) => sum + e.quantity, 0);
      const purchaseVolume = entries.reduce(
        (sum: number, e: { quantity: number; raffle: { ticketPrice: number; }; }) => sum + e.quantity * e.raffle.ticketPrice,
        0
      );

      return responseHandler.success(res, {
        message: "Raffle stats fetched successfully",
        stats: {
          rafflesBought,
          ticketsBought,
          rafflesWon: winnings,
          purchaseVolume,
        },
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  // ==================== AUCTION PROFILE DATA ====================

  // Get auctions created by user
  getAuctionsCreated: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { page = 1, limit = 10, sortBy = "createdAt", order = "desc" } = req.query;

      const auctions = await prismaClient.auction.findMany({
        where: { createdBy: walletAddress },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { [sortBy as string]: order },
        include: {
          _count: {
            select: { bids: true },
          },
        },
      });

      const total = await prismaClient.auction.count({
        where: { createdBy: walletAddress },
      });

      return responseHandler.success(res, {
        message: "Auctions created fetched successfully",
        auctions,
        total,
        page: Number(page),
        limit: Number(limit),
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  // Get auctions participated (bids placed) by user
  getAuctionsParticipated: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // Get unique auctions user has bid on
      const bids = await prismaClient.bid.findMany({
        where: { bidderWallet: walletAddress },
        distinct: ["auctionId"],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          auction: {
            include: {
              creator: {
                select: { walletAddress: true, twitterId: true },
              },
            },
          },
        },
        orderBy: { bidTime: "desc" },
      });

      const auctions = bids.map((bid) => ({
        ...bid.auction,
        userHighestBid: bid.bidAmount,
        isHighestBidder: bid.auction.highestBidderWallet === walletAddress,
      }));

      return responseHandler.success(res, {
        message: "Auctions participated fetched successfully",
        auctions,
        page: Number(page),
        limit: Number(limit),
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  // Get favourite auctions
  getFavouriteAuctions: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          favouriteAuctions: {
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            include: {
              creator: {
                select: { walletAddress: true, twitterId: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!user) {
        return responseHandler.error(res, "User not found");
      }

      return responseHandler.success(res, {
        message: "Favourite auctions fetched successfully",
        auctions: user.favouriteAuctions,
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  // Get auction stats for user
  getAuctionStats: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;

      // Auctions participated (unique auctions bid on)
      const auctionsParticipated = await prismaClient.bid.groupBy({
        by: ["auctionId"],
        where: { bidderWallet: walletAddress },
      });

      // Total bids placed
      const totalBids = await prismaClient.bid.count({
        where: { bidderWallet: walletAddress },
      });

      // Auctions won
      const auctionsWon = await prismaClient.auction.count({
        where: {
          highestBidderWallet: walletAddress,
          status: "COMPLETED_SUCCESSFULLY",
        },
      });

      // Total volume bid
      const bids = await prismaClient.bid.findMany({
        where: { bidderWallet: walletAddress },
        select: { bidAmount: true },
      });

      const totalVolumeBid = bids.reduce(
        (sum: number, b: { bidAmount: string; }) => sum + parseFloat(b.bidAmount),
        0
      );

      return responseHandler.success(res, {
        message: "Auction stats fetched successfully",
        stats: {
          auctionsParticipated: auctionsParticipated.length,
          totalBids,
          auctionsWon,
          totalVolumeBid,
        },
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  // ==================== GUMBALL PROFILE DATA ====================

  // Get gumballs created by user
  getGumballsCreated: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { page = 1, limit = 10, sortBy = "createdAt", order = "desc" } = req.query;

      const gumballs = await prismaClient.gumball.findMany({
        where: { creatorAddress: walletAddress },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { [sortBy as string]: order },
        include: {
          prizes: true,
          _count: {
            select: { spins: true },
          },
        },
      });

      const total = await prismaClient.gumball.count({
        where: { creatorAddress: walletAddress },
      });

      return responseHandler.success(res, {
        message: "Gumballs created fetched successfully",
        gumballs,
        total,
        page: Number(page),
        limit: Number(limit),
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  // Get gumballs purchased (spins) by user
  getGumballsPurchased: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // Get unique gumballs user has spun
      const spins = await prismaClient.gumballSpin.findMany({
        where: { spinnerAddress: walletAddress },
        distinct: ["gumballId"],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          gumball: {
            include: {
              creator: {
                select: { walletAddress: true, twitterId: true },
              },
              prizes: true,
            },
          },
          prize: true,
        },
        orderBy: { spunAt: "desc" },
      });

      const gumballs = spins.map((spin: { gumball: any; prize: any; }) => ({
        ...spin.gumball,
        userSpins: 1, // This would need aggregation for accurate count
        lastPrizeWon: spin.prize,
      }));

      return responseHandler.success(res, {
        message: "Gumballs purchased fetched successfully",
        gumballs,
        page: Number(page),
        limit: Number(limit),
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  // Get gumball stats for user
  getGumballStats: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const gumballsCreated = await prismaClient.gumball.findMany({
        where: { creatorAddress: walletAddress },
        select: { ticketPrice: true },
      });

      const totalSpins = await prismaClient.gumballSpin.count({
        where: { spinnerAddress: walletAddress },
      });
     
      // Total volume spent
      const spins = await prismaClient.gumballSpin.findMany({
        where: { spinnerAddress: walletAddress },
        select: {
          gumball: {
            select: { ticketPrice: true },
          },
        },
      });
     
      const totalVolumeSpent = spins.reduce(
        (sum: number, s: { gumball: { ticketPrice: any; }; }) => sum + Number(s.gumball.ticketPrice),
        0
      );

      return responseHandler.success(res, {
        message: "Gumball stats fetched successfully",
        stats: {
          gumballsCreated: gumballsCreated.length,
          totalSpins: totalSpins,
          totalVolumeSpent: totalVolumeSpent,
        },
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  // ==================== FAVOURITES MANAGEMENT ====================

  // Toggle favourite raffle
  toggleFavouriteRaffle: async (req: Request, res: Response) => {
    try {
      const walletAddress = req.user as string;
      const { raffleId } = req.params;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          favouriteRaffles: {
            where: { id: Number(raffleId) },
          },
        },
      });

      if (!user) {
        return responseHandler.error(res, "User not found");
      }

      const isFavourite = user.favouriteRaffles.length > 0;

      await prismaClient.user.update({
        where: { walletAddress },
        data: {
          favouriteRaffles: isFavourite
            ? { disconnect: { id: Number(raffleId) } }
            : { connect: { id: Number(raffleId) } },
        },
      });

      return responseHandler.success(res, {
        message: isFavourite ? "Removed from favourites" : "Added to favourites",
        isFavourite: !isFavourite,
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  // Toggle favourite auction
  toggleFavouriteAuction: async (req: Request, res: Response) => {
    try {
      const walletAddress = req.user as string;
      const { auctionId } = req.params;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          favouriteAuctions: {
            where: { id: Number(auctionId) },
          },
        },
      });

      if (!user) {
        return responseHandler.error(res, "User not found");
      }

      const isFavourite = user.favouriteAuctions.length > 0;

      await prismaClient.user.update({
        where: { walletAddress },
        data: {
          favouriteAuctions: isFavourite
            ? { disconnect: { id: Number(auctionId) } }
            : { connect: { id: Number(auctionId) } },
        },
      });

      return responseHandler.success(res, {
        message: isFavourite ? "Removed from favourites" : "Added to favourites",
        isFavourite: !isFavourite,
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },
};
