import { Request, Response } from "express";
import { responseHandler } from "../utils/resHandler";
import prismaClient from "../database/client";
import logger from "../utils/logger";

type TimeFilter = "all" | "7d" | "30d" | "90d" | "1y";
type LeaderboardType = "rafflers" | "buyers";
type SortField = "volume" | "raffles" | "tickets" | "won";

const SOL_MINT = "So11111111111111111111111111111111111111112";

const tokenPriceCache = new Map<string, { priceInSol: number; timestamp: number }>();
const PRICE_CACHE_TTL = 5 * 60 * 1000;

interface RaydiumPriceResponse {
  success: boolean;
  data: Record<string, string>;
}

const fetchSolPrice = async (): Promise<number> => {
  try {
    const response = await fetch(
      `https://api-v3.raydium.io/mint/price?mints=${SOL_MINT}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      throw new Error('Raydium API request failed for SOL');
    }

    const data = await response.json() as RaydiumPriceResponse;

    if (data.success && data.data && data.data[SOL_MINT]) {
      const price = parseFloat(data.data[SOL_MINT]);
      if (!isNaN(price)) {
        return price;
      }
    }
    return 0;
  } catch (error) {
    logger.error('Failed to fetch SOL price:', error);
    return 0;
  }
};

const fetchTokenPricesInSol = async (tokenMints: string[]): Promise<Map<string, number>> => {
  const priceMap = new Map<string, number>();
  
  // Filter out SOL and already cached tokens
  const uncachedMints = tokenMints.filter(mint => {
    if (mint === SOL_MINT || mint === "NATIVE_SOL_MINT" || !mint) {
      priceMap.set(mint || SOL_MINT, 1);
      return false;
    }
    
    const cached = tokenPriceCache.get(mint);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
      priceMap.set(mint, cached.priceInSol);
      return false;
    }
    return true;
  });

  if (uncachedMints.length === 0) {
    return priceMap;
  }

  try {
    // Fetch SOL price first
    const solPrice = await fetchSolPrice();
    if (solPrice === 0) {
      // If we can't get SOL price, set all non-SOL tokens to 0
      uncachedMints.forEach(mint => priceMap.set(mint, 0));
      return priceMap;
    }

    // Batch fetch up to 100 mints at a time (Raydium API limit)
    const batchSize = 100;
    for (let i = 0; i < uncachedMints.length; i += batchSize) {
      const batch = uncachedMints.slice(i, i + batchSize);
      const mintsParam = batch.join(',');
      
      const response = await fetch(
        `https://api-v3.raydium.io/mint/price?mints=${mintsParam}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        const data = await response.json() as RaydiumPriceResponse;
        
        if (data.success && data.data) {
          batch.forEach(mint => {
            if (data.data[mint]) {
              const tokenPriceUsd = parseFloat(data.data[mint]);
              if (!isNaN(tokenPriceUsd)) {
                const priceInSol = tokenPriceUsd / solPrice;
                priceMap.set(mint, priceInSol);
                tokenPriceCache.set(mint, {
                  priceInSol,
                  timestamp: Date.now()
                });
              } else {
                priceMap.set(mint, 0);
              }
            } else {
              priceMap.set(mint, 0);
            }
          });
        }
      } else {
        // If batch fails, set all to 0
        batch.forEach(mint => priceMap.set(mint, 0));
      }
    }
  } catch (error) {
    logger.error('Failed to batch fetch token prices:', error);
    uncachedMints.forEach(mint => priceMap.set(mint, 0));
  }

  return priceMap;
};

const getTokenDecimals = (mintAddress: string | null | undefined): number => {
  if (!mintAddress) return 9;
  return (mintAddress===SOL_MINT || mintAddress==="NATIVE_SOL_MINT")? 9 : 6;
};

const toHumanReadable = (amount: bigint | number, decimals: number): number => {
  return Number(amount) / Math.pow(10, decimals);
};

