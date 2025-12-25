import { z } from "zod";

// Schema for a single prize
const prizeDataSchema = z.object({
  prizeIndex: z.number().int().gte(0),
  isNft: z.boolean().default(false),
  
  // Token/NFT details
  mint: z.string().min(1),
  name: z.string().optional(),
  symbol: z.string().optional(),
  image: z.string().optional(),
  decimals: z.number().int().optional(),
  
  // Prize amounts
  totalAmount: z.string().min(1), // BigInt as string
  prizeAmount: z.string().min(1), // BigInt as string
  quantity: z.number().int().gt(0),
  
  // For NFTs - floor price used for buy back calculation
  floorPrice: z.string().optional(), // BigInt as string
});

// Add multiple prizes at once - prizeIndex calculated based on existing prizes count
export const addPrizesSchema = z.object({
  prizes: z.array(prizeDataSchema).min(1),
  txSignature: z.string().min(1),
});

// Single prize schema
export const addPrizeSchema = z.object({
  prizeIndex: z.number().int().gte(0),
  isNft: z.boolean().default(false),
  mint: z.string().min(1),
  name: z.string().optional(),
  symbol: z.string().optional(),
  image: z.string().optional(),
  decimals: z.number().int().optional(),
  totalAmount: z.string().min(1),
  prizeAmount: z.string().min(1),
  quantity: z.number().int().gt(0),
  floorPrice: z.string().optional(),
  txSignature: z.string().min(1),
});

// Re-export for backward compatibility
export const addMultiplePrizesSchema = addPrizesSchema;
