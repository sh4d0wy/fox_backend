import express  from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import userRouter from "../routes/userRoutes";
import passport from "./passportConfig";
import session from "express-session";

export const app = express();

app.set('trust proxy', 1);
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
app.use(cors({
    credentials: true,
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
}));
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

const serverConn = createServer(app);

export default serverConn;