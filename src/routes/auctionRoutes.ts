import express from "express";
import auctionController from "../controller/auctionController";
import authMiddleware from "../middleware/authMiddleware";

const auctionRouter = express.Router();

auctionRouter.get("/", auctionController.getAuctions);
auctionRouter.get("/auctionbyuser", authMiddleware, auctionController.getAuctionsByUser);
auctionRouter.get("/bidsbyuser", authMiddleware, auctionController.getBidsByUser);
auctionRouter.get("/:auctionId", auctionController.getAuctionDetails);

auctionRouter.post("/create", authMiddleware, auctionController.createAuction);
auctionRouter.post("/cancel/:auctionId", authMiddleware, auctionController.cancelAuction);
auctionRouter.post("/bid/:auctionId", authMiddleware, auctionController.placeBid);
auctionRouter.post("/claim/:auctionId", authMiddleware, auctionController.claimAuction);

auctionRouter.delete("/delete/:auctionId", authMiddleware, auctionController.deleteAuction);

auctionRouter.post("/create-tx", authMiddleware, auctionController.createAuctionTx);
auctionRouter.get("/cancel-tx/:auctionId", authMiddleware, auctionController.cancelAuctionTx);
auctionRouter.post("/bid-tx/", authMiddleware, auctionController.placeBidAuctionTx);

export default auctionRouter;

