import { z } from "zod";

export const cancelRaffleSchema = z.object({
    txSignature: z.string().min(1)
});