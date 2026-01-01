import { z } from "zod";

export const creatorClaimPrizeSchema = z.object({
  txSignature: z.string().min(1),
});

