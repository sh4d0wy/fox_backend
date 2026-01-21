import { responseHandler } from "../utils/resHandler";
import { Request, Response } from "express";
import {
  auctionSchema,
  createAuctionSchema,
} from "../schemas/auction/createAuction.schema";
import { verifyTransaction } from "../utils/verifyTransaction";
import prismaClient from "../database/client";
import logger from "../utils/logger";
import { cancelAuctionSchema } from "../schemas/auction/cancelAuction.schema";
import { placeBidAuctionTxSchema, placeBidSchema } from "../schemas/auction/placeBid.schema";
import { claimAuctionSchema } from "../schemas/auction/claimAuction.schema";
import { ADMIN_KEYPAIR, connection, auctionProgram } from "../services/solanaconnector";
import { ComputeBudgetProgram, PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY, Transaction } from "@solana/web3.js";
import { ensureAtaIx, FAKE_ATA, FAKE_MINT, getAtaAddress, getMasterEditionPda, getMetadataPda, getRuleSet, getTokenProgramFromMint, getTokenRecordPda, METAPLEX_METADATA_PROGRAM_ID, MPL_TOKEN_AUTH_RULES_PROGRAM_ID } from "../utils/helpers";
import { BN } from "@coral-xyz/anchor";

const createAuction = async (req: Request, res: Response) => {
  const body = req.body;
  const { success, data: parsedData, error } = auctionSchema.safeParse(body);
  if (!success) {
    console.log(error);
    return responseHandler.error(res, "Invalid payload");
  }
  if (parsedData.endsAt && parsedData.startsAt && parsedData.endsAt < parsedData.startsAt) {
    return responseHandler.error(res, "Invalid endsAt");
  }

  const isTransactionConfirmed = await verifyTransaction(parsedData.txSignature);
  if (!isTransactionConfirmed) {
    return responseHandler.error(res, "Transaction not confirmed");
  }

  let auction;

  await prismaClient.$transaction(async (tx) => {
    const existingTransaction = await tx.transaction.findUnique({
      where: {
        transactionId: parsedData.txSignature,
      },
    });
    if (existingTransaction) {
      throw new Error("Transaction already exists");
    }

    const status =
      parsedData.startsAt && parsedData.startsAt <= new Date()
        ? "ACTIVE"
        : "INITIALIZED";

    auction = await tx.auction.create({
      data: {
        id: parsedData.id,
        createdBy: parsedData.createdBy,
        prizeMint: parsedData.prizeMint,
        prizeName: parsedData.prizeName,
        prizeImage: parsedData.prizeImage,
        collectionName: parsedData.collectionName,
        collectionVerified: parsedData.collectionVerified,
        floorPrice: parsedData.floorPrice,
        traits: parsedData.traits,
        details: parsedData.details,
        startsAt: parsedData.startsAt,
        endsAt: parsedData.endsAt,
        timeExtension: parsedData.timeExtension,
        reservePrice: parsedData.reservePrice,
        currency: parsedData.currency,
        bidIncrementPercent: parsedData.bidIncrementPercent,
        payRoyalties: parsedData.payRoyalties,
        royaltyPercentage: parsedData.royaltyPercentage,
        auctionPda: parsedData.auctionPda,
        auctionBump: parsedData.auctionBump,
        bidEscrow: parsedData.bidEscrow,
        status: status,
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        transactionId: parsedData.txSignature,
        type: "AUCTION_CREATION",
        sender: parsedData.createdBy,
        receiver: parsedData.auctionPda || "system",
        amount: BigInt(0),
        mintAddress: parsedData.prizeMint,
        auctionId: parsedData.id,
      },
    });
    if (!transaction) {
      throw new Error("Transaction not created");
    }
  });

  responseHandler.success(res, {
    message: "Auction created successfully",
    error: null,
    auction,
  });
};

const getAuctions = async (req: Request, res: Response) => {
  const { page, limit } = req.query;
  if (!page || !limit) {
    return responseHandler.error(res, "Page and limit are required");
  }
  const auctions = await prismaClient.auction.findMany({
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    orderBy: {
      createdAt: "desc",
    },
    include: {
      bids: {
        orderBy: {
          bidTime: "desc",
        },
        take: 1,
      },
      creator: {
        select: {
          walletAddress: true,
          twitterId: true,
          profileImage: true,
        },
      },
    },
  });
  responseHandler.success(res, {
    message: "Auctions fetched successfully",
    error: null,
    auctions,
  });
};

