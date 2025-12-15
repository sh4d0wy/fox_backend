import express from "express";
import userController from "../controller/userController";
import passport from "../config/passportConfig";
import { Session } from "express-session";

const userRouter = express.Router();

userRouter.get("/auth/request-message/:publicKey",userController.requestMessage)
userRouter.post("/auth/verify",userController.verifyMessage);

//Twitter Auth Routes
userRouter.get("/auth/twitter/callback", (req,res,next)=>{
    console.log("request session after callback",req.sessionID);
},passport.authenticate("twitter", {
    failureRedirect: "/api/user/auth/failure",
}), (req, res) => {
    console.log('Auth successful!', req.user);
    res.send(`
        <h1>Authentication Successful!</h1>
        <pre>${JSON.stringify(req.user, null, 2)}</pre>
        <p>You can close this window.</p>
    `);
});

userRouter.get("/auth/failure", (req, res) => {
    res.send(`
        <h1>Authentication Failed</h1>
        <p>Please try again.</p>
        <a href="/api/user/auth/twitter">Retry</a>
    `);
});
userRouter.get("/auth/twitter/:walletAddress",(req, res, next) => {
    if(req.isAuthenticated()){
        return res.send('<h1>Already authenticated</h1>');
    }
    console.log("request session before callback",req.sessionID);
    (req.session as Session & { walletAddress: string }).walletAddress = req.params.walletAddress;
    next();
},passport.authenticate("twitter",{
    scope: ["tweet.read", "users.read","offline.access"],
    session: true,
}));

export default userRouter;
