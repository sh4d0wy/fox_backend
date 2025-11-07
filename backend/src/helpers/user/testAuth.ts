import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import axios from "axios";

const BACKEND_URL = "http://localhost:3000"; // your backend URL

(async () => {
  try {
    // Step 1: Generate wallet
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    console.log("Wallet Public Key:", publicKey);

    // Step 2: Request message from backend
    const { data: messageData } = await axios.get(`${BACKEND_URL}/api/user/auth/request-message/${keypair.publicKey}`);
    console.log("\n[Message Payload from Server]");
    console.log(messageData);

    const message = messageData.message;
    if (!message) {
      console.error("Failed to get message from server");
      process.exit(1);
    }

    // Step 3: Sign message using tweetnacl
    const messageBytes = new TextEncoder().encode("asdf");
    const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
    const signature = bs58.encode(signatureBytes);

    console.log("\n[Signed Message]");
    console.log("Signature:", signature);

    // Step 4: Send signature for verification
    const verifyPayload = { publicKey, signature, message };
    const { data: verifyResponse } = await axios.post(`${BACKEND_URL}/api/user/auth/verify`, verifyPayload);

    console.log("\n[Verification Response]");
    console.log(verifyResponse);

  } catch (err: any) {
    console.error("\n❌ Error:", err.response?.data || err.message);
  }
})();
