import { createClient } from "redis";

export const redisClient = createClient({
    url: process.env.REDIS_URL,
});

export async function setCacheData(key:string,value:string,ttl:number){
    await redisClient.set(key,value,{EX:ttl,NX:true});
}

export async function getCacheData(key:string){
    return await redisClient.get(key);
}

export async function deleteCacheData(key:string){
    await redisClient.del(key);
}

export async function connectRedis() {
    await redisClient.connect();
    console.log("Redis connected");
}

export default redisClient;