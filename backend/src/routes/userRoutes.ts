import express from "express";
import userController from "../controller/userController";

const userRouter = express.Router();

userRouter.get("/auth/request-message/:publicKey",userController.requestMessage)
userRouter.post("/auth/verify",userController.verifyMessage);


export default userRouter;
