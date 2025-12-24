import { Request, Response } from "express";
import { responseHandler } from "../utils/resHandler";
import prismaClient from "../database/client";
import logger from "../utils/logger";

// leaderboard

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

// top rafflers (creators) leaderboard
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

    // Get raffles with aggregated data
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

    // Calculate stats for each raffler
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

    // Sort based on sortBy parameter
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

// top buyers leaderboard
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

    // Get users with their entries and winnings
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

    // Calculate stats for each buyer
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

    // Sort based on sortBy parameter
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

    // Paginate and add rank
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

// hot collections (7 day trending)
const getHotCollections = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get raffles from last 7 days with collection data
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

    // Aggregate by collection
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

    // Convert to array and sort by volume
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

// volume analytics over time
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

    // Get all transactions in the timeframe
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

    // Group by date
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

    // Convert to array and sort by date
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

// daily raffles count
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

    // Group by date
    const rafflesByDate = new Map<string, number>();

    raffles.forEach((raffle) => {
      const date = raffle.createdAt;
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      rafflesByDate.set(dateKey, (rafflesByDate.get(dateKey) || 0) + 1);
    });

    // Fill missing dates with 0
    const data: TimeSeriesDataPoint[] = [];
    for (let i = 0; i < Number(days); i++) {
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

// purchases stats (tickets sold & transactions)
const getPurchasesStats = async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

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

    // Group by date
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

    // Fill missing dates and convert to array
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

// average tickets sold per raffle
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

    // Group by date
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

    // Calculate percentage sold
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

//overall platform stats
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

    // Get total volume
    const volumeResult = await prismaClient.transaction.aggregate({
      where: {
        type: { in: ["RAFFLE_ENTRY", "GUMBALL_SPIN"] },
      },
      _sum: {
        amount: true,
      },
    });

    const totalVolume = Number(volumeResult._sum.amount || 0) / 1e9; // Convert to SOL

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
type ServiceType = "raffle" | "gumball" | "all";

/**
 * Get P&L for a user (bought side - tickets purchased vs prizes won)
 */
const getUserPnLBought = async (req: Request, res: Response) => {
  try {
    const userAddress = req.user as string;
    const { 
      timeframe = "daily", 
      month, 
      year,
      currency = "SOL",
      service = "all"
    } = req.query;

    if (!userAddress) {
      return responseHandler.error(res, "User not authenticated");
    }

    // Determine date range
    let startDate: Date;
    let endDate = new Date();

    if (timeframe === "monthly" && month && year) {
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 0);
    } else if (timeframe === "yearly" && year) {
      startDate = new Date(Number(year), 0, 1);
      endDate = new Date(Number(year), 11, 31);
    } else {
      // Default to current month
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    }

    // Build transaction type filter based on service
    let typeFilter: string[] = [];
    if (service === "raffle" || service === "all") {
      typeFilter.push("RAFFLE_ENTRY");
    }
    if (service === "gumball" || service === "all") {
      typeFilter.push("GUMBALL_SPIN");
    }

    // Get purchases (spent)
    const purchases = await prismaClient.transaction.findMany({
      where: {
        sender: userAddress,
        type: { in: typeFilter as any },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        amount: true,
        type: true,
      },
    });

    // Get winnings
    const winTypeFilter: string[] = [];
    if (service === "raffle" || service === "all") {
      winTypeFilter.push("RAFFLE_CLAIM");
    }
    if (service === "gumball" || service === "all") {
      winTypeFilter.push("GUMBALL_CLAIM_PRIZE");
    }

    const winnings = await prismaClient.transaction.findMany({
      where: {
        sender: userAddress,
        type: { in: winTypeFilter as any },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        amount: true,
        type: true,
      },
    });

    // Group by date
    const pnlByDate = new Map<string, { spent: bigint; won: bigint }>();

    purchases.forEach((tx) => {
      const dateKey = tx.createdAt.toISOString().split("T")[0];
      const existing = pnlByDate.get(dateKey) || { spent: BigInt(0), won: BigInt(0) };
      pnlByDate.set(dateKey, {
        ...existing,
        spent: existing.spent + tx.amount,
      });
    });

    winnings.forEach((tx) => {
      const dateKey = tx.createdAt.toISOString().split("T")[0];
      const existing = pnlByDate.get(dateKey) || { spent: BigInt(0), won: BigInt(0) };
      pnlByDate.set(dateKey, {
        ...existing,
        won: existing.won + tx.amount,
      });
    });

    // Convert to array with P&L calculations
    const dailyData = Array.from(pnlByDate.entries())
      .map(([date, data]) => {
        const spent = Number(data.spent) / 1e9;
        const won = Number(data.won) / 1e9;
        const pnl = won - spent;
        const roi = spent > 0 ? ((won - spent) / spent) * 100 : 0;

        return {
          date,
          spent: Number(spent.toFixed(2)),
          won: Number(won.toFixed(2)),
          pnl: Number(pnl.toFixed(2)),
          roi: `${roi.toFixed(0)}%`,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // Calculate monthly totals
    const totalSpent = dailyData.reduce((sum, d) => sum + d.spent, 0);
    const totalWon = dailyData.reduce((sum, d) => sum + d.won, 0);
    const totalPnl = totalWon - totalSpent;
    const totalRoi = totalSpent > 0 ? ((totalWon - totalSpent) / totalSpent) * 100 : 0;

    const monthSummary = {
      month: `${startDate.toLocaleString("default", { month: "short" })} '${String(startDate.getFullYear()).slice(2)}`,
      totalSpent: Number(totalSpent.toFixed(2)),
      totalWon: Number(totalWon.toFixed(2)),
      pnl: Number(totalPnl.toFixed(2)),
      roi: totalSpent > 0 ? `${totalRoi.toFixed(0)}%` : "0%",
    };

    responseHandler.success(res, {
      message: "P&L bought data fetched successfully",
      summary: monthSummary,
      daily: dailyData,
      currency,
      timeframe,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

// pnl for user
const getUserPnLSold = async (req: Request, res: Response) => {
  try {
    const userAddress = req.user as string;
    const { 
      timeframe = "daily", 
      month, 
      year,
      currency = "SOL",
      service = "all"
    } = req.query;

    if (!userAddress) {
      return responseHandler.error(res, "User not authenticated");
    }

    // Determine date range
    let startDate: Date;
    let endDate = new Date();

    if (timeframe === "monthly" && month && year) {
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 0);
    } else if (timeframe === "yearly" && year) {
      startDate = new Date(Number(year), 0, 1);
      endDate = new Date(Number(year), 11, 31);
    } else {
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

    // Group by date
    const pnlByDate = new Map<string, { cost: number; sold: number }>();

    userRaffles.forEach((raffle) => {
      const dateKey = raffle.createdAt.toISOString().split("T")[0];
      const existing = pnlByDate.get(dateKey) || { cost: 0, sold: 0 };
      
      const cost = raffle.prizeData?.floor || raffle.prizeData?.amount || raffle.floor || 0;
      const sold = raffle.ticketSold * raffle.ticketPrice;

      pnlByDate.set(dateKey, {
        cost: existing.cost + cost,
        sold: existing.sold + sold,
      });
    });

    // Convert to array with P&L calculations
    const dailyData = Array.from(pnlByDate.entries())
      .map(([date, data]) => {
        const pnl = data.sold - data.cost;
        const roi = data.cost > 0 ? ((data.sold - data.cost) / data.cost) * 100 : 0;

        return {
          date,
          cost: Number(data.cost.toFixed(2)),
          sold: Number(data.sold.toFixed(2)),
          pnl: Number(pnl.toFixed(2)),
          roi: `${roi.toFixed(0)}%`,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // Calculate monthly totals
    const totalCost = dailyData.reduce((sum, d) => sum + d.cost, 0);
    const totalSold = dailyData.reduce((sum, d) => sum + d.sold, 0);
    const totalPnl = totalSold - totalCost;
    const totalRoi = totalCost > 0 ? ((totalSold - totalCost) / totalCost) * 100 : 0;

    const monthSummary = {
      month: `${startDate.toLocaleString("default", { month: "short" })} '${String(startDate.getFullYear()).slice(2)}`,
      totalCost: Number(totalCost.toFixed(2)),
      totalSold: Number(totalSold.toFixed(2)),
      pnl: Number(totalPnl.toFixed(2)),
      roi: totalCost > 0 ? `${totalRoi.toFixed(0)}%` : "0%",
    };

    responseHandler.success(res, {
      message: "P&L sold data fetched successfully",
      summary: monthSummary,
      daily: dailyData,
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
 */
const exportPnLCSV = async (req: Request, res: Response) => {
  try {
    const userAddress = req.user as string;
    const { 
      type = "bought", 
      month, 
      year,
      service = "all"
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
      // Build transaction type filter based on service
      let typeFilter: string[] = [];
      if (service === "raffle" || service === "all") {
        typeFilter.push("RAFFLE_ENTRY");
      }
      if (service === "gumball" || service === "all") {
        typeFilter.push("GUMBALL_SPIN");
      }

      const purchases = await prismaClient.transaction.findMany({
        where: {
          sender: userAddress,
          type: { in: typeFilter as any },
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
  // P&L
  getUserPnLBought,
  getUserPnLSold,
  exportPnLCSV,
};

