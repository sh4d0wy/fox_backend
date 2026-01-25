import { z } from "zod";

export const spinSchema = z.object({
  txSignature: z.string().min(1),
});

