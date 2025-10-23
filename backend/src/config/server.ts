import express  from "express";
import { config } from "dotenv";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import cors from "cors";

config();

export const app = express();

app.use(express.json());
app.use(cookieParser())
app.use(cors())

const serverConn = createServer(app);

export default serverConn;