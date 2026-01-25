import { z } from "zod";

export const claimGumballPrizeSchema = z.object({
  spinId: z.number().int(),
  txSignature: z.string().min(1),
  prizeIndex: z.number().int().min(0),
});

