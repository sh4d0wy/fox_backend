import { z } from "zod";

export const claimTicketAmountSchema = z.object({
  txSignature: z.string().min(1),
});