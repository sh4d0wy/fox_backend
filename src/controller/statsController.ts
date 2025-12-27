import { Request, Response } from "express";
import { responseHandler } from "../utils/resHandler";
import prismaClient from "../database/client";
import logger from "../utils/logger";

type TimeFilter = "all" | "7d" | "30d" | "90d" | "1y";
type LeaderboardType = "rafflers" | "buyers";
type SortField = "volume" | "raffles" | "tickets" | "won";

const getDateFilter = (timeFilter: TimeFilter): Date | null => {
  const now = new Date();
  switch (timeFilter) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "1y":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
};

const getTopRafflers = async (req: Request, res: Response) => {
  try {
    const { 
      timeFilter = "all", 
      sortBy = "volume", 
      limit = 10, 
      page = 1 
    } = req.query;

    const dateFilter = getDateFilter(timeFilter as TimeFilter);
    const skip = (Number(page) - 1) * Number(limit);

    const rafflers = await prismaClient.user.findMany({
      where: {
        rafflesCreated: {
          some: dateFilter ? { createdAt: { gte: dateFilter } } : {},
        },
      },
      select: {
        walletAddress: true,
        twitterId: true,
        rafflesCreated: {
          where: dateFilter ? { createdAt: { gte: dateFilter } } : {},
          select: {
            id: true,
            ticketSold: true,
            ticketPrice: true,
            ticketTokenSymbol: true,
            state: true,
          },
        },
      },
    });

    const rafflerStats = rafflers.map((user) => {
      const raffles = user.rafflesCreated;
      const totalRaffles = raffles.length;
      const totalTicketsSold = raffles.reduce((sum, r) => sum + r.ticketSold, 0);
      const totalVolume = raffles.reduce(
        (sum, r) => sum + r.ticketSold * r.ticketPrice,
        0
      );

      return {
        walletAddress: user.walletAddress,
        twitterId: user.twitterId,
        raffles: totalRaffles,
        ticketsSold: totalTicketsSold,
        volume: totalVolume,
      };
    });

    const sortedStats = rafflerStats.sort((a, b) => {
      switch (sortBy) {
        case "raffles":
          return b.raffles - a.raffles;
        case "tickets":
          return b.ticketsSold - a.ticketsSold;
        case "volume":
        default:
          return b.volume - a.volume;
      }
    });

    // Paginate and add rank
    const paginatedStats = sortedStats
      .slice(skip, skip + Number(limit))
      .map((stat, index) => ({
        rank: skip + index + 1,
        ...stat,
      }));

    responseHandler.success(res, {
      message: "Top rafflers fetched successfully",
      leaderboard: paginatedStats,
      total: sortedStats.length,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const getTopBuyers = async (req: Request, res: Response) => {
  try {
    const { 
      timeFilter = "all", 
      sortBy = "volume", 
      limit = 10, 
      page = 1 
    } = req.query;

    const dateFilter = getDateFilter(timeFilter as TimeFilter);
    const skip = (Number(page) - 1) * Number(limit);

    const buyers = await prismaClient.user.findMany({
      where: {
        raffleEntries: {
          some: dateFilter
            ? {
                raffle: { createdAt: { gte: dateFilter } },
              }
            : {},
        },
      },
      select: {
        walletAddress: true,
        twitterId: true,
        raffleEntries: {
          where: dateFilter
            ? { raffle: { createdAt: { gte: dateFilter } } }
            : {},
          select: {
            quantity: true,
            raffle: {
              select: {
                id: true,
                ticketPrice: true,
              },
            },
          },
        },
        raffleWinnings: {
          where: dateFilter ? { createdAt: { gte: dateFilter } } : {},
          select: {
            id: true,
          },
        },
      },
    });

    const buyerStats = buyers.map((user) => {
      const entries = user.raffleEntries;
      const uniqueRaffles = new Set(entries.map((e) => e.raffle.id)).size;
      const totalTickets = entries.reduce((sum, e) => sum + e.quantity, 0);
      const totalVolume = entries.reduce(
        (sum, e) => sum + e.quantity * e.raffle.ticketPrice,
        0
      );
      const totalWon = user.raffleWinnings.length;

      return {
        walletAddress: user.walletAddress,
        twitterId: user.twitterId,
        raffles: uniqueRaffles,
        tickets: totalTickets,
        won: totalWon,
        volume: totalVolume,
      };
    });

    const sortedStats = buyerStats.sort((a, b) => {
      switch (sortBy) {
        case "raffles":
          return b.raffles - a.raffles;
        case "tickets":
          return b.tickets - a.tickets;
        case "won":
          return b.won - a.won;
        case "volume":
        default:
          return b.volume - a.volume;
      }
    });

    const paginatedStats = sortedStats
      .slice(skip, skip + Number(limit))
      .map((stat, index) => ({
        rank: skip + index + 1,
        ...stat,
      }));

    responseHandler.success(res, {
      message: "Top buyers fetched successfully",
      leaderboard: paginatedStats,
      total: sortedStats.length,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const getHotCollections = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const raffles = await prismaClient.raffle.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        prizeData: {
          collection: { not: null },
        },
      },
      include: {
        prizeData: {
          select: {
            collection: true,
          },
        },
      },
    });

    const collectionMap = new Map<string, { volume: number; count: number }>();

    raffles.forEach((raffle) => {
      const collection = raffle.prizeData?.collection;
      if (collection) {
        const existing = collectionMap.get(collection) || { volume: 0, count: 0 };
        collectionMap.set(collection, {
          volume: existing.volume + raffle.ticketSold * raffle.ticketPrice,
          count: existing.count + 1,
        });
      }
    });

    const collections = Array.from(collectionMap.entries())
      .map(([name, data]) => ({
        collection: name,
        volume: data.volume,
        raffleCount: data.count,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, Number(limit))
      .map((item, index) => ({
        rank: index + 1,
        ...item,
      }));

    responseHandler.success(res, {
      message: "Hot collections fetched successfully",
      collections,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};


type AnalyticsTimeframe = "day" | "week" | "month" | "year";

interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

const getVolumeAnalytics = async (req: Request, res: Response) => {
  try {
    const { timeframe = "month" } = req.query;

    let startDate: Date;
    let groupByFormat: string;

    switch (timeframe as AnalyticsTimeframe) {
      case "day":
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        groupByFormat = "hour";
        break;
      case "week":
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        groupByFormat = "day";
        break;
      case "year":
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        groupByFormat = "month";
        break;
      case "month":
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        groupByFormat = "day";
    }

    const transactions = await prismaClient.transaction.findMany({
      where: {
        createdAt: { gte: startDate },
        type: { in: ["RAFFLE_ENTRY", "GUMBALL_SPIN"] },
      },
      select: {
        createdAt: true,
        amount: true,
      },
    });

    const volumeByDate = new Map<string, bigint>();

    transactions.forEach((tx) => {
      let dateKey: string;
      const date = tx.createdAt;

      switch (groupByFormat) {
        case "hour":
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00`;
          break;
        case "month":
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        case "day":
        default:
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      }

      const existing = volumeByDate.get(dateKey) || BigInt(0);
      volumeByDate.set(dateKey, existing + tx.amount);
    });

    const volumeData: TimeSeriesDataPoint[] = Array.from(volumeByDate.entries())
      .map(([date, value]) => ({
        date,
        value: Number(value) / 1e9, // Convert lamports to SOL
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    responseHandler.success(res, {
      message: "Volume analytics fetched successfully",
      timeframe,
      data: volumeData,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const getDailyRaffles = async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const raffles = await prismaClient.raffle.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
    });

    const rafflesByDate = new Map<string, number>();

    raffles.forEach((raffle) => {
      const date = raffle.createdAt;
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      rafflesByDate.set(dateKey, (rafflesByDate.get(dateKey) || 0) + 1);
    });

    const data: TimeSeriesDataPoint[] = [];
    for (let i = 0; i <= Number(days); i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      data.push({
        date: dateKey,
        value: rafflesByDate.get(dateKey) || 0,
      });
    }

    responseHandler.success(res, {
      message: "Daily raffles fetched successfully",
      data,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const getPurchasesStats = async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - (Number(days)-1) * 24 * 60 * 60 * 1000);

    const transactions = await prismaClient.transaction.findMany({
      where: {
        createdAt: { gte: startDate },
        type: "RAFFLE_ENTRY",
      },
      select: {
        createdAt: true,
        metadata: true,
      },
    });

    const statsByDate = new Map<string, { ticketsSold: number; transactions: number }>();

    transactions.forEach((tx) => {
      const date = tx.createdAt;
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      
      const existing = statsByDate.get(dateKey) || { ticketsSold: 0, transactions: 0 };
      const quantity = (tx.metadata as any)?.quantity || 1;
      
      statsByDate.set(dateKey, {
        ticketsSold: existing.ticketsSold + quantity,
        transactions: existing.transactions + 1,
      });
    });

    const data: { date: string; ticketsSold: number; transactions: number }[] = [];
    for (let i = 0; i < Number(days); i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const stats = statsByDate.get(dateKey) || { ticketsSold: 0, transactions: 0 };
      data.push({
        date: dateKey,
        ...stats,
      });
    }

    responseHandler.success(res, {
      message: "Purchases stats fetched successfully",
      data,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const getAverageTicketsSold = async (req: Request, res: Response) => {
  try {
    const { timeframe = "month" } = req.query;

    let startDate: Date;
    let groupByFormat: string;

    switch (timeframe as AnalyticsTimeframe) {
      case "week":
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        groupByFormat = "day";
        break;
      case "year":
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        groupByFormat = "month";
        break;
      case "month":
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        groupByFormat = "day";
    }

    const raffles = await prismaClient.raffle.findMany({
      where: {
        createdAt: { gte: startDate },
        state: { in: ["Active", "SuccessEnded", "FailedEnded"] },
      },
      select: {
        createdAt: true,
        ticketSold: true,
        ticketSupply: true,
      },
    });

    const statsByDate = new Map<string, { totalSold: number; totalSupply: number; count: number }>();

    raffles.forEach((raffle) => {
      const date = raffle.createdAt;
      let dateKey: string;

      switch (groupByFormat) {
        case "month":
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        case "day":
        default:
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      }

      const existing = statsByDate.get(dateKey) || { totalSold: 0, totalSupply: 0, count: 0 };
      statsByDate.set(dateKey, {
        totalSold: existing.totalSold + raffle.ticketSold,
        totalSupply: existing.totalSupply + raffle.ticketSupply,
        count: existing.count + 1,
      });
    });

    const data = Array.from(statsByDate.entries())
      .map(([date, stats]) => ({
        date,
        percentageSold: stats.totalSupply > 0 
          ? Math.round((stats.totalSold / stats.totalSupply) * 100) 
          : 0,
        averageTicketsSold: stats.count > 0 
          ? Math.round(stats.totalSold / stats.count) 
          : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    responseHandler.success(res, {
      message: "Average tickets sold fetched successfully",
      timeframe,
      data,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const getUniqueBuyers = async (req: Request, res: Response) => {
  try {
    const { timeframe = "month" } = req.query;

    let startDate: Date;
    let groupByFormat: string;

    switch (timeframe as AnalyticsTimeframe) {
      case "day":
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        groupByFormat = "hour";
        break;
      case "week":
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        groupByFormat = "day";
        break;
      case "year":
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        groupByFormat = "month";
        break;
      case "month":
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        groupByFormat = "day";
    }

    const entries = await prismaClient.entry.findMany({
      where: {
        raffle: {
          createdAt: { gte: startDate },
        },
      },
      select: {
        userAddress: true,
        raffle: {
          select: {
            createdAt: true,
          },
        },
      },
    });

    const buyersByDate = new Map<string, Set<string>>();

    entries.forEach((entry) => {
      const date = entry.raffle.createdAt;
      let dateKey: string;

      switch (groupByFormat) {
        case "hour":
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00`;
          break;
        case "month":
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        case "day":
        default:
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      }

      if (!buyersByDate.has(dateKey)) {
        buyersByDate.set(dateKey, new Set());
      }
      buyersByDate.get(dateKey)!.add(entry.userAddress);
    });

    const data: TimeSeriesDataPoint[] = Array.from(buyersByDate.entries())
      .map(([date, buyers]) => ({
        date,
        value: buyers.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const allBuyers = new Set<string>();
    entries.forEach((entry) => allBuyers.add(entry.userAddress));

    responseHandler.success(res, {
      message: "Unique buyers analytics fetched successfully",
      timeframe,
      totalUniqueBuyers: allBuyers.size,
      data,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const getRaffleTypesVolume = async (req: Request, res: Response) => {
  try {
    const { timeframe = "day" } = req.query;

    let startDate: Date;

    switch (timeframe as AnalyticsTimeframe) {
      case "day":
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "month":
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const raffles = await prismaClient.raffle.findMany({
      where: {
        createdAt: { gte: startDate },
        state: { in: ["Active", "SuccessEnded", "FailedEnded"] },
      },
      select: {
        ticketSold: true,
        ticketPrice: true,
        prizeData: {
          select: {
            type: true,
          },
        },
      },
    });

    let nftVolume = 0;
    let tokenVolume = 0;

    raffles.forEach((raffle) => {
      const volume = raffle.ticketSold * raffle.ticketPrice;
      const prizeType = raffle.prizeData?.type;

      if (prizeType === "NFT") {
        nftVolume += volume;
      } else {
        tokenVolume += volume;
      }
    });

    const totalVolume = nftVolume + tokenVolume;
    const nftPercentage = totalVolume > 0 ? Math.round((nftVolume / totalVolume) * 100) : 0;
    const tokenPercentage = totalVolume > 0 ? Math.round((tokenVolume / totalVolume) * 100) : 0;

    responseHandler.success(res, {
      message: "Raffle types volume fetched successfully",
      timeframe,
      totalVolume: Number(totalVolume.toFixed(2)),
      data: {
        nft: {
          volume: Number(nftVolume.toFixed(2)),
          percentage: nftPercentage,
        },
        token: {
          volume: Number(tokenVolume.toFixed(2)),
          percentage: tokenPercentage,
        },
      },
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const getPlatformStats = async (req: Request, res: Response) => {
  try {
    const [
      totalRaffles,
      activeRaffles,
      totalUsers,
      totalTransactions,
    ] = await Promise.all([
      prismaClient.raffle.count(),
      prismaClient.raffle.count({ where: { state: "Active" } }),
      prismaClient.user.count(),
      prismaClient.transaction.count(),
    ]);

    const volumeResult = await prismaClient.transaction.aggregate({
      where: {
        type: { in: ["RAFFLE_ENTRY", "GUMBALL_SPIN"] },
      },
      _sum: {
        amount: true,
      },
    });

    const totalVolume = Number(volumeResult._sum.amount || 0) / 1e9;

    responseHandler.success(res, {
      message: "Platform stats fetched successfully",
      stats: {
        totalRaffles,
        activeRaffles,
        totalUsers,
        totalTransactions,
        totalVolume,
      },
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

type PnLTimeframe = "daily" | "monthly" | "yearly";
type PnLCurrency = "USD" | "SOL";

const getDateKey = (date: Date, timeframe: string): string => {
  const isoDate = date.toISOString().split("T")[0];
  if (timeframe === "yearly") {
    return isoDate.slice(0, 4); // YYYY
  } else if (timeframe === "monthly") {
    return isoDate.slice(0, 7); // YYYY-MM
  }
  return isoDate; // YYYY-MM-DD for daily
};

const getSummaryLabel = (timeframe: string, startDate: Date, year?: unknown): string => {
  if (timeframe === "yearly") {
    return "All time";
  } else if (timeframe === "monthly" && year) {
    return String(year);
  }
  return `${startDate.toLocaleString("default", { month: "short" })} '${String(startDate.getFullYear()).slice(2)}`;
};

/**
 * Get P&L for a user (bought side - tickets purchased vs prizes won)
 * Raffle only - no gumball support
 */
const getUserPnLBought = async (req: Request, res: Response) => {
  try {
    const userAddress = req.user as string;
    const { 
      timeframe = "daily", 
      month, 
      year,
      currency = "SOL"
    } = req.query;

    if (!userAddress) {
      return responseHandler.error(res, "User not authenticated");
    }

    // Determine date range based on timeframe
    let startDate: Date;
    let endDate = new Date();

    if (timeframe === "daily" && month && year) {
      // Daily view: show days within a specific month
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 0);
    } else if (timeframe === "monthly" && year) {
      // Monthly view: show months within a specific year
      startDate = new Date(Number(year), 0, 1);
      endDate = new Date(Number(year), 11, 31);
    } else if (timeframe === "yearly") {
      // Yearly view: show all years (all time)
      startDate = new Date(2020, 0, 1); // Start from 2020 or earliest reasonable date
      endDate = new Date();
    } else {
      // Default to current month for daily view
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    }

    // Get purchases (spent) - Raffle only
    const purchases = await prismaClient.transaction.findMany({
      where: {
        sender: userAddress,
        type: "RAFFLE_ENTRY" as any,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        amount: true,
      },
    });

    // Get winnings - Raffle only
    const winnings = await prismaClient.transaction.findMany({
      where: {
        sender: userAddress,
        type: "RAFFLE_CLAIM" as any,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        amount: true,
      },
    });

    // Group by date key based on timeframe
    const pnlByDate = new Map<string, { spent: bigint; won: bigint }>();

    purchases.forEach((tx) => {
      const dateKey = getDateKey(tx.createdAt, timeframe as string);
      const existing = pnlByDate.get(dateKey) || { spent: BigInt(0), won: BigInt(0) };
      pnlByDate.set(dateKey, {
        ...existing,
        spent: existing.spent + tx.amount,
      });
    });

    winnings.forEach((tx) => {
      const dateKey = getDateKey(tx.createdAt, timeframe as string);
      const existing = pnlByDate.get(dateKey) || { spent: BigInt(0), won: BigInt(0) };
      pnlByDate.set(dateKey, {
        ...existing,
        won: existing.won + tx.amount,
      });
    });

    // Convert to array with P&L calculations
    const data = Array.from(pnlByDate.entries())
      .map(([date, values]) => {
        const spent = Number(values.spent) / 1e9;
        const won = Number(values.won) / 1e9;
        const pnl = won - spent;
        const roi = spent > 0 ? ((won - spent) / spent) * 100 : 0;

        return {
          date,
          spent: Number(spent.toFixed(2)),
          won: Number(won.toFixed(2)),
          pnl: Number(pnl.toFixed(2)),
          roi: spent > 0 ? `${roi.toFixed(0)}%` : "0%",
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // Calculate totals
    const totalSpent = data.reduce((sum, d) => sum + d.spent, 0);
    const totalWon = data.reduce((sum, d) => sum + d.won, 0);
    const totalPnl = totalWon - totalSpent;
    const totalRoi = totalSpent > 0 ? ((totalWon - totalSpent) / totalSpent) * 100 : 0;

    const summary = {
      label: getSummaryLabel(timeframe as string, startDate, year),
      totalSpent: Number(totalSpent.toFixed(2)),
      totalWon: Number(totalWon.toFixed(2)),
      pnl: Number(totalPnl.toFixed(2)),
      roi: totalSpent > 0 ? `${totalRoi.toFixed(0)}%` : "0%",
    };

    responseHandler.success(res, {
      message: "P&L bought data fetched successfully",
      summary,
      data,
      currency,
      timeframe,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

/**
 * Get P&L for a user (sold side - for raffle creators)
 * Raffle only - no gumball support
 */
const getUserPnLSold = async (req: Request, res: Response) => {
  try {
    const userAddress = req.user as string;
    const { 
      timeframe = "daily", 
      month, 
      year,
      currency = "SOL"
    } = req.query;

    if (!userAddress) {
      return responseHandler.error(res, "User not authenticated");
    }

    // Determine date range based on timeframe
    let startDate: Date;
    let endDate = new Date();

    if (timeframe === "daily" && month && year) {
      // Daily view: show days within a specific month
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 0);
    } else if (timeframe === "monthly" && year) {
      // Monthly view: show months within a specific year
      startDate = new Date(Number(year), 0, 1);
      endDate = new Date(Number(year), 11, 31);
    } else if (timeframe === "yearly") {
      // Yearly view: show all years (all time)
      startDate = new Date(2020, 0, 1); // Start from 2020 or earliest reasonable date
      endDate = new Date();
    } else {
      // Default to current month for daily view
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    }

    // Get raffles created by user with their sales data
    const userRaffles = await prismaClient.raffle.findMany({
      where: {
        createdBy: userAddress,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        createdAt: true,
        ticketSold: true,
        ticketPrice: true,
        floor: true,
        prizeData: {
          select: {
            floor: true,
            amount: true,
          },
        },
      },
    });

    // Group by date key based on timeframe
    const pnlByDate = new Map<string, { cost: number; sold: number }>();

    userRaffles.forEach((raffle) => {
      const dateKey = getDateKey(raffle.createdAt, timeframe as string);
      const existing = pnlByDate.get(dateKey) || { cost: 0, sold: 0 };
      
      const cost = raffle.prizeData?.floor || raffle.prizeData?.amount || raffle.floor || 0;
      const sold = raffle.ticketSold * raffle.ticketPrice;

      pnlByDate.set(dateKey, {
        cost: existing.cost + cost,
        sold: existing.sold + sold,
      });
    });

    // Convert to array with P&L calculations
    const data = Array.from(pnlByDate.entries())
      .map(([date, values]) => {
        const pnl = values.sold - values.cost;
        const roi = values.cost > 0 ? ((values.sold - values.cost) / values.cost) * 100 : 0;

        return {
          date,
          cost: Number(values.cost.toFixed(2)),
          sold: Number(values.sold.toFixed(2)),
          pnl: Number(pnl.toFixed(2)),
          roi: values.cost > 0 ? `${roi.toFixed(0)}%` : "0%",
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // Calculate totals
    const totalCost = data.reduce((sum, d) => sum + d.cost, 0);
    const totalSold = data.reduce((sum, d) => sum + d.sold, 0);
    const totalPnl = totalSold - totalCost;
    const totalRoi = totalCost > 0 ? ((totalSold - totalCost) / totalCost) * 100 : 0;

    const summary = {
      label: getSummaryLabel(timeframe as string, startDate, year),
      totalCost: Number(totalCost.toFixed(2)),
      totalSold: Number(totalSold.toFixed(2)),
      pnl: Number(totalPnl.toFixed(2)),
      roi: totalCost > 0 ? `${totalRoi.toFixed(0)}%` : "0%",
    };

    responseHandler.success(res, {
      message: "P&L sold data fetched successfully",
      summary,
      data,
      currency,
      timeframe,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

/**
 * Export P&L data as CSV format
 * Raffle only - no gumball support
 */
const exportPnLCSV = async (req: Request, res: Response) => {
  try {
    const userAddress = req.user as string;
    const { 
      type = "bought", 
      month, 
      year
    } = req.query;

    if (!userAddress) {
      return responseHandler.error(res, "User not authenticated");
    }

    // Determine date range
    let startDate: Date;
    let endDate = new Date();

    if (month && year) {
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 0);
    } else {
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    }

    let csvData: string[] = [];

    if (type === "bought") {
      // Get raffle purchases only
      const purchases = await prismaClient.transaction.findMany({
        where: {
          sender: userAddress,
          type: "RAFFLE_ENTRY" as any,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          createdAt: true,
          amount: true,
          type: true,
          transactionId: true,
        },
      });

      csvData = ["Date,Transaction ID,Type,Amount (SOL)"];
      purchases.forEach((tx) => {
        csvData.push(
          `${tx.createdAt.toISOString().split("T")[0]},${tx.transactionId},${tx.type},${(Number(tx.amount) / 1e9).toFixed(4)}`
        );
      });
    } else {
      const userRaffles = await prismaClient.raffle.findMany({
        where: {
          createdBy: userAddress,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          createdAt: true,
          ticketSold: true,
          ticketPrice: true,
          floor: true,
          prizeData: {
            select: {
              name: true,
              floor: true,
              amount: true,
            },
          },
        },
      });

      csvData = ["Date,Raffle ID,Prize,Cost (SOL),Revenue (SOL),P&L (SOL)"];
      userRaffles.forEach((raffle) => {
        const cost = raffle.prizeData?.floor || raffle.prizeData?.amount || raffle.floor || 0;
        const revenue = raffle.ticketSold * raffle.ticketPrice;
        const pnl = revenue - cost;
        csvData.push(
          `${raffle.createdAt.toISOString().split("T")[0]},${raffle.id},${raffle.prizeData?.name || "Unknown"},${cost.toFixed(4)},${revenue.toFixed(4)},${pnl.toFixed(4)}`
        );
      });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=pnl_${type}_${startDate.toISOString().split("T")[0]}.csv`);
    res.send(csvData.join("\n"));
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

export default {
  // Leaderboard
  getTopRafflers,
  getTopBuyers,
  getHotCollections,
  // Analytics
  getVolumeAnalytics,
  getDailyRaffles,
  getPurchasesStats,
  getAverageTicketsSold,
  getPlatformStats,
  getUniqueBuyers,
  getRaffleTypesVolume,
  // P&L
  getUserPnLBought,
  getUserPnLSold,
  exportPnLCSV,
};

