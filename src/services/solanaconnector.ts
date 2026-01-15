import {
    Connection,
    PublicKey,
    Transaction,
    Keypair,
} from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import raffleIdl from "../types/raffle.json";
import auctionIdl from "../types/auction.json";
import gumballIdl from "../types/gumball.json";
import { Auction } from "../types/auction";
import { Raffle } from "../types/raffle";
import { Gumball } from "../types/gumball";
import dotenv from "dotenv";
dotenv.config();

const FAKE_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const FAKE_ATA = new PublicKey('C3FzbX9n1YD2dow2dCmEv5uNyyf22Gb3TLAEqGBhw5fY')

const connection = new Connection(
    process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
    "confirmed"
);
const ADMIN_KEYPAIR = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.ADMIN_PRIVATE_KEY || "[]"))
);
const RAFFLE_ADMIN_KEYPAIR = ADMIN_KEYPAIR;
const wallet = new Wallet(ADMIN_KEYPAIR);
const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
});

const RAFFLE_PROGRAM_ID = new anchor.web3.PublicKey(raffleIdl.address);
const raffleProgram = new anchor.Program<Raffle>(raffleIdl as anchor.Idl, provider);

const AUCTION_PROGRAM_ID = new anchor.web3.PublicKey(auctionIdl.address);
const auctionProgram = new anchor.Program<Auction>(auctionIdl as anchor.Idl, provider);

const GUMBALL_PROGRAM_ID = new anchor.web3.PublicKey(gumballIdl.address);
const gumballProgram = new anchor.Program<Gumball>(gumballIdl as anchor.Idl, provider);

async function rafflePda(raffleId: number): Promise<PublicKey> {
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(raffleId);

    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("raffle"), idBuffer],
        RAFFLE_PROGRAM_ID
    );
    return pda;
}

async function getRaffleConfigPda(): Promise<PublicKey> {
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("raffle")],
        RAFFLE_PROGRAM_ID
    );
    return pda;
}

async function getTokenProgramFromMint(
    connection: Connection,
    mint: PublicKey
): Promise<PublicKey> {
    const accountInfo = await connection.getAccountInfo(mint);

    if (!accountInfo) {
        throw new Error("Mint account not found");
    }

    const TOKEN_2022_PROGRAM_ID = new PublicKey(
        "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
    );

    if (accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
        return TOKEN_2022_PROGRAM_ID;
    }

    return TOKEN_PROGRAM_ID;
}

