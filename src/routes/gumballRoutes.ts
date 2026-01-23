import express from "express";
import gumballController from "../controller/gumballController";
import authMiddleware from "../middleware/authMiddleware";

const gumballRouter = express.Router();

// Public routes
gumballRouter.get("/", gumballController.getGumballs);
gumballRouter.get("/:gumballId", gumballController.getGumballDetails);
gumballRouter.get("/:gumballId/stats", gumballController.getGumballStats);

// Authenticated routes - user specific
gumballRouter.get("/user/gumballs", authMiddleware, gumballController.getGumballsByUser);
gumballRouter.get("/user/spins", authMiddleware, gumballController.getSpinsByUser);

// Authenticated routes - gumball management
gumballRouter.post("/create", authMiddleware, gumballController.createGumball);
gumballRouter.post("/confirm/:gumballId", authMiddleware, gumballController.confirmGumballCreation);
gumballRouter.post("/activate/:gumballId", authMiddleware, gumballController.activateGumball);
gumballRouter.post("/addprize/:gumballId", authMiddleware, gumballController.addPrize);
gumballRouter.post("/addprizes/:gumballId", authMiddleware, gumballController.addMultiplePrizes);
gumballRouter.post("/buyback/:gumballId", authMiddleware, gumballController.updateBuyBackSettings);
gumballRouter.post("/cancel/:gumballId", authMiddleware, gumballController.cancelGumball);
gumballRouter.post("/creator-claim/:gumballId", authMiddleware, gumballController.creatorClaimPrize);
// Authenticated routes - user actions
gumballRouter.get("/prepare-spin/:gumballId", authMiddleware, gumballController.prepareSpin);
gumballRouter.post("/spin/:gumballId", authMiddleware, gumballController.spin);
gumballRouter.post("/claim/:gumballId", authMiddleware, gumballController.claimPrize);

// Delete
gumballRouter.delete("/delete/:gumballId", authMiddleware, gumballController.deleteGumball);

gumballRouter.get("/spin-tx/:gumballId", authMiddleware, gumballController.spinGumballTx);
gumballRouter.get("/claim-tx/:gumballId", authMiddleware, gumballController.claimGumballTx);

export default gumballRouter;
