import { createPublicClient, http } from "viem";
import { filecoinCalibration } from "viem/chains";

export function shortenAddress(address: string): string {
  console.log("[shorten address]");
  console.log(address);
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export const publicClient = createPublicClient({
  chain: filecoinCalibration,
  transport: http(),
})