async function getAtaAddress(
    connection: Connection,
    mint: PublicKey,
    owner: PublicKey,
    allowOwnerOffCurve = true
): Promise<PublicKey> {
    const mintAccountInfo = await connection.getAccountInfo(mint);
    if (!mintAccountInfo) {
        throw new Error("Mint account not found");
    }

    const tokenProgramId = mintAccountInfo.owner;

    if (
        !tokenProgramId.equals(TOKEN_PROGRAM_ID) &&
        !tokenProgramId.equals(TOKEN_2022_PROGRAM_ID)
    ) {
        throw new Error("Unsupported token program");
    }

    return getAssociatedTokenAddressSync(
        mint,
        owner,
        allowOwnerOffCurve,
        tokenProgramId,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
}

async function ensureAtaIx(params: {
    connection: Connection;
    mint: PublicKey;
    owner: PublicKey;
    payer: PublicKey;
    tokenProgram: PublicKey;
    allowOwnerOffCurve?: boolean;
}): Promise<{ ata: PublicKey; ix: any | null }> {
    const { connection, mint, owner, payer, tokenProgram, allowOwnerOffCurve } = params;

    const ata = await getAssociatedTokenAddress(
        mint,
        owner,
        allowOwnerOffCurve,
        tokenProgram
    );

    const accountInfo = await connection.getAccountInfo(ata);

    if (accountInfo) {
        return { ata, ix: null };
    }

    const { createAssociatedTokenAccountInstruction } = await import("@solana/spl-token");

    const ix = createAssociatedTokenAccountInstruction(
        payer,
        ata,
        owner,
        mint,
        tokenProgram
    );

    return { ata, ix };
}

async function announceWinners(
    args: {
        raffleId: number;
        winners: PublicKey[];
    }
): Promise<string> {
    try {
        const tx = new Transaction();
        tx.feePayer = ADMIN_KEYPAIR.publicKey;

        const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash("confirmed");

        tx.recentBlockhash = blockhash;

        const raffleAccountPda = await rafflePda(args.raffleId);
        const raffleConfigPda = await getRaffleConfigPda();

        const raffleData = await (raffleProgram.account as any).raffle.fetch(
            raffleAccountPda
        );

        const isTicketSol = raffleData.ticketMint === null;

        let ticketTokenProgram;
        let ticketMint;
        let ticketEscrow;
        let ticketFeeTreasury;

        if (isTicketSol) {
            ticketMint = FAKE_MINT;
            ticketTokenProgram = TOKEN_PROGRAM_ID;

            const escrowRes = await ensureAtaIx({
                connection,
                mint: ticketMint,
                owner: raffleAccountPda,
                payer: ADMIN_KEYPAIR.publicKey,
                tokenProgram: ticketTokenProgram,
                allowOwnerOffCurve: true,
            });

            ticketEscrow = escrowRes.ata;
            if (escrowRes.ix) tx.add(escrowRes.ix);

            const treasuryRes = await ensureAtaIx({
                connection,
                mint: ticketMint,
                owner: raffleConfigPda,
                payer: ADMIN_KEYPAIR.publicKey,
                tokenProgram: ticketTokenProgram,
                allowOwnerOffCurve: true,
            });

            ticketFeeTreasury = treasuryRes.ata;
            if (treasuryRes.ix) tx.add(treasuryRes.ix);

        } else {
            ticketMint = raffleData.ticketMint;

            ticketTokenProgram = await getTokenProgramFromMint(
                connection,
                ticketMint
            );

            const escrowRes = await ensureAtaIx({
                connection,
                mint: ticketMint,
                owner: raffleAccountPda,
                payer: ADMIN_KEYPAIR.publicKey,
                tokenProgram: ticketTokenProgram,
                allowOwnerOffCurve: true,
            });

            ticketEscrow = escrowRes.ata;
            if (escrowRes.ix) tx.add(escrowRes.ix);

            const treasuryRes = await ensureAtaIx({
                connection,
                mint: ticketMint,
                owner: raffleConfigPda,
                payer: ADMIN_KEYPAIR.publicKey,
                tokenProgram: ticketTokenProgram,
                allowOwnerOffCurve: true,
            });

            ticketFeeTreasury = treasuryRes.ata;
            if (treasuryRes.ix) tx.add(treasuryRes.ix);
        }

        const ix = await raffleProgram.methods
            .announceWinners(args.raffleId, args.winners)
            .accounts({
                raffleAdmin: ADMIN_KEYPAIR.publicKey,
                ticketMint,
                ticketEscrow,
                ticketFeeTreasury,
                ticketTokenProgram,
            })
            .instruction();

        tx.add(ix);

        const signature = await connection.sendTransaction(
            tx,
            [ADMIN_KEYPAIR],
            { skipPreflight: false }
        );

        const confirmation = await connection.confirmTransaction(
            {
                signature,
                blockhash,
                lastValidBlockHeight,
            },
            "finalized"
        );

        if (confirmation.value.err) {
            throw new Error(
                `announceWinners failed: ${JSON.stringify(confirmation.value.err)}`
            );
        }

        console.log("Winners announced:", signature);
        return signature;

    } catch (error) {
        console.error("Announce winners failed:", error);
        throw error;
    }
}

const auctionPda = async (auctionId: number): Promise<PublicKey> => {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("auction"),
            new anchor.BN(auctionId).toArrayLike(Buffer, "le", 4),
        ],
        AUCTION_PROGRAM_ID
    )[0];
};

const auctionConfigPda = PublicKey.findProgramAddressSync(
    [Buffer.from("auction")],
    AUCTION_PROGRAM_ID
)[0];

async function startAuction(auctionId: number) {
    try {
        const tx = new Transaction();

        const ix = await auctionProgram.methods
            .startAuction(auctionId)
            .accounts({
                auctionAdmin: ADMIN_KEYPAIR.publicKey,
            })
            .instruction();

        tx.add(ix);
        tx.feePayer = ADMIN_KEYPAIR.publicKey;

        const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash("confirmed");

        tx.recentBlockhash = blockhash;

        const signature = await connection.sendTransaction(
            tx,
            [ADMIN_KEYPAIR],
            { skipPreflight: false }
        );

        const confirmation = await connection.confirmTransaction(
            {
                signature,
                blockhash,
                lastValidBlockHeight,
            },
            "finalized"
        );

        if (confirmation.value.err) {
            throw new Error(
                `Start auction tx failed: ${JSON.stringify(confirmation.value.err)}`
            );
        }

        console.log("Auction started:", signature);
        return signature;

    } catch (error) {
        console.error("Start auction failed:", error);
        throw error;
    }
}

