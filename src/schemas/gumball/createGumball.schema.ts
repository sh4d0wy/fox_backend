import { z } from "zod";

export const gumballSchema = z.object({
  id: z.number().int().optional(),
  creatorAddress: z.string().min(1),
  
  // Basic info
  name: z.string().min(1).max(32),
  manualStart: z.boolean().default(false),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  
  // Ticket configuration
  totalTickets: z.number().int(),
  ticketMint: z.string().optional(),
  ticketPrice: z.string().min(1), // BigInt as string
  isTicketSol: z.boolean().default(true),
  
  // Prize configuration
  minPrizes: z.number().int().min(2).default(2),
  maxPrizes: z.number().int().max(1000).default(1000),
  
  // Buy back settings
  buyBackEnabled: z.boolean().default(false),
  buyBackPercentage: z.number().min(0).max(100).optional(),
  
  // Rent info
  rentAmount: z.string().optional(), // BigInt as string
  txSignature: z.string().min(1),
});

export const createGumballSchema = z.object({
  startTime: z.number(),
  endTime: z.number(),
  totalTickets: z.number(),
  ticketPrice: z.number(),
  isTicketSol: z.boolean(),
  startGumball: z.boolean(),
  ticketMint: z.string().min(1),
});

export const confirmGumballCreationSchema = z.object({
  txSignature: z.string().min(1),
});

export const activateGumballSchema = z.object({
  txSignature: z.string().min(1),
});

export const updateBuyBackSchema = z.object({
  buyBackEnabled: z.boolean(),
  buyBackPercentage: z.number().min(0).max(100).optional(),
  buyBackEscrow: z.string().optional(),
  txSignature: z.string().min(1),
});
