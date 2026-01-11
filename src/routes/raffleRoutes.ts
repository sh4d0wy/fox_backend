import express from "express";
import raffleController from "../controller/raffleController";
import authMiddleware from "../middleware/authMiddleware";

const raffleRouter = express.Router();

raffleRouter.get("/",raffleController.getRaffles);
raffleRouter.get("/rafflebyuser",authMiddleware,raffleController.getRafflesByUser);
raffleRouter.get("/:raffleId",raffleController.getRaffleDetails);
raffleRouter.get("/winners/claim/:raffleId",raffleController.getWinnersClaimedPrizes );

raffleRouter.post("/create",authMiddleware,raffleController.createRaffle);
raffleRouter.post("/confirm/:raffleId",authMiddleware,raffleController.confirmRaffleCreation);
raffleRouter.post("/cancel/:raffleId",authMiddleware,raffleController.cancelRaffle);
raffleRouter.post("/buy/:raffleId",authMiddleware,raffleController.buyTicket);
raffleRouter.post("/claim/:raffleId",authMiddleware,raffleController.claimPrize);
raffleRouter.post("/claim-ticket-amount/:raffleId",authMiddleware,raffleController.claimTicketAmount);

raffleRouter.delete("/delete/:raffleId",authMiddleware,raffleController.deleteRaffle);

raffleRouter.get("/cancel-tx/:raffleId", authMiddleware, raffleController.cancelRaffleTx);
raffleRouter.get("/claim-tx/:raffleId", authMiddleware, raffleController.buyerClaimPrizeTx);
raffleRouter.post("/buy-ticket-tx", authMiddleware, raffleController.buyTicketTx);
raffleRouter.post("/create-tx", authMiddleware, raffleController.createRaffleTx);
raffleRouter.get("/claim-prize-back-tx/:raffleId", authMiddleware, raffleController.claimPrizeBackTx);

export default raffleRouter;