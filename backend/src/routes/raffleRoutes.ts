import express from "express";
import raffleController from "../controller/raffleController";
import authMiddleware from "../middleware/authMiddleware";

const raffleRouter = express.Router();

raffleRouter.get("/",raffleController.getRaffles);
raffleRouter.get("/rafflebyuser",authMiddleware,raffleController.getRafflesByUser);
raffleRouter.get("/:raffleId",raffleController.getRaffleDetails);

raffleRouter.post("/create",authMiddleware,raffleController.createRaffle);
raffleRouter.post("/confirm/:raffleId",authMiddleware,raffleController.confirmRaffleCreation);

export default raffleRouter;