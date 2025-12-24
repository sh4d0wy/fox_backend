import express  from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import userRouter from "../routes/userRoutes";
import passport from "./passportConfig";
import session from "express-session";
import raffleRouter from "../routes/raffleRoutes";
import auctionRouter from "../routes/auctionRoutes";
import gumballRouter from "../routes/gumballRoutes";
import statsRouter from "../routes/statsRoutes";

export const app = express();

app.set('trust proxy', 1);
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://lively-selkie-af66c7.netlify.app',
            'http://localhost:5173',
            'http://localhost:3000',
        ];
        
        // Check if the origin is in the allowed list or matches patterns
        if (!origin) {
            // Allow requests with no origin (like mobile apps, curl, Postman)
            return callback(null, true);
        }
        
        if (
            allowedOrigins.includes(origin) ||
            origin.endsWith('.ngrok-free.app') ||
            origin.endsWith('.netlify.app')
        ) {
            // Return the specific origin, not '*'
            callback(null, true);
        } else {
            console.log('❌ Blocked origin:', origin);
            callback(null, false); // Don't throw error, just don't allow
        }
    },
    // credentials: true, // This requires specific origin, not '*'
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'ngrok-skip-browser-warning'],
    exposedHeaders: ['Set-Cookie'],
}));

const ratelimiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 100, 
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true, 
    legacyHeaders: false, 
});

app.use(ratelimiter);
app.use(express.json());
app.use(cookieParser());

app.use(session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        sameSite: "none",
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 30,
        httpOnly: true,
    },
    name: "session"
}))
app.use(passport.initialize())
app.use(passport.session())

app.use("/api/user", userRouter);
app.use("/api/raffle",raffleRouter);
app.use("/api/auction", auctionRouter);
app.use("/api/gumball", gumballRouter);
app.use("/api/stats", statsRouter);

const serverConn = createServer(app);

export default serverConn;