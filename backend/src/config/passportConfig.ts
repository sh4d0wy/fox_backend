import { Strategy } from "@superfaceai/passport-twitter-oauth2";
import { Session } from "express-session";
import passport from "passport";
import prismaClient from "../database/client";

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj:any, done) => {
    done(null, obj);
});

passport.use(new Strategy({
    clientID:process.env.TWITTER_CLIENT_ID as string,
    clientSecret:process.env.TWITTER_CLIENT_SECRET as string,
    clientType: "confidential",
    callbackURL:process.env.TWITTER_CALLBACK_URL as string,
    state: true,
    pkce: true,
    passReqToCallback: true,
}, async (req:any, accessToken:any, refreshToken:any, profile:any, done:any) => {
    const walletAddress = (req.session as Session & { walletAddress: string }).walletAddress;
    if(!walletAddress){
        return done(new Error("Wallet address not found"));
    }
    const user = await prismaClient.user.findUnique({
        where: {
            walletAddress: walletAddress,
        },
    });
    if(!user){
        return done(new Error("User not found"));
    }else{
        const updatedUser = await prismaClient.user.update({
            where:{
                walletAddress: walletAddress,
            },
            data:{
                twitterId: profile.username,
                twitterConnected: true,
            }
        })
        return done(null, updatedUser);
    }
}))


export default passport;