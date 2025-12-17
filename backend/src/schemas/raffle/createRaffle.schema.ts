import { z } from "zod";

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
});

export const confirmRaffleCreationSchema = z.object({
    txSignature: z.string().min(1),
});