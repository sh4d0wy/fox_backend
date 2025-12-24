import express from "express";
import statsController from "../controller/statsController";
import authMiddleware from "../middleware/authMiddleware";

const statsRouter = express.Router();

// ==================== LEADERBOARD ROUTES ====================

/**
 * GET /api/stats/leaderboard/rafflers
 * Get top rafflers (creators) leaderboard
 * Query params: timeFilter (all|7d|30d|90d|1y), sortBy (volume|raffles|tickets), limit, page
 */
statsRouter.get("/leaderboard/rafflers", statsController.getTopRafflers);

/**
 * GET /api/stats/leaderboard/buyers
 * Get top buyers leaderboard
 * Query params: timeFilter (all|7d|30d|90d|1y), sortBy (volume|raffles|tickets|won), limit, page
 */
statsRouter.get("/leaderboard/buyers", statsController.getTopBuyers);

/**
 * GET /api/stats/leaderboard/collections
 * Get hot collections (7 day trending)
 * Query params: limit
 */
statsRouter.get("/leaderboard/collections", statsController.getHotCollections);

// ==================== ANALYTICS ROUTES ====================

/**
 * GET /api/stats/analytics/volume
 * Get volume analytics over time
 * Query params: timeframe (day|week|month|year)
 */
statsRouter.get("/analytics/volume", statsController.getVolumeAnalytics);

/**
 * GET /api/stats/analytics/raffles
 * Get daily raffles count
 * Query params: days (default: 7)
 */
statsRouter.get("/analytics/raffles", statsController.getDailyRaffles);

/**
 * GET /api/stats/analytics/purchases
 * Get purchases statistics (tickets sold & transactions count)
 * Query params: days (default: 7)
 */
statsRouter.get("/analytics/purchases", statsController.getPurchasesStats);

/**
 * GET /api/stats/analytics/tickets
 * Get average tickets sold per raffle
 * Query params: timeframe (week|month|year)
 */
statsRouter.get("/analytics/tickets", statsController.getAverageTicketsSold);

/**
 * GET /api/stats/analytics/platform
 * Get overall platform statistics
 */
statsRouter.get("/analytics/platform", statsController.getPlatformStats);

// ==================== P&L (Profit & Loss) ROUTES ====================

/**
 * GET /api/stats/pnl/bought
 * Get P&L for authenticated user (bought side - tickets purchased vs prizes won)
 * Query params: timeframe (daily|monthly|yearly), month, year, currency (USD|SOL), service (raffle|gumball|all)
 * Requires authentication
 */
statsRouter.get("/pnl/bought", authMiddleware, statsController.getUserPnLBought);

/**
 * GET /api/stats/pnl/sold
 * Get P&L for authenticated user (sold side - for raffle creators)
 * Query params: timeframe (daily|monthly|yearly), month, year, currency (USD|SOL), service (raffle|gumball|all)
 * Requires authentication
 */
statsRouter.get("/pnl/sold", authMiddleware, statsController.getUserPnLSold);

/**
 * GET /api/stats/pnl/export
 * Export P&L data as CSV
 * Query params: type (bought|sold), month, year, service (raffle|gumball|all)
 * Requires authentication
 */
statsRouter.get("/pnl/export", authMiddleware, statsController.exportPnLCSV);

export default statsRouter;