const getAuctionDetails = async (req: Request, res: Response) => {
  const params = req.params;
  const auctionId = parseInt(params.auctionId);
  const auction = await prismaClient.auction.findUnique({
    where: {
      id: auctionId,
    },
    include: {
      bids: {
        orderBy: {
          bidTime: "desc",
        },
        include: {
          bidder: {
            select: {
              walletAddress: true,
              twitterId: true,
              profileImage: true,
            },
          },
        },
      },
      highestBidder: {
        select: {
          walletAddress: true,
          twitterId: true,
          profileImage: true,
        },
      },
      favouritedBy: {
        select: {
          walletAddress: true,
          twitterId: true,
          profileImage: true,
        },
      },
      creator: {
        select: {
          walletAddress: true,
          twitterId: true,
          profileImage: true,
        },
      },
      transactions: {
        select: {
          transactionId: true,
          type: true,
          createdAt: true,
          amount: true,
          sender: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
  if (!auction) {
    return responseHandler.error(res, "Auction not found");
  }

  const endingTransaction = auction.transactions.find(tx => tx.type === "AUCTION_END") || null;

  responseHandler.success(res, {
    message: "Auction fetched successfully",
    error: null,
    auction: {
      ...auction,
      endingTransaction,
    },
  });
};

const getAuctionsByUser = async (req: Request, res: Response) => {
  const userAddress = req.user;
  const auctions = await prismaClient.auction.findMany({
    where: {
      createdBy: userAddress,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      bids: {
        orderBy: {
          bidTime: "desc",
        },
        take: 1,
      },
    },
  });
  if (!auctions) {
    logger.error("Auctions not found for user", userAddress);
    return responseHandler.error(res, "Auctions not found");
  }
  responseHandler.success(res, {
    message: "Auctions fetched successfully",
    error: null,
    auctions,
  });
};

const cancelAuction = async (req: Request, res: Response) => {
  const params = req.params;
  const auctionId = parseInt(params.auctionId);
  const userAddress = req.user;
  const body = req.body;

  if (!userAddress) {
    return responseHandler.error(res, "User not found");
  }
  const { success, data: parsedData } = cancelAuctionSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }

  const validatedTransaction = await verifyTransaction(parsedData.txSignature);
  if (!validatedTransaction) {
    return responseHandler.error(res, "Invalid transaction");
  }
  if (!auctionId) {
    return responseHandler.error(res, "Auction ID is required");
  }
  try {
    const auction = await prismaClient.auction.findUnique({
      where: {
        id: auctionId,
        createdBy: userAddress,
      },
    });
    if (!auction) {
      throw {
        code: "DB_ERROR",
        message: "Auction not found",
      };
    }
    if (auction.hasAnyBid) {
      throw {
        code: "DB_ERROR",
        message: "Auction has bids, cannot be cancelled",
      };
    }
    await prismaClient.$transaction(async (tx) => {
      await tx.auction.update({
        where: {
          id: auctionId,
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });
      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "AUCTION_CANCEL",
          sender: auction.createdBy,
          receiver: "system",
          amount: BigInt(0),
          mintAddress: auction.prizeMint,
          auctionId: auctionId,
        },
      });
    });

    responseHandler.success(res, {
      message: "Auction cancelled successfully",
      error: null,
      auctionId: auctionId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const placeBid = async (req: Request, res: Response) => {
  const params = req.params;
  const auctionId = parseInt(params.auctionId);
  const userAddress = req.user as string;
  const body = req.body;
  const { success, data: parsedData } = placeBidSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }

  const validatedTransaction = await verifyTransaction(parsedData.txSignature);
  if (!validatedTransaction) {
    return responseHandler.error(res, "Invalid transaction");
  }
  try {
    await prismaClient.$transaction(async (tx) => {
      // Verify the auction
      const auction = await tx.auction.findUnique({
        where: {
          id: auctionId,
        },
      });

      if (!auction || auction.status !== "ACTIVE") {
        throw {
          code: "DB_ERROR",
          message: "Auction not found or not active",
        };
      }

      if (auction.endsAt < new Date()) {
        throw {
          code: "DB_ERROR",
          message: "Auction has ended",
        };
      }

      // Check if bid meets reserve price
      if (auction.reservePrice) {
        const reservePrice = BigInt(auction.reservePrice);
        const bidAmount = BigInt(parsedData.bidAmount);
        if (bidAmount < reservePrice) {
          throw {
            code: "DB_ERROR",
            message: "Bid amount is below reserve price",
          };
        }
      }

      // Check if bid is higher than current highest bid
      const currentHighestBid = BigInt(auction.highestBidAmount);
      const newBidAmount = BigInt(parsedData.bidAmount);

      if (auction.hasAnyBid && newBidAmount <= currentHighestBid) {
        throw {
          code: "DB_ERROR",
          message: "Bid amount must be higher than current highest bid",
        };
      }

      // Check bid increment if configured
      if (auction.hasAnyBid && auction.bidIncrementPercent) {
        const minIncrement = currentHighestBid * BigInt(Math.floor(auction.bidIncrementPercent * 100)) / BigInt(10000);
        const minBid = currentHighestBid + minIncrement;
        if (newBidAmount < minBid) {
          throw {
            code: "DB_ERROR",
            message: `Bid must be at least ${auction.bidIncrementPercent}% higher than current bid`,
          };
        }
      }

      // Check for existing transaction
      const existingTransaction = await tx.transaction.findUnique({
        where: {
          transactionId: parsedData.txSignature,
        },
      });
      if (existingTransaction) {
        throw {
          code: "DB_ERROR",
          message: "Transaction already exists",
        };
      }

      // Calculate new end time if time extension is configured
      let newEndsAt = auction.endsAt;
      if (auction.timeExtension) {
        const timeUntilEnd = auction.endsAt.getTime() - Date.now();
        const extensionThreshold = auction.timeExtension * 60 * 1000; // Convert minutes to ms
        if (timeUntilEnd < extensionThreshold) {
          newEndsAt = new Date(Date.now() + extensionThreshold);
        }
      }

      // Create the transaction first (before bid, due to foreign key constraint)
      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "AUCTION_BID",
          sender: userAddress,
          receiver: auction.auctionPda || "system",
          amount: BigInt(parsedData.bidAmount),
          mintAddress: auction.currency === "SOL" ? "So11111111111111111111111111111111111111112" : auction.currency,
          metadata: {
            bidAmount: parsedData.bidAmount,
            auctionId: auctionId.toString(),
          },
          auctionId: auctionId,
        },
      });

      // Create the bid (now that the transaction exists)
      const bid = await tx.bid.create({
        data: {
          auctionId: auctionId,
          bidderWallet: userAddress,
          bidAmount: parsedData.bidAmount,
          transactionId: parsedData.txSignature,
        },
      });

      if (!bid) {
        throw {
          code: "DB_ERROR",
          message: "Bid not created",
        };
      }

      // Update the auction with new highest bid
      const updatedAuction = await tx.auction.update({
        where: {
          id: auctionId,
        },
        data: {
          highestBidAmount: parsedData.bidAmount,
          highestBidderWallet: userAddress,
          hasAnyBid: true,
          endsAt: newEndsAt,
        },
      });
      if (!updatedAuction) {
        throw {
          code: "DB_ERROR",
          message: "Auction not updated",
        };
      }
    });
    responseHandler.success(res, {
      message: "Bid placed successfully",
      error: null,
      auctionId: auctionId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const deleteAuction = async (req: Request, res: Response) => {
  const params = req.params;
  const auctionId = parseInt(params.auctionId);
  const userAddress = req.user as string;
  try {
    if (!auctionId) {
      return responseHandler.error(res, "Auction ID is required");
    }
    const auction = await prismaClient.auction.findUnique({
      where: {
        id: auctionId,
      },
    });
    if (!auction) {
      return responseHandler.error(res, "Auction not found");
    }
    if (auction.createdBy !== userAddress) {
      return responseHandler.error(res, "You are not the creator of this auction");
    }
    if (auction.hasAnyBid) {
      return responseHandler.error(res, "Cannot delete auction with bids");
    }
    await prismaClient.auction.delete({
      where: {
        id: auctionId,
      },
    });
    responseHandler.success(res, {
      message: "Auction deleted successfully",
      error: null,
      auctionId: auctionId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const claimAuction = async (req: Request, res: Response) => {
  const params = req.params;
  const auctionId = parseInt(params.auctionId);
  const userAddress = req.user as string;
  const body = req.body;

  const { success, data: parsedData } = claimAuctionSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }

  const validatedTransaction = await verifyTransaction(parsedData.txSignature);
  if (!validatedTransaction) {
    return responseHandler.error(res, "Invalid transaction");
  }

  try {
    await prismaClient.$transaction(async (tx) => {
      // Verify the auction exists and has ended successfully
      const auction = await tx.auction.findUnique({
        where: {
          id: auctionId,
        },
        include: {
          highestBidder: true,
        },
      });

      if (!auction) {
        throw {
          code: "DB_ERROR",
          message: "Auction not found",
        };
      }

      if (auction.status !== "COMPLETED_SUCCESSFULLY") {
        throw {
          code: "DB_ERROR",
          message: "Auction has not ended successfully",
        };
      }

      // Check if the user is the winner or the creator
      const isWinner = auction.highestBidderWallet === userAddress;
      const isCreator = auction.createdBy === userAddress;

      if (!isWinner && !isCreator) {
        throw {
          code: "DB_ERROR",
          message: "User is not the winner or creator of this auction",
        };
      }

      // Check if transaction already exists (prevents duplicate claims)
      const existingTransaction = await tx.transaction.findUnique({
        where: {
          transactionId: parsedData.txSignature,
        },
      });
      if (existingTransaction) {
        throw {
          code: "DB_ERROR",
          message: "Transaction already exists",
        };
      }

      // Check if user has already claimed
      const existingClaim = await tx.transaction.findFirst({
        where: {
          type: "AUCTION_CLAIM",
          sender: userAddress,
          auctionId: auctionId,
        },
      });
      if (existingClaim) {
        throw {
          code: "DB_ERROR",
          message: "User has already claimed from this auction",
        };
      }

      // Determine claim type and amount
      let claimAmount = BigInt(0);
      if (isWinner) {
        // Winner claims the NFT/prize
        claimAmount = BigInt(0); // NFT transfer, no amount
      } else if (isCreator) {
        // Creator claims the winning bid amount
        claimAmount = BigInt(auction.creatorAmount || auction.highestBidAmount);
      }

      // Create the transaction record
      await tx.transaction.create({
        data: {
          transactionId: parsedData.txSignature,
          type: "AUCTION_CLAIM",
          sender: userAddress,
          receiver: auction.auctionPda || auctionId.toString(),
          amount: claimAmount,
          mintAddress: isWinner ? auction.prizeMint : (auction.currency === "SOL" ? "So11111111111111111111111111111111111111112" : auction.currency),
          isNft: isWinner,
          auctionId: auctionId,
        },
      });
    });

    responseHandler.success(res, {
      message: "Auction claim successful",
      error: null,
      auctionId: auctionId,
    });
  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const getBidsByUser = async (req: Request, res: Response) => {
  const userAddress = req.user as string;
  const bids = await prismaClient.bid.findMany({
    where: {
      bidderWallet: userAddress,
    },
    orderBy: {
      bidTime: "desc",
    },
    include: {
      auction: true,
    },
  });
  responseHandler.success(res, {
    message: "Bids fetched successfully",
    error: null,
    bids,
  });
};

const auctionPda = (auctionId: number): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("auction"),
      new BN(auctionId).toArrayLike(Buffer, "le", 4), // u32
    ],
    auctionProgram.programId
  )[0];
};

const auctionConfigPda = PublicKey.findProgramAddressSync(
  [Buffer.from("auction")],
  auctionProgram.programId
)[0];

const createAuctionTx = async (req: Request, res: Response) => {
  const userAddress = req.user as string;
  const body = req.body;
  const { success, data: parsedData } = createAuctionSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }
  try {
    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: new PublicKey(userAddress),
    });

    const prizeTokenProgram = await getTokenProgramFromMint(
      connection,
      new PublicKey(parsedData.prizeMint)
    );

    // fetch config to get auction_count
    const config = await auctionProgram.account.auctionConfig.fetch(
      auctionConfigPda
    );

    const auctionAccountPda = auctionPda(config.auctionCount);
    const prizeMintPubkey = new PublicKey(parsedData.prizeMint);

    const creatorPrizeAta = await getAtaAddress(
      connection,
      prizeMintPubkey,
      new PublicKey(userAddress)
    );

    const prizeEscrowAta = await getAtaAddress(
      connection,
      prizeMintPubkey,
      auctionAccountPda,
      true // PDA owner
    );

    // ---------------- Metaplex Accounts (New) ----------------
    const metadataAccount = getMetadataPda(prizeMintPubkey);
    const editionAccount = getMasterEditionPda(prizeMintPubkey);
    const ownerTokenRecord = getTokenRecordPda(prizeMintPubkey, creatorPrizeAta);
    const destTokenRecord = getTokenRecordPda(prizeMintPubkey, prizeEscrowAta);
    const ruleSet = await getRuleSet(prizeMintPubkey);
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000
    });

    const ix = await auctionProgram.methods
      .createAuction(
        new BN(parsedData.startTime),
        new BN(parsedData.endTime),
        parsedData.startImmediately,
        parsedData.isBidMintSol,
        new BN(parsedData.baseBid),
        new BN(parsedData.minIncrement),
        parsedData.timeExtension
      )
      .accounts({
        creator: new PublicKey(userAddress),
        auctionAdmin: ADMIN_KEYPAIR.publicKey,

        prizeMint: prizeMintPubkey,
        bidMint: parsedData.bidMint ? new PublicKey(parsedData.bidMint) : FAKE_MINT,

        prizeTokenProgram,

        // Metaplex & pNFT Accounts
        metadataAccount,
        editionAccount,
        ownerTokenRecord,
        destTokenRecord,
        authorizationRules: ruleSet, // Pass null if Option<T> is not used
        authRulesProgram: MPL_TOKEN_AUTH_RULES_PROGRAM_ID, // Or a specific rules program if applicable
        tokenMetadataProgram: METAPLEX_METADATA_PROGRAM_ID,
        sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .instruction();

    transaction.add(modifyComputeUnits);
    transaction.add(ix);

    transaction.partialSign(ADMIN_KEYPAIR);

    const serializedTransaction = transaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    });

    const base64Transaction = serializedTransaction.toString('base64');

    res.status(200).json({
      base64Transaction,
      minContextSlot,
      blockhash,
      lastValidBlockHeight,
      message: "OK",
    });

  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const cancelAuctionTx = async (req: Request, res: Response) => {
  const params = req.params;
  const auctionId = parseInt(params.auctionId);
  const userAddress = req.user as string;

  try {
    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: new PublicKey(userAddress),
    });

    const auctionAccountPda = auctionPda(auctionId);

    const auctionData = await auctionProgram.account.auction.fetch(
      auctionAccountPda
    );

    const prizeTokenProgram = await getTokenProgramFromMint(
      connection,
      auctionData.prizeMint
    );

    const creatorPrizeAta = await getAtaAddress(
      connection,
      auctionData.prizeMint,
      new PublicKey(userAddress)
    );

    const prizeEscrowAta = await getAtaAddress(
      connection,
      auctionData.prizeMint,
      auctionAccountPda,
      true // PDA owner
    );

    // ---------------- Metaplex Accounts (New) ----------------
    const metadataAccount = getMetadataPda(auctionData.prizeMint);
    const editionAccount = getMasterEditionPda(auctionData.prizeMint);
    const ownerTokenRecord = getTokenRecordPda(auctionData.prizeMint, prizeEscrowAta);
    const destTokenRecord = getTokenRecordPda(auctionData.prizeMint, creatorPrizeAta);
    const ruleSet = await getRuleSet(auctionData.prizeMint);
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000
    });

    const ix = await auctionProgram.methods
      .cancelAuction(auctionId)
      .accounts({
        creator: new PublicKey(userAddress),
        auctionAdmin: ADMIN_KEYPAIR.publicKey,

        prizeMint: auctionData.prizeMint,

        prizeTokenProgram,

        // Metaplex & pNFT Accounts
        metadataAccount,
        editionAccount,
        ownerTokenRecord,
        destTokenRecord,
        authorizationRules: ruleSet, // Pass null if Option<T> is not used
        authRulesProgram: MPL_TOKEN_AUTH_RULES_PROGRAM_ID, // Or a specific rules program if applicable
        tokenMetadataProgram: METAPLEX_METADATA_PROGRAM_ID,
        sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .instruction();

    transaction.add(modifyComputeUnits);
    transaction.add(ix);

    transaction.partialSign(ADMIN_KEYPAIR);

    const serializedTransaction = transaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    });

    const base64Transaction = serializedTransaction.toString('base64');

    res.status(200).json({
      base64Transaction,
      minContextSlot,
      blockhash,
      lastValidBlockHeight,
      message: "OK",
    });

  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

const placeBidAuctionTx = async (req: Request, res: Response) => {
  const userAddress = req.user as string;
  const body = req.body;
  const { success, data: parsedData } = placeBidAuctionTxSchema.safeParse(body);
  if (!success) {
    return responseHandler.error(res, "Invalid payload");
  }
  try {
    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: new PublicKey(userAddress),
    });

    /* ---------------- PDAs ---------------- */
    const auctionAccountPda = auctionPda(parsedData.auctionId);

    const auctionData = await auctionProgram.account.auction.fetch(
      auctionAccountPda
    );

    const isSolBid = auctionData.bidMint === null;
    const bidMint = auctionData.bidMint ?? FAKE_MINT;

    let currentBidderAta: PublicKey = FAKE_ATA;
    let prevBidderAta: PublicKey = FAKE_ATA;
    let bidEscrow: PublicKey = FAKE_ATA;
    let highestBidder: PublicKey = new PublicKey(userAddress);

    /* ---------------- Token program ---------------- */
    const bidTokenProgram = await getTokenProgramFromMint(
      connection,
      bidMint
    );

    if (!isSolBid) {
      /* -------- Ensure Escrow ATA -------- */
      const escrowRes = await ensureAtaIx({
        connection,
        mint: bidMint,
        owner: auctionAccountPda,
        payer: new PublicKey(userAddress),
        tokenProgram: bidTokenProgram,
        allowOwnerOffCurve: true,
      });

      bidEscrow = escrowRes.ata;
      if (escrowRes.ix) transaction.add(escrowRes.ix);

      /* -------- Ensure current bidder ATA -------- */
      const currentRes = await ensureAtaIx({
        connection,
        mint: bidMint,
        owner: new PublicKey(userAddress),
        payer: new PublicKey(userAddress),
        tokenProgram: bidTokenProgram,
      });

      currentBidderAta = currentRes.ata;
      if (currentRes.ix) transaction.add(currentRes.ix);

      /* -------- Ensure previous bidder ATA (refund path) -------- */
      if (!auctionData.highestBidder.equals(PublicKey.default)) {
        const prevRes = await ensureAtaIx({
          connection,
          mint: bidMint,
          owner: auctionData.highestBidder,
          payer: new PublicKey(userAddress),
          tokenProgram: bidTokenProgram,
        });

        prevBidderAta = prevRes.ata;
        if (prevRes.ix) transaction.add(prevRes.ix);
      }
    } else {
      if (!auctionData.highestBidder.equals(PublicKey.default)) {
        highestBidder = auctionData.highestBidder;
      }
    }

    /* ---------------- Anchor instruction ---------------- */
    const ix = await auctionProgram.methods
      .placeBid(
        parsedData.auctionId,
        new BN(parsedData.bidAmount)
      )
      .accounts({
        bidder: new PublicKey(userAddress),
        auctionAdmin: ADMIN_KEYPAIR.publicKey,

        prevBidderAccount: highestBidder,

        bidMint,
        currentBidderAta,
        prevBidderAta,
        bidEscrow,

        bidTokenProgram,
      })
      .instruction();

    transaction.add(ix);

    transaction.partialSign(ADMIN_KEYPAIR);

    const serializedTransaction = transaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    });

    const base64Transaction = serializedTransaction.toString('base64');

    res.status(200).json({
      base64Transaction,
      minContextSlot,
      blockhash,
      lastValidBlockHeight,
      message: "OK",
    });

  } catch (error) {
    logger.error(error);
    responseHandler.error(res, error);
  }
};

export default {
  createAuction,
  getAuctions,
  getAuctionDetails,
  getAuctionsByUser,
  cancelAuction,
  placeBid,
  claimAuction,
  deleteAuction,
  getBidsByUser,
  createAuctionTx,
  cancelAuctionTx,
  placeBidAuctionTx
};