async function endAuction(auctionId: number) {
    try {
        const tx = new Transaction();
        tx.feePayer = ADMIN_KEYPAIR.publicKey;

        const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash("confirmed");

        tx.recentBlockhash = blockhash;

        const auctionAccountPda = await auctionPda(auctionId);
        const auctionData = await auctionProgram.account.auction.fetch(
            auctionAccountPda
        );

        const prizeMint = auctionData.prizeMint;
        const bidMint = auctionData.bidMint ?? FAKE_MINT;

        const prizeEscrow = await getAtaAddress(
            connection,
            prizeMint,
            auctionAccountPda,
            true
        );

        const creatorPrizeAta = await getAtaAddress(
            connection,
            prizeMint,
            auctionData.creator
        );

        let winnerPrizeAta = FAKE_ATA;

        if (!auctionData.highestBidder.equals(PublicKey.default)) {
            const prizeTokenProgram = await getTokenProgramFromMint(
                connection,
                prizeMint
            );

            const res = await ensureAtaIx({
                connection,
                mint: prizeMint,
                owner: auctionData.highestBidder,
                payer: ADMIN_KEYPAIR.publicKey,
                tokenProgram: prizeTokenProgram,
            });

            winnerPrizeAta = res.ata;
            if (res.ix) tx.add(res.ix);
        }

        const prizeTokenProgram = await getTokenProgramFromMint(
            connection,
            prizeMint
        );

        const bidTokenProgram = await getTokenProgramFromMint(
            connection,
            bidMint
        );

        let bidEscrow = FAKE_ATA;
        let bidFeeTreasuryAta = FAKE_ATA;
        let creatorBidAta = FAKE_ATA;

        if (auctionData.bidMint !== null) {
            bidEscrow = await getAtaAddress(
                connection,
                bidMint,
                auctionAccountPda,
                true
            );

            const feeTreasuryRes = await ensureAtaIx({
                connection,
                mint: bidMint,
                owner: auctionConfigPda,
                payer: ADMIN_KEYPAIR.publicKey,
                tokenProgram: bidTokenProgram,
                allowOwnerOffCurve: true,
            });

            bidFeeTreasuryAta = feeTreasuryRes.ata;
            if (feeTreasuryRes.ix) {
                tx.add(feeTreasuryRes.ix);
            }

            const creatorBidRes = await ensureAtaIx({
                connection,
                mint: bidMint,
                owner: auctionData.creator,
                payer: ADMIN_KEYPAIR.publicKey,
                tokenProgram: bidTokenProgram,
            });

            creatorBidAta = creatorBidRes.ata;
            if (creatorBidRes.ix) {
                tx.add(creatorBidRes.ix);
            }
        }

        if (bidEscrow === undefined || bidFeeTreasuryAta === undefined || creatorBidAta === undefined || winnerPrizeAta === undefined) {
            throw new Error("Required ATA or escrow account could not be determined");
        }

        const ix = await auctionProgram.methods.completeAuction(auctionId)
            .accounts({
                auctionAdmin: ADMIN_KEYPAIR.publicKey,
                creator: auctionData.creator,
                winner: auctionData.highestBidder,

                prizeMint,
                bidMint: bidMint || FAKE_MINT,

                prizeEscrow,
                bidEscrow,

                creatorPrizeAta,
                winnerPrizeAta,

                bidFeeTreasuryAta,
                creatorBidAta,

                prizeTokenProgram,
                bidTokenProgram,
            })
            .instruction();

        tx.add(ix);

        const signature = await connection.sendTransaction(
            tx,
            [ADMIN_KEYPAIR],
            { skipPreflight: false }
        );

        const confirmation = await connection.confirmTransaction(
            {
                signature,
                blockhash,
                lastValidBlockHeight,
            },
            "finalized"
        );

        if (confirmation.value.err) {
            throw new Error(
                `Start auction tx failed: ${JSON.stringify(confirmation.value.err)}`
            );
        }

        console.log("Auction ended:", signature);
        return signature;

    } catch (error) {
        console.error("End auction failed:", error);
        throw error;
    }
}

const gumballPda = async (gumballId: number): Promise<PublicKey> => {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("gumball"),
            new anchor.BN(gumballId).toArrayLike(Buffer, "le", 4),
        ],
        GUMBALL_PROGRAM_ID
    )[0];
};

