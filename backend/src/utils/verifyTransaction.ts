import { Connection, clusterApiUrl, Cluster } from "@solana/web3.js";

const NETWORK: Cluster = (process.env.NETWORK as Cluster) || "mainnet-beta";

export const verifyTransaction = async (txSignature: string) => {
  const connection = new Connection(clusterApiUrl(NETWORK));

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
