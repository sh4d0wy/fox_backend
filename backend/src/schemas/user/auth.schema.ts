import z from "zod";

export const authVerifySchema = z.object({
    publicKey: z.string().min(32).max(44),
    signature: z.string().min(1),
    message: z.string().min(1),
})