const gumballConfigPda = PublicKey.findProgramAddressSync(
    [Buffer.from("gumball")],
    GUMBALL_PROGRAM_ID
)[0];

async function startGumball(gumballId: number) {
    try {
        const tx = new Transaction();
        tx.feePayer = ADMIN_KEYPAIR.publicKey;

        const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash("confirmed");

        tx.recentBlockhash = blockhash;

        const ix = await gumballProgram.methods.activateGumball(gumballId)
            .accounts({
                gumballAdmin: ADMIN_KEYPAIR.publicKey,
            })
            .instruction();

        tx.add(ix);

        const signature = await connection.sendTransaction(
            tx,
            [ADMIN_KEYPAIR],
            { skipPreflight: false }
        );

        const confirmation = await connection.confirmTransaction(
            {
                signature,
                blockhash,
                lastValidBlockHeight,
            },
            "finalized"
        );

        if (confirmation.value.err) {
            throw new Error(
                `Start auction tx failed: ${JSON.stringify(confirmation.value.err)}`
            );
        }

        console.log("Gumball started:", signature);
        return signature;

    } catch (error) {
        console.error("Start gumball failed:", error);
        throw error;
    }
}

async function endGumball(gumballId: number) {
    try {
        const tx = new Transaction();
        tx.feePayer = ADMIN_KEYPAIR.publicKey;

        const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash("confirmed");

        tx.recentBlockhash = blockhash;

        const gumballAddress = await gumballPda(gumballId);

        const gumballState = await gumballProgram.account.gumballMachine.fetch(gumballAddress);

        const ticketMint: PublicKey | null = gumballState.ticketMint;

        const ticketTokenProgram = ticketMint
            ? await getTokenProgramFromMint(connection, ticketMint)
            : TOKEN_PROGRAM_ID;

        let ticketEscrow = FAKE_ATA;
        let ticketFeeEscrowAta = FAKE_ATA;
        let creatorTicketAta = FAKE_ATA;

        if (ticketMint) {
            const ticketEscrowRes = await ensureAtaIx({
                connection,
                mint: ticketMint,
                owner: gumballAddress,
                payer: wallet.publicKey,
                tokenProgram: ticketTokenProgram,
                allowOwnerOffCurve: true, // PDA owner
            });

            ticketEscrow = ticketEscrowRes.ata;
            if (ticketEscrowRes.ix) tx.add(ticketEscrowRes.ix);

            const feeTreasuryRes = await ensureAtaIx({
                connection,
                mint: ticketMint,
                owner: gumballConfigPda,
                payer: wallet.publicKey,
                tokenProgram: ticketTokenProgram,
                allowOwnerOffCurve: true,
            });

            ticketFeeEscrowAta = feeTreasuryRes.ata;
            if (feeTreasuryRes.ix) tx.add(feeTreasuryRes.ix);

            const creatorTicketRes = await ensureAtaIx({
                connection,
                mint: ticketMint,
                owner: gumballState.creator,
                payer: wallet.publicKey,
                tokenProgram: ticketTokenProgram,
            });

            creatorTicketAta = creatorTicketRes.ata;
            if (creatorTicketRes.ix) tx.add(creatorTicketRes.ix);
        }

        if (ticketEscrow === undefined || ticketFeeEscrowAta === undefined || creatorTicketAta === undefined) {
            throw new Error("Required ATA or escrow account could not be determined");
        }

        const ix = await gumballProgram.methods
            .endGumball(gumballId)
            .accounts({
                gumballAdmin: ADMIN_KEYPAIR.publicKey,
                creator: gumballState.creator,

                ticketMint: ticketMint || FAKE_MINT,

                ticketEscrow,
                ticketFeeEscrowAta,
                creatorTicketAta,

                ticketTokenProgram,
            })
            .instruction();

        tx.add(ix);

        const signature = await connection.sendTransaction(
            tx,
            [ADMIN_KEYPAIR],
            { skipPreflight: false }
        );

        const confirmation = await connection.confirmTransaction(
            {
                signature,
                blockhash,
                lastValidBlockHeight,
            },
            "finalized"
        );

        if (confirmation.value.err) {
            throw new Error(
                `Start auction tx failed: ${JSON.stringify(confirmation.value.err)}`
            );
        }

        console.log("Gumball ended:", signature);
        return signature;
    } catch (error) {
        console.error("End gumball failed:", error);
        throw error;
    }
}

export { announceWinners, startAuction, endAuction, startGumball, endGumball, connection, provider, ADMIN_KEYPAIR };