const toSolEquivalent = (
  amount: number,
  tokenPriceInSol: number
): number => {
  return amount * tokenPriceInSol;
};

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
            ticketTokenAddress: true,
            state: true,
          },
        },
      },
    });

    const allTicketTokens = new Set<string>();
    rafflers.forEach(user => {
      user.rafflesCreated.forEach(r => {
        if (r.ticketTokenAddress) allTicketTokens.add(r.ticketTokenAddress);
      });
    });
    
    // Fetch all token prices in SOL
    const tokenPrices = await fetchTokenPricesInSol(Array.from(allTicketTokens));

    const rafflerStats = rafflers.map((user) => {
      const raffles = user.rafflesCreated;
      const totalRaffles = raffles.length;
      const totalTicketsSold = raffles.reduce((sum, r) => sum + r.ticketSold, 0);
      
      // Calculate volume in SOL equivalent
      const totalVolume = raffles.reduce((sum, r) => {
        const ticketDecimals = getTokenDecimals(r.ticketTokenAddress);
        const rawVolume = r.ticketSold * r.ticketPrice;
        const humanReadable = toHumanReadable(rawVolume, ticketDecimals);
        const priceInSol = tokenPrices.get(r.ticketTokenAddress || SOL_MINT) || 1;
        return sum + toSolEquivalent(humanReadable, priceInSol);
      }, 0);

      return {
        walletAddress: user.walletAddress,
        twitterId: user.twitterId,
        raffles: totalRaffles,
        ticketsSold: totalTicketsSold,
        volume: Number(totalVolume.toFixed(6)),
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
      currency: "SOL",
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
                ticketTokenAddress: true,
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

    const allTicketTokens = new Set<string>();
    buyers.forEach(user => {
      user.raffleEntries.forEach(e => {
        if (e.raffle.ticketTokenAddress) allTicketTokens.add(e.raffle.ticketTokenAddress);
      });
    });
    
    const tokenPrices = await fetchTokenPricesInSol(Array.from(allTicketTokens));

    const buyerStats = buyers.map((user) => {
      const entries = user.raffleEntries;
      const uniqueRaffles = new Set(entries.map((e) => e.raffle.id)).size;
      const totalTickets = entries.reduce((sum, e) => sum + e.quantity, 0);
      
      const totalVolume = entries.reduce((sum, e) => {
        const ticketDecimals = getTokenDecimals(e.raffle.ticketTokenAddress);
        const rawVolume = e.quantity * e.raffle.ticketPrice;
        const humanReadable = toHumanReadable(rawVolume, ticketDecimals);
        const priceInSol = tokenPrices.get(e.raffle.ticketTokenAddress || SOL_MINT) || 1;
        return sum + toSolEquivalent(humanReadable, priceInSol);
      }, 0);
      const totalWon = user.raffleWinnings.length;

      return {
        walletAddress: user.walletAddress,
        twitterId: user.twitterId,
        raffles: uniqueRaffles,
        tickets: totalTickets,
        won: totalWon,
        volume: Number(totalVolume.toFixed(6)),
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
      currency: "SOL",
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
      select: {
        ticketSold: true,
        ticketPrice: true,
        ticketTokenAddress: true,
        prizeData: {
          select: {
            collection: true,
          },
        },
      },
    });

    // Collect all unique ticket token addresses to batch fetch prices
    const allTicketTokens = new Set<string>();
    raffles.forEach(r => {
      if (r.ticketTokenAddress) allTicketTokens.add(r.ticketTokenAddress);
    });
    
    // Fetch all token prices in SOL
    const tokenPrices = await fetchTokenPricesInSol(Array.from(allTicketTokens));

    const collectionMap = new Map<string, { volume: number; count: number }>();

    raffles.forEach((raffle) => {
      const collection = raffle.prizeData?.collection;
      if (collection) {
        const existing = collectionMap.get(collection) || { volume: 0, count: 0 };
        const ticketDecimals = getTokenDecimals(raffle.ticketTokenAddress);
        const rawVolume = raffle.ticketSold * raffle.ticketPrice;
        const humanReadable = toHumanReadable(rawVolume, ticketDecimals);
        const priceInSol = tokenPrices.get(raffle.ticketTokenAddress || SOL_MINT) || 1;
        const volume = toSolEquivalent(humanReadable, priceInSol);
        
        collectionMap.set(collection, {
          volume: existing.volume + volume,
          count: existing.count + 1,
        });
      }
    });

    const collections = Array.from(collectionMap.entries())
      .map(([name, data]) => ({
        collection: name,
        volume: Number(data.volume.toFixed(6)),
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
      currency: "SOL",
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

interface CountDataPoint {
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

    // Use transactions directly - amount field already contains quantity * ticketPrice
    const transactions = await prismaClient.transaction.findMany({
      where: {
        createdAt: { gte: startDate },
        type: "RAFFLE_ENTRY",
      },
      select: {
        createdAt: true,
        amount: true,
        mintAddress: true,
      },
    });

    // Collect all unique token addresses to batch fetch prices
    const allTokens = new Set<string>();
    transactions.forEach(tx => {
      if (tx.mintAddress) allTokens.add(tx.mintAddress);
    });
    
    // Fetch all token prices in SOL
    const tokenPrices = await fetchTokenPricesInSol(Array.from(allTokens));

    const volumeByDate = new Map<string, number>();

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

      const existing = volumeByDate.get(dateKey) || 0;
      // amount is already quantity * ticketPrice (stored as BigInt in raw token units)
      const tokenDecimals = getTokenDecimals(tx.mintAddress);
      const humanReadableAmount = toHumanReadable(tx.amount, tokenDecimals);
      const priceInSol = tokenPrices.get(tx.mintAddress || SOL_MINT) || 1;
      const volumeInSol = toSolEquivalent(humanReadableAmount, priceInSol);
      volumeByDate.set(dateKey, existing + volumeInSol);
    });

    const volumeData: TimeSeriesDataPoint[] = Array.from(volumeByDate.entries())
      .map(([date, valueInSol]) => ({
        date,
        value: Number(valueInSol.toFixed(6)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    responseHandler.success(res, {
      message: "Volume analytics fetched successfully",
      timeframe,
      data: volumeData,
      currency: "SOL",
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

    const data: CountDataPoint[] = [];
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

    const data: CountDataPoint[] = Array.from(buyersByDate.entries())
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
        ticketTokenAddress: true,
        prizeData: {
          select: {
            type: true,
          },
        },
      },
    });

    // Collect all unique ticket token addresses to batch fetch prices
    const allTicketTokens = new Set<string>();
    raffles.forEach(r => {
      if (r.ticketTokenAddress) allTicketTokens.add(r.ticketTokenAddress);
    });
    
    // Fetch all token prices in SOL
    const tokenPrices = await fetchTokenPricesInSol(Array.from(allTicketTokens));

    let nftVolumeInSol = 0;
    let tokenVolumeInSol = 0;

    raffles.forEach((raffle) => {
      const ticketDecimals = getTokenDecimals(raffle.ticketTokenAddress);
      const rawVolume = raffle.ticketSold * raffle.ticketPrice;
      const humanReadable = toHumanReadable(rawVolume, ticketDecimals);
      const priceInSol = tokenPrices.get(raffle.ticketTokenAddress || SOL_MINT) || 1;
      const volumeInSol = toSolEquivalent(humanReadable, priceInSol);
      const prizeType = raffle.prizeData?.type;

      if (prizeType === "NFT") {
        nftVolumeInSol += volumeInSol;
      } else {
        tokenVolumeInSol += volumeInSol;
      }
    });

    const totalVolumeInSol = nftVolumeInSol + tokenVolumeInSol;
    const nftPercentage = totalVolumeInSol > 0 ? Math.round((nftVolumeInSol / totalVolumeInSol) * 100) : 0;
    const tokenPercentage = totalVolumeInSol > 0 ? Math.round((tokenVolumeInSol / totalVolumeInSol) * 100) : 0;

    responseHandler.success(res, {
      message: "Raffle types volume fetched successfully",
      timeframe,
      totalVolume: Number(totalVolumeInSol.toFixed(6)),
      data: {
        nft: {
          volume: Number(nftVolumeInSol.toFixed(6)),
          percentage: nftPercentage,
        },
        token: {
          volume: Number(tokenVolumeInSol.toFixed(6)),
          percentage: tokenPercentage,
        },
      },
      currency: "SOL",
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

    // Get all transactions with their mint addresses to calculate volume with proper decimals
    const transactions = await prismaClient.transaction.findMany({
      where: {
        type: { in: ["RAFFLE_ENTRY", "GUMBALL_SPIN"] },
      },
      select: {
        amount: true,
        mintAddress: true,
      },
    });

    // Collect all unique token addresses to batch fetch prices
    const allTokens = new Set<string>();
    transactions.forEach(tx => {
      if (tx.mintAddress) allTokens.add(tx.mintAddress);
    });
    
    // Fetch all token prices in SOL
    const tokenPrices = await fetchTokenPricesInSol(Array.from(allTokens));

    // Calculate total volume in SOL
    const totalVolumeInSol = transactions.reduce((sum, tx) => {
      const tokenDecimals = getTokenDecimals(tx.mintAddress);
      const humanReadable = toHumanReadable(tx.amount, tokenDecimals);
      const priceInSol = tokenPrices.get(tx.mintAddress || SOL_MINT) || 1;
      return sum + toSolEquivalent(humanReadable, priceInSol);
    }, 0);

    responseHandler.success(res, {
      message: "Platform stats fetched successfully",
      stats: {
        totalRaffles,
        activeRaffles,
        totalUsers,
        totalTransactions,
        totalVolume: Number(totalVolumeInSol.toFixed(6)),
      },
      currency: "SOL",
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
      year
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

    // Get purchases (spent) - Raffle only, with mint address for proper decimal conversion
    const purchases = await prismaClient.transaction.findMany({
      where: {
        sender: userAddress,
        type: "RAFFLE_ENTRY" as any,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        amount: true,
        mintAddress: true,
      },
    });

    // Get winnings - Raffle only, with mint address for proper decimal conversion
    const winnings = await prismaClient.transaction.findMany({
      where: {
        sender: userAddress,
        type: "RAFFLE_CLAIM" as any,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        amount: true,
        mintAddress: true,
      },
    });

    // Collect all unique token addresses to batch fetch prices
    const allTokens = new Set<string>();
    purchases.forEach(tx => { if (tx.mintAddress) allTokens.add(tx.mintAddress); });
    winnings.forEach(tx => { if (tx.mintAddress) allTokens.add(tx.mintAddress); });
    
    // Fetch all token prices in SOL
    const tokenPrices = await fetchTokenPricesInSol(Array.from(allTokens));

    // Group by date key based on timeframe
    const pnlByDate = new Map<string, { spent: number; won: number }>();

    purchases.forEach((tx) => {
      const dateKey = getDateKey(tx.createdAt, timeframe as string);
      const existing = pnlByDate.get(dateKey) || { spent: 0, won: 0 };
      const ticketDecimals = getTokenDecimals(tx.mintAddress);
      const humanReadableAmount = toHumanReadable(tx.amount, ticketDecimals);
      const priceInSol = tokenPrices.get(tx.mintAddress || SOL_MINT) || 1;
      const amountInSol = toSolEquivalent(humanReadableAmount, priceInSol);
      pnlByDate.set(dateKey, {
        ...existing,
        spent: existing.spent + amountInSol,
      });
    });

    winnings.forEach((tx) => {
      const dateKey = getDateKey(tx.createdAt, timeframe as string);
      const existing = pnlByDate.get(dateKey) || { spent: 0, won: 0 };
      const prizeDecimals = getTokenDecimals(tx.mintAddress);
      const humanReadableAmount = toHumanReadable(tx.amount, prizeDecimals);
      const priceInSol = tokenPrices.get(tx.mintAddress || SOL_MINT) || 1;
      const amountInSol = toSolEquivalent(humanReadableAmount, priceInSol);
      pnlByDate.set(dateKey, {
        ...existing,
        won: existing.won + amountInSol,
      });
    });

    // Convert to array with P&L calculations (all in SOL)
    const data = Array.from(pnlByDate.entries())
      .map(([date, values]) => {
        const spent = values.spent;
        const won = values.won;
        const pnl = won - spent;
        const roi = spent > 0 ? ((won - spent) / spent) * 100 : 0;

        return {
          date,
          spent: Number(spent.toFixed(6)),
          won: Number(won.toFixed(6)),
          pnl: Number(pnl.toFixed(6)),
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
      totalSpent: Number(totalSpent.toFixed(6)),
      totalWon: Number(totalWon.toFixed(6)),
      pnl: Number(totalPnl.toFixed(6)),
      roi: totalSpent > 0 ? `${totalRoi.toFixed(0)}%` : "0%",
    };

    responseHandler.success(res, {
      message: "P&L bought data fetched successfully",
      summary,
      data,
      currency: "SOL",
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
      year
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
        ticketTokenAddress: true,
        floor: true,
        prizeData: {
          select: {
            floor: true,
            amount: true,
            decimals: true,
            mintAddress: true,
          },
        },
      },
    });

    // Collect all unique token addresses to batch fetch prices
    const allTokens = new Set<string>();
    userRaffles.forEach(r => {
      if (r.ticketTokenAddress) allTokens.add(r.ticketTokenAddress);
      if (r.prizeData?.mintAddress) allTokens.add(r.prizeData.mintAddress);
    });
    
    // Fetch all token prices in SOL
    const tokenPrices = await fetchTokenPricesInSol(Array.from(allTokens));

    // Group by date key based on timeframe
    const pnlByDate = new Map<string, { cost: number; sold: number }>();

    userRaffles.forEach((raffle) => {
      const dateKey = getDateKey(raffle.createdAt, timeframe as string);
      const existing = pnlByDate.get(dateKey) || { cost: 0, sold: 0 };
      
      // Prize cost - floor and amount are stored as human-readable Float values
      // Convert to SOL using prize token price
      const rawCost = raffle.prizeData?.floor || raffle.prizeData?.amount || raffle.floor || 0;
      const prizeTokenMint = raffle.prizeData?.mintAddress || SOL_MINT;
      const prizePriceInSol = tokenPrices.get(prizeTokenMint) || 1;
      const cost = toSolEquivalent(rawCost, prizePriceInSol);
      
      // Revenue from ticket sales - use ticket token decimals and convert to SOL
      const ticketDecimals = getTokenDecimals(raffle.ticketTokenAddress);
      const rawSold = raffle.ticketSold * raffle.ticketPrice;
      const humanReadableSold = toHumanReadable(rawSold, ticketDecimals);
      const ticketPriceInSol = tokenPrices.get(raffle.ticketTokenAddress || SOL_MINT) || 1;
      const soldInSol = toSolEquivalent(humanReadableSold, ticketPriceInSol);

      pnlByDate.set(dateKey, {
        cost: existing.cost + cost,
        sold: existing.sold + soldInSol,
      });
    });

    // Convert to array with P&L calculations (all in SOL)
    const data = Array.from(pnlByDate.entries())
      .map(([date, values]) => {
        const pnl = values.sold - values.cost;
        const roi = values.cost > 0 ? ((values.sold - values.cost) / values.cost) * 100 : 0;

        return {
          date,
          cost: Number(values.cost.toFixed(6)),
          sold: Number(values.sold.toFixed(6)),
          pnl: Number(pnl.toFixed(6)),
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
      totalCostInSol: Number(totalCost.toFixed(6)),
      totalSold: Number(totalSold.toFixed(6)),
      pnl: Number(totalPnl.toFixed(6)),
      roi: totalCost > 0 ? `${totalRoi.toFixed(0)}%` : "0%",
    };

    responseHandler.success(res, {
      message: "P&L sold data fetched successfully",
      summary,
      data,
      currency: "SOL",
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
      // Get raffle purchases only with mint address for proper decimal conversion
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
          mintAddress: true,
        },
      });

      // Collect all unique token addresses to batch fetch prices
      const allTokens = new Set<string>();
      purchases.forEach(tx => { if (tx.mintAddress) allTokens.add(tx.mintAddress); });
      
      // Fetch all token prices in SOL
      const tokenPrices = await fetchTokenPricesInSol(Array.from(allTokens));

      csvData = ["Date,Transaction ID,Type,Original Token,Original Amount,Amount (SOL)"];
      purchases.forEach((tx) => {
        const tokenDecimals = getTokenDecimals(tx.mintAddress);
        const humanReadableAmount = toHumanReadable(tx.amount, tokenDecimals);
        const priceInSol = tokenPrices.get(tx.mintAddress || SOL_MINT) || 1;
        const amountInSol = toSolEquivalent(humanReadableAmount, priceInSol);
        const tokenSymbol = tx.mintAddress === SOL_MINT ? "SOL" : tx.mintAddress.slice(0, 8) + "...";
        csvData.push(
          `${tx.createdAt.toISOString().split("T")[0]},${tx.transactionId},${tx.type},${tokenSymbol},${humanReadableAmount.toFixed(6)},${amountInSol.toFixed(6)}`
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
          ticketTokenAddress: true,
          ticketTokenSymbol: true,
          floor: true,
          prizeData: {
            select: {
              name: true,
              floor: true,
              amount: true,
              decimals: true,
              symbol: true,
              mintAddress: true,
            },
          },
        },
      });

      // Collect all unique token addresses to batch fetch prices
      const allTokens = new Set<string>();
      userRaffles.forEach(r => {
        if (r.ticketTokenAddress) allTokens.add(r.ticketTokenAddress);
        if (r.prizeData?.mintAddress) allTokens.add(r.prizeData.mintAddress);
      });
      
      // Fetch all token prices in SOL
      const tokenPrices = await fetchTokenPricesInSol(Array.from(allTokens));

      csvData = ["Date,Raffle ID,Prize,Ticket Token,Prize Token,Cost (SOL),Revenue (SOL),P&L (SOL)"];
      userRaffles.forEach((raffle) => {
        // Prize cost - floor/amount are stored as human-readable Float values, convert to SOL
        const rawCost = raffle.prizeData?.floor || raffle.prizeData?.amount || raffle.floor || 0;
        const prizeTokenMint = raffle.prizeData?.mintAddress || SOL_MINT;
        const prizePriceInSol = tokenPrices.get(prizeTokenMint) || 1;
        const costInSol = toSolEquivalent(rawCost, prizePriceInSol);
        
        // Revenue from ticket sales - use ticket token decimals and convert to SOL
        const ticketDecimals = getTokenDecimals(raffle.ticketTokenAddress);
        const rawRevenue = raffle.ticketSold * raffle.ticketPrice;
        const humanReadableRevenue = toHumanReadable(rawRevenue, ticketDecimals);
        const ticketPriceInSol = tokenPrices.get(raffle.ticketTokenAddress || SOL_MINT) || 1;
        const revenueInSol = toSolEquivalent(humanReadableRevenue, ticketPriceInSol);
        
        const pnlInSol = revenueInSol - costInSol;
        const ticketSymbol = raffle.ticketTokenSymbol || (raffle.ticketTokenAddress === SOL_MINT ? "SOL" : "TOKEN");
        const prizeSymbol = raffle.prizeData?.symbol || "NFT";
        
        csvData.push(
          `${raffle.createdAt.toISOString().split("T")[0]},${raffle.id},${raffle.prizeData?.name || "Unknown"},${ticketSymbol},${prizeSymbol},${costInSol.toFixed(6)},${revenueInSol.toFixed(6)},${pnlInSol.toFixed(6)}`
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

