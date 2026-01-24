import { z } from "zod";

export const creatorClaimPrizeSchema = z.object({
  txSignature: z.string().min(1),
});

const multiplePrizeSchema = z.array(z.object({
  prizeIndex: z.number(),
}))

export const claimMultiplePrizesBackSchemaTx = z.object({
  prizes: multiplePrizeSchema,
  gumballId: z.number(),
});
