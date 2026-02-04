import express from "express";
import statsController from "../controller/statsController";
import authMiddleware from "../middleware/authMiddleware";

const statsRouter = express.Router();

// ==================== LEADERBOARD ROUTES ====================

statsRouter.get("/leaderboard/rafflers", statsController.getTopRafflers);
statsRouter.get("/leaderboard/buyers", statsController.getTopBuyers);
statsRouter.get("/leaderboard/collections", statsController.getHotCollections);

// ==================== ANALYTICS ROUTES ====================

statsRouter.get("/analytics/volume", statsController.getVolumeAnalytics);
statsRouter.get("/analytics/raffles", statsController.getDailyRaffles);
statsRouter.get("/analytics/purchases", statsController.getPurchasesStats);
statsRouter.get("/analytics/tickets", statsController.getAverageTicketsSold);
statsRouter.get("/analytics/platform", statsController.getPlatformStats);
statsRouter.get("/analytics/unique-buyers", statsController.getUniqueBuyers);
statsRouter.get("/analytics/raffle-types", statsController.getRaffleTypesVolume);

// ==================== P&L (Profit & Loss) ROUTES ====================

statsRouter.get("/pnl/bought", authMiddleware, statsController.getUserPnLBought);
statsRouter.get("/pnl/sold", authMiddleware, statsController.getUserPnLSold);
statsRouter.get("/pnl/export", authMiddleware, statsController.exportPnLCSV);

export default statsRouter;

