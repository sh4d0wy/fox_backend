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

  getProfile: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          id: true,
          walletAddress: true,
          profileImage: true,
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

  getMyProfile: async (req: Request, res: Response) => {
    try {
      const walletAddress = req.user as string;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          id: true,
          walletAddress: true,
          profileImage: true,
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
          creator: {
            select: { walletAddress: true, twitterId: true, profileImage: true },
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
                select: { walletAddress: true, twitterId: true, profileImage: true },
              },
              winners: {
                select: { walletAddress: true },
              },
              transactions: {
                where: {
                  type: "RAFFLE_CLAIM",
                  sender: walletAddress,
                },
                select: { id: true },
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

      const raffles = entries.map((entry: { raffle: { winners: any[]; transactions: any[]; }; quantity: any; }) => {
        const isWinner = entry.raffle.winners.some((w) => w.walletAddress === walletAddress);
        const { transactions, ...raffleData } = entry.raffle;
        return {
          ...raffleData,
          ticketsBought: entry.quantity,
          isWinner,
          hasClaimed: isWinner ? transactions.length > 0 : null,
        };
      });

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
                select: { walletAddress: true, twitterId: true, profileImage: true },
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

  getRaffleStats: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;

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

  getAuctionsParticipated: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const bids = await prismaClient.bid.findMany({
        where: { bidderWallet: walletAddress },
        distinct: ["auctionId"],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          auction: {
            include: {
              creator: {
                select: { walletAddress: true, twitterId: true, profileImage: true },
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
                select: { walletAddress: true, twitterId: true, profileImage: true },
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

  getAuctionStats: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;

      const auctionsParticipated = await prismaClient.bid.groupBy({
        by: ["auctionId"],
        where: { bidderWallet: walletAddress },
      });

      const totalBids = await prismaClient.bid.count({
        where: { bidderWallet: walletAddress },
      });

      const auctionsWon = await prismaClient.auction.count({
        where: {
          highestBidderWallet: walletAddress,
          status: "COMPLETED_SUCCESSFULLY",
        },
      });

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
          creator: {
            select: { walletAddress: true, twitterId: true, profileImage: true },
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

  getGumballsPurchased: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { page = 1, limit = 10 } = req.query;

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

  getFavouriteGumballs: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          favouriteGumballs: {
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            include: {
              creator: {
                select: { walletAddress: true, twitterId: true },
              },
              prizes: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!user) {
        return responseHandler.error(res, "User not found");
      }

      return responseHandler.success(res, {
        message: "Favourite gumballs fetched successfully",
        gumballs: user.favouriteGumballs,
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  getFollowedRaffles: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          followedRaffles: {
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
        message: "Followed raffles fetched successfully",
        raffles: user.followedRaffles,
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  getFollowedAuctions: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          followedAuctions: {
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
        message: "Followed auctions fetched successfully",
        auctions: user.followedAuctions,
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  getFollowedGumballs: async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          followedGumballs: {
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            include: {
              creator: {
                select: { walletAddress: true, twitterId: true },
              },
              prizes: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!user) {
        return responseHandler.error(res, "User not found");
      }

      return responseHandler.success(res, {
        message: "Followed gumballs fetched successfully",
        gumballs: user.followedGumballs,
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

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

  toggleFavouriteGumball: async (req: Request, res: Response) => {
    try {
      const walletAddress = req.user as string;
      const { gumballId } = req.params;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          favouriteGumballs: {
            where: { id: Number(gumballId) },
          },
        },
      });

      if (!user) {
        return responseHandler.error(res, "User not found");
      }

      const isFavourite = user.favouriteGumballs.length > 0;

      await prismaClient.user.update({
        where: { walletAddress },
        data: {
          favouriteGumballs: isFavourite
            ? { disconnect: { id: Number(gumballId) } }
            : { connect: { id: Number(gumballId) } },
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

  toggleFollowRaffle: async (req: Request, res: Response) => {
    try {
      const walletAddress = req.user as string;
      const { raffleId } = req.params;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          followedRaffles: {
            where: { id: Number(raffleId) },
          },
        },
      });

      if (!user) {
        return responseHandler.error(res, "User not found");
      }

      const isFollowing = user.followedRaffles.length > 0;

      await prismaClient.user.update({
        where: { walletAddress },
        data: {
          followedRaffles: isFollowing
            ? { disconnect: { id: Number(raffleId) } }
            : { connect: { id: Number(raffleId) } },
        },
      });

      return responseHandler.success(res, {
        message: isFollowing ? "Unfollowed raffle" : "Following raffle",
        isFollowing: !isFollowing,
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  toggleFollowAuction: async (req: Request, res: Response) => {
    try {
      const walletAddress = req.user as string;
      const { auctionId } = req.params;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          followedAuctions: {
            where: { id: Number(auctionId) },
          },
        },
      });

      if (!user) {
        return responseHandler.error(res, "User not found");
      }

      const isFollowing = user.followedAuctions.length > 0;

      await prismaClient.user.update({
        where: { walletAddress },
        data: {
          followedAuctions: isFollowing
            ? { disconnect: { id: Number(auctionId) } }
            : { connect: { id: Number(auctionId) } },
        },
      });

      return responseHandler.success(res, {
        message: isFollowing ? "Unfollowed auction" : "Following auction",
        isFollowing: !isFollowing,
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  toggleFollowGumball: async (req: Request, res: Response) => {
    try {
      const walletAddress = req.user as string;
      const { gumballId } = req.params;

      const user = await prismaClient.user.findUnique({
        where: { walletAddress },
        select: {
          followedGumballs: {
            where: { id: Number(gumballId) },
          },
        },
      });

      if (!user) {
        return responseHandler.error(res, "User not found");
      }

      const isFollowing = user.followedGumballs.length > 0;

      await prismaClient.user.update({
        where: { walletAddress },
        data: {
          followedGumballs: isFollowing
            ? { disconnect: { id: Number(gumballId) } }
            : { connect: { id: Number(gumballId) } },
        },
      });

      return responseHandler.success(res, {
        message: isFollowing ? "Unfollowed gumball" : "Following gumball",
        isFollowing: !isFollowing,
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },

  updateProfileImage: async (req: Request, res: Response) => {
    try {
      const walletAddress = req.user as string;

      if (!req.file) {
        return responseHandler.error(res, "No image file provided");
      }

      const fs = await import("fs");
      const path = await import("path");

      const uploadDir = path.join(process.cwd(), "public", "uploads", "profile-images");
      const newFileExt = path.extname(req.file.originalname).toLowerCase();
      const newFileName = `${walletAddress}${newFileExt}`;

      // Delete old profile images with different extensions
      const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
      for (const ext of allowedExtensions) {
        if (ext !== newFileExt) {
          const oldFilePath = path.join(uploadDir, `${walletAddress}${ext}`);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
      }

      // Construct the URL path for the uploaded image
      const profileImageUrl = `/uploads/profile-images/${newFileName}`;

      // Update user's profileImage in database
      const updatedUser = await prismaClient.user.update({
        where: { walletAddress },
        data: { profileImage: profileImageUrl },
        select: {
          id: true,
          walletAddress: true,
          profileImage: true,
          twitterId: true,
          twitterConnected: true,
          createdAt: true,
        },
      });

      return responseHandler.success(res, {
        message: "Profile image updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      logger.error(error);
      return responseHandler.error(res, error);
    }
  },
};
