import express  from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import userRouter from "../routes/userRoutes";

export const app = express();

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
app.use(cors());

app.use("/api/user", userRouter);

const serverConn = createServer(app);

export default serverConn;