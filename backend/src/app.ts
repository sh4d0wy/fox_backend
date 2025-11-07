import { config } from "dotenv";
import serverConn,{app} from "./config/server";
import type { Request, Response } from "express";
import { connectRedis } from "./config/redis";

config();

app.get("/health",(req:Request,res:Response)=>{
    res.send("ok")
})

serverConn.listen(process.env.PORT || 3000,async ()=>{
    await connectRedis();
    console.log(`Server is listening on port ${process.env.PORT || 3000}`)
})