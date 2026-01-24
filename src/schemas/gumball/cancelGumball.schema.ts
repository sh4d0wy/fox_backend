import { z } from "zod";

export const cancelGumballSchema = z.object({
  txSignature: z.string().min(1),
});

export const cancelAndClaimGumballSchema = z.object({
  gumballId: z.number(),
  prizeIndexes: z.array(z.number()),
});
