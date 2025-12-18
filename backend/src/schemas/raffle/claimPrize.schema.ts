import { z } from "zod";

export const claimPrizeSchema = z.object({
    txSignature: z.string().min(1)
});
