import { Connection } from "@solana/web3.js";

export const verifyTransaction = async (txSignature: string) => {
  const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com");

  const res = await connection.getSignatureStatuses(
    [txSignature],
    { searchTransactionHistory: true }
  );

  const tx = res.value[0];

  if (!tx || tx.err) return false;

  return (
    tx.confirmationStatus === "confirmed" ||
    tx.confirmationStatus === "finalized"
  );
};
