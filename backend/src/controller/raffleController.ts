//TODO: Implement raffle controller

import { responseHandler } from "../utils/resHandler";
import { Request, Response } from "express";
import { confirmRaffleCreationSchema, raffleSchema } from "../schemas/raffle/createRaffle.schema";
import { verifyTransaction } from "../utils/verifyTransaction"; 
import prismaClient from "../database/client";
import logger from "../utils/logger";

const createRaffle = async(req:Request,res:Response)=>{
    const body = req.body;
    const {success,data:parsedData} = raffleSchema.safeParse(body);
    if(!success){
        return responseHandler.error(res,"Invalid payload");
    }
    if(parsedData.createdAt && parsedData.createdAt < new Date()){
        return responseHandler.error(res,"Invalid createdAt");
    }
    if(parsedData.endsAt &&  parsedData.createdAt && parsedData.endsAt < parsedData.createdAt){
        return responseHandler.error(res,"Invalid endsAt");
    }

    const raffle = await prismaClient.raffle.create({
        data: {
            ...parsedData,
        }
    });

    responseHandler.success(res,{
        message: "Raffle creation initiated successfully",
        error: null,
        raffle
    });
}

const confirmRaffleCreation = async(req:Request,res:Response)=>{
    const {raffleId} = req.params;
    const body = req.body;
    const {success,data:parsedData} = confirmRaffleCreationSchema.safeParse(body);
    if(!success){
        return responseHandler.error(res,"Invalid payload");
    }
    try{
    const isTransactionConfirmed = await verifyTransaction(parsedData.txSignature);
    if(!isTransactionConfirmed){
        return responseHandler.error(res,"Transaction not confirmed");
    }

     await prismaClient.$transaction(async(tx)=>{
        const existingTransaction = await tx.transaction.findUnique({
            where: {
                transactionId: parsedData.txSignature
            }
        });
        if(existingTransaction){
            throw {
                code: "DB_ERROR",
                message: "Transaction already exists",
            };
        }
        const raffle = await tx.raffle.findUnique({
            where: {
                id: raffleId
            }
        });
        if(!raffle){
            throw {
                code: "DB_ERROR",
                message: "Raffle not found",
            };
        }
        if(raffle.createdAt && raffle.createdAt <= new Date()){
            const updatedRaffle = await tx.raffle.update({
                where: {
                    id: raffleId
                },
                data: {
                    state: "Active"
                }
            })
            if(!updatedRaffle){
                throw {
                    code: "DB_ERROR",
                    message: "Raffle not updated",
                };
            }
        }else if(raffle.createdAt && raffle.createdAt > new Date()){
            const updatedRaffle = await tx.raffle.update({
                where: {
                    id: raffleId
                },
                data: {
                    state: "Initialized"
                }
            })
            if(!updatedRaffle){
                throw {
                    code: "DB_ERROR",
                    message: "Raffle not updated",
                };
            }
        }
        
        //TODO: Fetch the raffle, entries, prize pda address and update in the raffle model



        const transaction = await tx.transaction.create({
            data: {
                transactionId: parsedData.txSignature,
                type: "RAFFLE_CREATION",
                sender: raffle.createdBy,
                receiver: raffle.raffle || "system",
                amount: BigInt(0),
                mintAddress: "So11111111111111111111111111111111111111112",
            }
        })
        if(!transaction){
            throw {
                code: "DB_ERROR",
                message: "Transaction not created",
            };
        }
    })
    responseHandler.success(res,{
        message: "Raffle creation confirmed successfully",
        error: null,
        raffleId: raffleId
    });
    }catch(error){
        logger.error(error);
        responseHandler.error(res,error);
    }
}

const getRaffles = async(req:Request,res:Response)=>{
    const {page,limit} = req.query;
    if(!page || !limit){
        return responseHandler.error(res,"Page and limit are required");
    }
    const raffles = await prismaClient.raffle.findMany({
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: {
            createdAt: "desc"
        }
    });
    responseHandler.success(res,{
        message: "Raffles fetched successfully",
        error: null,
        raffles
    });
}

const getRaffleDetails = async(req:Request,res:Response)=>{
    const {raffleId} = req.params;
    const raffle = await prismaClient.raffle.findUnique({
        where: {
            id: raffleId
        }
    });
    if(!raffle){
        return responseHandler.error(res,"Raffle not found");
    }
    responseHandler.success(res,{
        message: "Raffle fetched successfully",
        error: null,
        raffle
    });
}

const getRafflesByUser = async(req:Request,res:Response)=>{
    console.log("entered getRafflesByUser");
    const userAddress = req.user;
    console.log("userAddress",userAddress);
    const raffles = await prismaClient.raffle.findMany({
        where: {
            createdBy: userAddress
        },
        orderBy: {
            createdAt: "desc"
        }
    });
    if(!raffles){
        logger.error("Raffles not found for user",userAddress);
        return responseHandler.error(res,"Raffles not found");
    }
    responseHandler.success(res,{
        message: "Raffles fetched successfully",
        error: null,
        raffles
    });
}
//TODO: Create a function to update a raffle by a user
//TODO: Create a function to delete a raffle by a user

export default {
    createRaffle,
    confirmRaffleCreation,
    getRaffles,
    getRaffleDetails,
    getRafflesByUser,
}