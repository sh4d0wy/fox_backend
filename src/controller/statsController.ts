import { Request, Response } from "express";
import { responseHandler } from "../utils/resHandler";
import prismaClient from "../database/client";
import logger from "../utils/logger";

type TimeFilter = "all" | "7d" | "30d" | "90d" | "1y";
type LeaderboardType = "rafflers" | "buyers";
type SortField = "volume" | "raffles" | "tickets" | "won";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const NATIVE_SOL_MINT = "native";

const normalizeMint = (mintAddress: string | null | undefined): string => {
  if (!mintAddress || mintAddress === NATIVE_SOL_MINT) return SOL_MINT;
  return mintAddress;
};

const tokenPriceCache = new Map<string, { priceInUsd: number; timestamp: number }>();
const PRICE_CACHE_TTL = 5 * 60 * 1000;

interface RaydiumPriceResponse {
  success: boolean;
  data: Record<string, string>;
}

const fetchTokenPricesInUsd = async (tokenMints: string[]): Promise<Map<string, number>> => {
  const priceMap = new Map<string, number>();
  
  const uncachedMints = tokenMints.filter(mint => {
    if (!mint) {
      return false;
    }
    
    const cached = tokenPriceCache.get(mint);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
      priceMap.set(mint, cached.priceInUsd);
      return false;
    }
    return true;
  });

  if (!priceMap.has(SOL_MINT) && !uncachedMints.includes(SOL_MINT)) {
    const cachedSol = tokenPriceCache.get(SOL_MINT);
    if (cachedSol && Date.now() - cachedSol.timestamp < PRICE_CACHE_TTL) {
      priceMap.set(SOL_MINT, cachedSol.priceInUsd);
    } else {
      uncachedMints.push(SOL_MINT);
    }
  }

  if (uncachedMints.length === 0) {
    return priceMap;
  }

  try {
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
              const priceInUsd = parseFloat(data.data[mint]);
              if (!isNaN(priceInUsd)) {
                priceMap.set(mint, priceInUsd);
                tokenPriceCache.set(mint, {
                  priceInUsd,
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
  const normalized = normalizeMint(mintAddress);
  return normalized === SOL_MINT ? 9 : 6;
};

const toHumanReadable = (amount: bigint | number, decimals: number): number => {
  return Number(amount) / Math.pow(10, decimals);
};

const toUsdEquivalent = (
  amount: number,
  tokenPriceInUsd: number
): number => {
  return amount * tokenPriceInUsd;
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
    
    const tokenPrices = await fetchTokenPricesInUsd(Array.from(allTicketTokens));

    const rafflerStats = rafflers.map((user) => {
      const raffles = user.rafflesCreated;
      const totalRaffles = raffles.length;
      const totalTicketsSold = raffles.reduce((sum, r) => sum + r.ticketSold, 0);
      
      const totalVolume = raffles.reduce((sum, r) => {
        const ticketDecimals = getTokenDecimals(r.ticketTokenAddress);
        const rawVolume = r.ticketSold * r.ticketPrice;
        const humanReadable = toHumanReadable(rawVolume, ticketDecimals);
        const priceInUsd = tokenPrices.get(normalizeMint(r.ticketTokenAddress)) || 0;
        return sum + toUsdEquivalent(humanReadable, priceInUsd);
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
      currency: "USDT",
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
    
    const tokenPrices = await fetchTokenPricesInUsd(Array.from(allTicketTokens));

    const buyerStats = buyers.map((user) => {
      const entries = user.raffleEntries;
      const uniqueRaffles = new Set(entries.map((e) => e.raffle.id)).size;
      const totalTickets = entries.reduce((sum, e) => sum + e.quantity, 0);
      
      const totalVolume = entries.reduce((sum, e) => {
        const ticketDecimals = getTokenDecimals(e.raffle.ticketTokenAddress);
        const rawVolume = e.quantity * e.raffle.ticketPrice;
        const humanReadable = toHumanReadable(rawVolume, ticketDecimals);
        const priceInUsd = tokenPrices.get(normalizeMint(e.raffle.ticketTokenAddress)) || 0;
        return sum + toUsdEquivalent(humanReadable, priceInUsd);
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
      currency: "USDT",
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

    const allTicketTokens = new Set<string>();
    raffles.forEach(r => {
      if (r.ticketTokenAddress) allTicketTokens.add(r.ticketTokenAddress);
    });
    
    const tokenPrices = await fetchTokenPricesInUsd(Array.from(allTicketTokens));

    const collectionMap = new Map<string, { volume: number; count: number }>();

    raffles.forEach((raffle) => {
      const collection = raffle.prizeData?.collection;
      if (collection) {
        const existing = collectionMap.get(collection) || { volume: 0, count: 0 };
        const ticketDecimals = getTokenDecimals(raffle.ticketTokenAddress);
        const rawVolume = raffle.ticketSold * raffle.ticketPrice;
        const humanReadable = toHumanReadable(rawVolume, ticketDecimals);
        const priceInUsd = tokenPrices.get(normalizeMint(raffle.ticketTokenAddress)) || 0;
        const volume = toUsdEquivalent(humanReadable, priceInUsd);
        
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
      currency: "USDT",
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

    const allTokens = new Set<string>();
    transactions.forEach(tx => {
      if (tx.mintAddress) allTokens.add(normalizeMint(tx.mintAddress));
    });
    
    const tokenPrices = await fetchTokenPricesInUsd(Array.from(allTokens));

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
      const tokenDecimals = getTokenDecimals(tx.mintAddress);
      const humanReadableAmount = toHumanReadable(tx.amount, tokenDecimals);
      const priceInUsd = tokenPrices.get(normalizeMint(tx.mintAddress)) || 0;
      const volumeInUsd = toUsdEquivalent(humanReadableAmount, priceInUsd);
      volumeByDate.set(dateKey, existing + volumeInUsd);
    });

    const volumeData: TimeSeriesDataPoint[] = Array.from(volumeByDate.entries())
      .map(([date, valueInUsd]) => ({
        date,
        value: Number(valueInUsd.toFixed(6)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    responseHandler.success(res, {
      message: "Volume analytics fetched successfully",
      timeframe,
      data: volumeData,
      currency: "USDT",
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
    
    // Fetch all token prices in USD
    const tokenPrices = await fetchTokenPricesInUsd(Array.from(allTicketTokens));

    let nftVolumeInUsd = 0;
    let tokenVolumeInUsd = 0;

    raffles.forEach((raffle) => {
      const ticketDecimals = getTokenDecimals(raffle.ticketTokenAddress);
      const rawVolume = raffle.ticketSold * raffle.ticketPrice;
      const humanReadable = toHumanReadable(rawVolume, ticketDecimals);
      const priceInUsd = tokenPrices.get(normalizeMint(raffle.ticketTokenAddress)) || 0;
      const volumeInUsd = toUsdEquivalent(humanReadable, priceInUsd);
      const prizeType = raffle.prizeData?.type;

      if (prizeType === "NFT") {
        nftVolumeInUsd += volumeInUsd;
      } else {
        tokenVolumeInUsd += volumeInUsd;
      }
    });

    const totalVolumeInUsd = nftVolumeInUsd + tokenVolumeInUsd;
    const nftPercentage = totalVolumeInUsd > 0 ? Math.round((nftVolumeInUsd / totalVolumeInUsd) * 100) : 0;
    const tokenPercentage = totalVolumeInUsd > 0 ? Math.round((tokenVolumeInUsd / totalVolumeInUsd) * 100) : 0;

    responseHandler.success(res, {
      message: "Raffle types volume fetched successfully",
      timeframe,
      totalVolume: Number(totalVolumeInUsd.toFixed(6)),
      data: {
        nft: {
          volume: Number(nftVolumeInUsd.toFixed(6)),
          percentage: nftPercentage,
        },
        token: {
          volume: Number(tokenVolumeInUsd.toFixed(6)),
          percentage: tokenPercentage,
        },
      },
      currency: "USDT",
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

    const allTokens = new Set<string>();
    transactions.forEach(tx => {
      if (tx.mintAddress) allTokens.add(normalizeMint(tx.mintAddress));
    });
    
    // Fetch all token prices in USD
    const tokenPrices = await fetchTokenPricesInUsd(Array.from(allTokens));

    // Calculate total volume in USD
    const totalVolumeInUsd = transactions.reduce((sum, tx) => {
      const tokenDecimals = getTokenDecimals(tx.mintAddress);
      const humanReadable = toHumanReadable(tx.amount, tokenDecimals);
      const priceInUsd = tokenPrices.get(normalizeMint(tx.mintAddress)) || 0;
      return sum + toUsdEquivalent(humanReadable, priceInUsd);
    }, 0);

    responseHandler.success(res, {
      message: "Platform stats fetched successfully",
      stats: {
        totalRaffles,
        activeRaffles,
        totalUsers,
        totalTransactions,
        totalVolume: Number(totalVolumeInUsd.toFixed(6)),
      },
      currency: "USDT",
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

    let startDate: Date;
    let endDate = new Date();

    if (timeframe === "daily" && month && year) {
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 0);
    } else if (timeframe === "monthly" && year) {
      startDate = new Date(Number(year), 0, 1);
      endDate = new Date(Number(year), 11, 31);
    } else if (timeframe === "yearly") {
      startDate = new Date(2020, 0, 1); // Start from 2020 or earliest reasonable date
      endDate = new Date();
    } else {
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    }

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
        isNft: true,
        raffle: {
          select: {
            floor: true,
            prizeData: {
              select: {
                type: true,
                floor: true,
                amount: true,
                decimals: true,
              },
            },
          },
        },
      },
    });

    const allTokens = new Set<string>();
    // Always include SOL for NFT floor price conversion
    allTokens.add(SOL_MINT);
    purchases.forEach(tx => { if (tx.mintAddress) allTokens.add(normalizeMint(tx.mintAddress)); });
    winnings.forEach(tx => { if (tx.mintAddress) allTokens.add(normalizeMint(tx.mintAddress)); });
    
    const tokenPrices = await fetchTokenPricesInUsd(Array.from(allTokens));

    const pnlByDate = new Map<string, { spent: number; won: number }>();

    purchases.forEach((tx) => {
      const dateKey = getDateKey(tx.createdAt, timeframe as string);
      const existing = pnlByDate.get(dateKey) || { spent: 0, won: 0 };
      const ticketDecimals = getTokenDecimals(tx.mintAddress);
      const humanReadableAmount = toHumanReadable(tx.amount, ticketDecimals);
      const priceInUsd = tokenPrices.get(normalizeMint(tx.mintAddress)) || 0;
      const amountInUsd = toUsdEquivalent(humanReadableAmount, priceInUsd);
      pnlByDate.set(dateKey, {
        ...existing,
        spent: existing.spent + amountInUsd,
      });
    });

    winnings.forEach((tx) => {
      const dateKey = getDateKey(tx.createdAt, timeframe as string);
      const existing = pnlByDate.get(dateKey) || { spent: 0, won: 0 };
      
      let amountInUsd = 0;
      if (tx.isNft || tx.raffle?.prizeData?.type === "NFT") {
        // For NFT prizes, floor is in lamports, so convert to SOL first then to USD
        const floorInLamports = tx.raffle?.prizeData?.floor || tx.raffle?.floor || 0;
        const floorInSol = toHumanReadable(floorInLamports, 9); // 9 decimals for SOL
        const solPriceInUsd = tokenPrices.get(SOL_MINT) || 0;
        amountInUsd = toUsdEquivalent(floorInSol, solPriceInUsd);
      } else {
        // For token prizes, use the token's price
        const prizeDecimals = getTokenDecimals(tx.mintAddress);
        const humanReadableAmount = toHumanReadable(tx.amount, prizeDecimals);
        const priceInUsd = tokenPrices.get(normalizeMint(tx.mintAddress)) || 0;
        amountInUsd = toUsdEquivalent(humanReadableAmount, priceInUsd);
      }
      
      pnlByDate.set(dateKey, {
        ...existing,
        won: existing.won + amountInUsd,
      });
    });
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
      currency: "USDT",
      timeframe,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

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

    let startDate: Date;
    let endDate = new Date();

    if (timeframe === "daily" && month && year) {
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 0);
    } else if (timeframe === "monthly" && year) {
      startDate = new Date(Number(year), 0, 1);
      endDate = new Date(Number(year), 11, 31);
    } else if (timeframe === "yearly") {
      startDate = new Date(2020, 0, 1); // Start from 2020 or earliest reasonable date
      endDate = new Date();
    } else {
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    }

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
            type: true,
            floor: true,
            amount: true,
            decimals: true,
            mintAddress: true,
          },
        },
      },
    });


    const allTokens = new Set<string>();
    // Always include SOL for NFT floor price conversion
    allTokens.add(SOL_MINT);
    userRaffles.forEach(r => {
      if (r.ticketTokenAddress) allTokens.add(normalizeMint(r.ticketTokenAddress));
      if (r.prizeData?.mintAddress) allTokens.add(normalizeMint(r.prizeData.mintAddress));
    });
    const tokenPrices = await fetchTokenPricesInUsd(Array.from(allTokens));

    const pnlByDate = new Map<string, { cost: number; sold: number }>();

    userRaffles.forEach((raffle) => {
      const dateKey = getDateKey(raffle.createdAt, timeframe as string);
      const existing = pnlByDate.get(dateKey) || { cost: 0, sold: 0 };
      
      let cost = 0;
      if (raffle.prizeData?.type === "NFT") {
        // For NFTs, floor is in lamports, so convert to SOL first then to USD
        const floorInLamports = raffle.prizeData?.floor || raffle.floor || 0;
        const floorInSol = toHumanReadable(floorInLamports, 9); // 9 decimals for SOL
        const solPriceInUsd = tokenPrices.get(SOL_MINT) || 0;
        cost = toUsdEquivalent(floorInSol, solPriceInUsd);
      } else {
        // For tokens, use the token's price
        const rawCost = raffle.prizeData?.amount || 0;
        const prizeTokenMint = normalizeMint(raffle.prizeData?.mintAddress);
        const prizePriceInUsd = tokenPrices.get(prizeTokenMint) || 0;
        const humanReadableCost = toHumanReadable(rawCost, raffle.prizeData?.decimals || 0);
        cost = toUsdEquivalent(humanReadableCost, prizePriceInUsd);
      }
      const sold = toHumanReadable(raffle.ticketSold * raffle.ticketPrice, getTokenDecimals(raffle.ticketTokenAddress));
      const soldInUsd = toUsdEquivalent(sold, tokenPrices.get(normalizeMint(raffle.ticketTokenAddress)) || 0);
      pnlByDate.set(dateKey, {
        cost: existing.cost + cost,
        sold: existing.sold + soldInUsd,
      });
    });
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
      totalCostInUsd: Number(totalCost.toFixed(6)),
      totalSold: Number(totalSold.toFixed(6)),
      pnl: Number(totalPnl.toFixed(6)),
      roi: totalCost > 0 ? `${totalRoi.toFixed(0)}%` : "0%",
    };

    responseHandler.success(res, {
      message: "P&L sold data fetched successfully",
      summary,
      data,
      currency: "USDT",
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

      const allTokens = new Set<string>();
      purchases.forEach(tx => { if (tx.mintAddress) allTokens.add(normalizeMint(tx.mintAddress)); });
      
      const tokenPrices = await fetchTokenPricesInUsd(Array.from(allTokens));

      csvData = ["Date,Transaction ID,Type,Original Token,Original Amount,Amount (USDT)"];
      purchases.forEach((tx) => {
        const tokenDecimals = getTokenDecimals(tx.mintAddress);
        const humanReadableAmount = toHumanReadable(tx.amount, tokenDecimals);
        const priceInUsd = tokenPrices.get(normalizeMint(tx.mintAddress)) || 0;
        const amountInUsd = toUsdEquivalent(humanReadableAmount, priceInUsd);
        const tokenSymbol = normalizeMint(tx.mintAddress) === SOL_MINT ? "SOL" : tx.mintAddress.slice(0, 8) + "...";
        csvData.push(
          `${tx.createdAt.toISOString().split("T")[0]},${tx.transactionId},${tx.type},${tokenSymbol},${humanReadableAmount.toFixed(6)},${amountInUsd.toFixed(6)}`
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
              type: true,
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

      const allTokens = new Set<string>();
      // Always include SOL for NFT floor price conversion
      allTokens.add(SOL_MINT);
      userRaffles.forEach(r => {
        if (r.ticketTokenAddress) allTokens.add(normalizeMint(r.ticketTokenAddress));
        if (r.prizeData?.mintAddress) allTokens.add(normalizeMint(r.prizeData.mintAddress));
      });
      
      const tokenPrices = await fetchTokenPricesInUsd(Array.from(allTokens));

      csvData = ["Date,Raffle ID,Prize,Ticket Token,Prize Token,Cost (USDT),Revenue (USDT),P&L (USDT)"];
      userRaffles.forEach((raffle) => {
        let costInUsd = 0;
        if (raffle.prizeData?.type === "NFT") {
          // For NFTs, floor is in lamports, so convert to SOL first then to USD
          const floorInLamports = raffle.prizeData?.floor || raffle.floor || 0;
          const floorInSol = toHumanReadable(floorInLamports, 9); // 9 decimals for SOL
          const solPriceInUsd = tokenPrices.get(SOL_MINT) || 0;
          costInUsd = toUsdEquivalent(floorInSol, solPriceInUsd);
        } else {
          // For tokens, use the token's price
          const rawCost = raffle.prizeData?.amount || 0;
          const prizeTokenMint = normalizeMint(raffle.prizeData?.mintAddress);
          const prizePriceInUsd = tokenPrices.get(prizeTokenMint) || 0;
          costInUsd = toUsdEquivalent(rawCost, prizePriceInUsd);
        }

        const ticketDecimals = getTokenDecimals(raffle.ticketTokenAddress);
        const rawRevenue = raffle.ticketSold * raffle.ticketPrice;
        const humanReadableRevenue = toHumanReadable(rawRevenue, ticketDecimals);
        const ticketPriceInUsd = tokenPrices.get(normalizeMint(raffle.ticketTokenAddress)) || 0;
        const revenueInUsd = toUsdEquivalent(humanReadableRevenue, ticketPriceInUsd);
        
        const pnlInUsd = revenueInUsd - costInUsd;
        const ticketSymbol = raffle.ticketTokenSymbol || (normalizeMint(raffle.ticketTokenAddress) === SOL_MINT ? "SOL" : "TOKEN");
        const prizeSymbol = raffle.prizeData?.symbol || "NFT";
        
        csvData.push(
          `${raffle.createdAt.toISOString().split("T")[0]},${raffle.id},${raffle.prizeData?.name || "Unknown"},${ticketSymbol},${prizeSymbol},${costInUsd.toFixed(6)},${revenueInUsd.toFixed(6)},${pnlInUsd.toFixed(6)}`
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

