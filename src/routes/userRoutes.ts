import express from "express";
import userController from "../controller/userController";
import passport from "../config/passportConfig";
import { Session } from "express-session";
import authMiddleware from "../middleware/authMiddleware";
import { profileImageUpload } from "../config/multerConfig";

const userRouter = express.Router();

userRouter.get("/auth/request-message/:publicKey",userController.requestMessage)
userRouter.post("/auth/verify",userController.verifyMessage);
userRouter.post("/auth/refresh",userController.refreshToken);

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


userRouter.get("/profile/me", authMiddleware, userController.getMyProfile);

userRouter.patch(
  "/profile/image",
  authMiddleware,
  profileImageUpload.single("profileImage"),
  userController.updateProfileImage
);

userRouter.get("/profile/:walletAddress", userController.getProfile);

userRouter.get("/profile/:walletAddress/raffles/created", userController.getRafflesCreated);

userRouter.get("/profile/:walletAddress/raffles/purchased", userController.getRafflesPurchased);

userRouter.get("/profile/:walletAddress/raffles/favourites", userController.getFavouriteRaffles);

userRouter.get("/profile/:walletAddress/raffles/stats", userController.getRaffleStats);

userRouter.get("/profile/:walletAddress/auctions/created", userController.getAuctionsCreated);

userRouter.get("/profile/:walletAddress/auctions/participated", userController.getAuctionsParticipated);

userRouter.get("/profile/:walletAddress/auctions/favourites", userController.getFavouriteAuctions);

userRouter.get("/profile/:walletAddress/auctions/stats", userController.getAuctionStats);

userRouter.get("/profile/:walletAddress/gumballs/created", userController.getGumballsCreated);

userRouter.get("/profile/:walletAddress/gumballs/purchased", userController.getGumballsPurchased);

userRouter.get("/profile/:walletAddress/gumballs/favourites", userController.getFavouriteGumballs);

userRouter.get("/profile/:walletAddress/gumballs/stats", userController.getGumballStats);

userRouter.get("/profile/:walletAddress/raffles/followed", userController.getFollowedRaffles);

userRouter.get("/profile/:walletAddress/auctions/followed", userController.getFollowedAuctions);

userRouter.get("/profile/:walletAddress/gumballs/followed", userController.getFollowedGumballs);


userRouter.post("/favourites/raffle/:raffleId", authMiddleware, userController.toggleFavouriteRaffle);

userRouter.post("/favourites/auction/:auctionId", authMiddleware, userController.toggleFavouriteAuction);

userRouter.post("/favourites/gumball/:gumballId", authMiddleware, userController.toggleFavouriteGumball);

userRouter.post("/follow/raffle/:raffleId", authMiddleware, userController.toggleFollowRaffle);

userRouter.post("/follow/auction/:auctionId", authMiddleware, userController.toggleFollowAuction);

userRouter.post("/follow/gumball/:gumballId", authMiddleware, userController.toggleFollowGumball);

export default userRouter;
