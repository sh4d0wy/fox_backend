import { z } from "zod";

export const prizeDataSchema = z.object({
    address: z.string().min(1),
    mintAddress: z.string().min(1),
    mint: z.string().min(1),
    name: z.string().min(1),
    verified: z.boolean().optional().default(true),
    symbol: z.string().min(1),
    decimals: z.number().int().optional(),
    image: z.string().min(1),
    attributes: z.any().optional(),
    collection: z.string().optional(),
    creator: z.string().optional(),
    description: z.string().optional(),
    externalUrl: z.string().optional(),
    properties: z.any().optional(),
    amount: z.number().gt(0).optional(),
    floor: z.number().gt(0).optional(),
});

export const raffleSchema = z.object({
    raffle: z.string().min(1).optional(),
    createdAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().min(new Date()),
    createdBy: z.string().min(1),
    ticketPrice: z.number().gt(0),
    ticketSupply: z.number().gt(0),
    ticketTokenAddress: z.string().min(1).optional(),
    floor: z.number().gt(0).optional(),
    val: z.number().gt(0).optional(),
    ttv: z.number().gt(0),
    roi: z.number().gt(0),
    entriesAddress: z.string().min(1).optional(),
    prize: z.string().min(1).optional(),
    maxEntries: z.number().gt(0),
    numberOfWinners: z.number().gt(0),
    prizeData: prizeDataSchema,
});

export const confirmRaffleCreationSchema = z.object({
    txSignature: z.string().min(1),
});