import { z } from "zod";

export const cancelAuctionSchema = z.object({
  txSignature: z.string().min(1),
});
