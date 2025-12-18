import { z } from "zod";

export const buyTicketSchema = z.object({
    quantity: z.number().gt(0),
    txSignature: z.string().min(1)
});