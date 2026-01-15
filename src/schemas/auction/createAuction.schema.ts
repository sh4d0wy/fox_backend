import { z } from "zod";

export const auctionSchema = z.object({
  id: z.number().optional(),
  createdBy: z.string().min(1),

  // Prize details
  prizeMint: z.string().min(1),
  prizeName: z.string().optional(),
  prizeImage: z.string().optional(),
  collectionName: z.string().optional(),
  collectionVerified: z.boolean().optional().default(false),
  floorPrice: z.number().optional(),
  traits: z.any().optional(),
  details: z.any().optional(),

  // Timing
  startsAt: z.coerce.date().default(() => new Date()),
  endsAt: z.coerce.date(),
  timeExtension: z.number().int().optional(),

  // Auction configuration
  reservePrice: z.string().optional(),
  currency: z.string().default("SOL"),
  bidIncrementPercent: z.number().optional(),
  payRoyalties: z.boolean().optional().default(false),
  royaltyPercentage: z.number().optional().default(0),

  // On-chain data
  auctionPda: z.string().optional(),
  auctionBump: z.number().int().optional(),
  bidEscrow: z.string().optional(),
  txSignature: z.string().min(1),
});

export const createAuctionSchema = z.object({
  startTime: z.number(),
  endTime: z.number(),
  prizeMint: z.string(),
  bidMint: z.string(),
  startImmediately: z.boolean(),
  isBidMintSol: z.boolean(),
  baseBid: z.number(),
  minIncrement: z.number(),
  timeExtension: z.number(),
});