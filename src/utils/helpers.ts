import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { connection, provider } from "../services/solanaconnector";
import { deserializeMetadata } from "@metaplex-foundation/mpl-token-metadata";

export const FAKE_MINT = new PublicKey('So11111111111111111111111111111111111111112');
export const FAKE_ATA = new PublicKey('C3FzbX9n1YD2dow2dCmEv5uNyyf22Gb3TLAEqGBhw5fY');
// export const FAKE_ATA = new PublicKey('B9W4wPFWjTbZ9ab1okzB4D3SsGY7wntkrBKwpp5RC1Uv');

// The official Metaplex Token Metadata Program ID
export const METAPLEX_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
export const MPL_TOKEN_AUTH_RULES_PROGRAM_ID = new PublicKey("auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg");

export async function ensureAtaIx(params: {
  connection: Connection;
  mint: PublicKey;
  owner: PublicKey;
  payer: PublicKey;
  tokenProgram: PublicKey;
  allowOwnerOffCurve?: boolean;
}): Promise<{
  ata: PublicKey;
  ix?: TransactionInstruction;
}> {
  const ata = getAssociatedTokenAddressSync(
    params.mint,
    params.owner,
    params.allowOwnerOffCurve ?? false,
    params.tokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const info = await params.connection.getAccountInfo(ata);

  if (info) {
    return { ata };
  }

  const ix = createAssociatedTokenAccountInstruction(
    params.payer,
    ata,
    params.owner,
    params.mint,
    params.tokenProgram
  );

  return { ata, ix };
}

export async function getTokenProgramFromMint(
  connection: Connection,
  mint: PublicKey
): Promise<PublicKey> {
  const mintAccountInfo = await connection.getAccountInfo(mint);

  if (!mintAccountInfo) {
    throw new Error("Mint account not found");
  }

  const owner = mintAccountInfo.owner;

  if (owner.equals(TOKEN_PROGRAM_ID)) {
    return TOKEN_PROGRAM_ID;
  }

  if (owner.equals(TOKEN_2022_PROGRAM_ID)) {
    return TOKEN_2022_PROGRAM_ID;
  }

  throw new Error("Unsupported token program");
}

export async function getAtaAddress(
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


/**
 * Derives the Metadata PDA for a given mint.
 * Matches: seeds=[b"metadata", program_id, mint]
 */
export const getMetadataPda = (mint: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METAPLEX_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METAPLEX_METADATA_PROGRAM_ID
  )[0];
};

/**
 * Derives the Master Edition PDA for a given mint.
 * Matches: seeds=[b"metadata", program_id, mint, b"edition"]
 */
export const getMasterEditionPda = (mint: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METAPLEX_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    METAPLEX_METADATA_PROGRAM_ID
  )[0];
};

export const getTokenRecordPda = (mint: PublicKey, ata: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METAPLEX_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("token_record"),
      ata.toBuffer(),
    ],
    METAPLEX_METADATA_PROGRAM_ID
  )[0];
};

export const getRuleSet = async (mint: PublicKey) => {
  const metadataPda = getMetadataPda(mint);
  const accountInfo = await connection.getAccountInfo(metadataPda);

  if (!accountInfo) return null;

  // Convert to RpcAccount format for Metaplex deserializer
  const rpcAccount = {
    publicKey: metadataPda,
    executable: accountInfo.executable,
    owner: accountInfo.owner,
    lamports: { basisPoints: BigInt(accountInfo.lamports), identifier: 'SOL', decimals: 9 },
    rentEpoch: accountInfo.rentEpoch,
    data: new Uint8Array(accountInfo.data),
  };

  // Deserialize metadata
  const metadata = deserializeMetadata(rpcAccount as any);

  // Check for programmable configuration
  const programmableConfig = metadata.programmableConfig;
  if (programmableConfig.__option === 'Some' && programmableConfig.value.__kind === 'V1') {
    const ruleSet = programmableConfig.value.ruleSet;
    return ruleSet.__option === 'Some' ? ruleSet.value : null;
  }

  return null;
};
