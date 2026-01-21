import express from "express";
import notificationController from "../controller/notificationController";
import authMiddleware from "../middleware/authMiddleware";

const notificationRouter = express.Router();

notificationRouter.get("/winnings", authMiddleware, notificationController.getRecentWinnings);
notificationRouter.get("/ended-raffles", authMiddleware, notificationController.getEndedCreatedRaffles);

export default notificationRouter;

