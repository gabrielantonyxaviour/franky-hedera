import { ethers } from "ethers";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function signMessage(
  messageHash: string,
  privateKey: string
): Promise<string> {
  if (!messageHash.startsWith("0x")) {
    throw new Error("Message hash must be a hex string starting with 0x");
  }

  if (messageHash.length !== 66) {
    // 0x + 64 chars
    throw new Error(
      "Message hash must be a bytes32 value (32 bytes / 64 hex chars)"
    );
  }

  // Create a wallet instance from the private key
  const wallet = new ethers.Wallet(privateKey);

  // Sign the message hash
  const messageHashBytes = ethers.utils.arrayify(messageHash);
  const signature = await wallet._signingKey().signDigest(messageHashBytes);

  // Convert the signature to the expected format
  const sig = ethers.utils.joinSignature(signature);

  return sig;
}
