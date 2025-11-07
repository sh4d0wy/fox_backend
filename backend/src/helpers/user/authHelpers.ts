import { PublicKey } from "@solana/web3.js";
import crypto from "crypto";
import prismaClient from "../../database/client";
import bs58 from "bs58";
import nacl from "tweetnacl";
import jwt from "jsonwebtoken";
import { deleteCacheData, getCacheData, setCacheData } from "../../config/redis";
import logger from "../../utils/logger";
import { User } from "@prisma/client";

export function validatePublicKey(publicKey: string): boolean {
    try {
        new PublicKey(publicKey);
    } catch (error) {
        throw "Invalid public key";
    }
    return PublicKey.isOnCurve(new PublicKey(publicKey).toBytes());
}

export async function generateAuthMessage(publicKey: string): Promise<{message: string, nonce: string}> {
    const cachedNonce = await getCacheData(`nonce:${publicKey}`);
    if (cachedNonce) {
        return {message: `Welcome to Fox9 Raffles\n Sign this message to verify your wallet address: ${publicKey}\n Nonce: ${cachedNonce}`, nonce: cachedNonce};
    }
    
    const nonce = crypto.randomBytes(32).toString("hex");
    await setCacheData(`nonce:${publicKey}`,nonce, 5*60);
    return {message: `Welcome to Fox9 Raffles\n Sign this message to verify your wallet address: ${publicKey}\n Nonce: ${nonce}`, nonce};
}

export async function verifySignature(publicKey: string,signature: string,message: string): Promise<{walletAddress:string,verified:boolean}> {
        const publicKeyBytes = bs58.decode(publicKey);
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = bs58.decode(signature);
        const isVerified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
        if (!isVerified) {
            throw "ERROR: Invalid signature";
        }   
        return {walletAddress:publicKey, verified:true};   
}

export async function verifyNonce(nonce:string,publicKey:string): Promise<boolean> {
        const cachedNonce = await getCacheData(`nonce:${publicKey}`);
        if (cachedNonce !== nonce || !cachedNonce) {
            throw "ERROR: Nonce invalid"
        }
        await deleteCacheData(`nonce:${publicKey}`);
        return true;
}

export async function generateJwt(publicKey:string,userId:string): Promise<string> {    
        const token = jwt.sign({publicKey, userId}, process.env.JWT_SECRET as string, {expiresIn: "1d"});
        return token;
}

export async function findOrCreateUser(publicKey:string): Promise<{user:User, token:string}> {
    try {
        validatePublicKey(publicKey);
        let user:User|null;

        user = await prismaClient.user.findUnique({
            where: {
                walletAddress: publicKey
            }
        });
        if (!user) {
            user = await prismaClient.user.create({
                data: {
                    walletAddress: publicKey
                }
            });
        }

        const token = await generateJwt(publicKey,user.id);
        return {user,token};
    } catch (error) {
        logger.error("DB error: "+error);
        throw "ERROR: Failed to find or create user";
    }
}