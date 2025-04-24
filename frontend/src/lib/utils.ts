import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createPublicClient, createWalletClient, Hex, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { filecoinCalibration, hederaTestnet } from "viem/chains"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortenAddress(address: `0x${string}`) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export const publicClient = createPublicClient({
  chain: hederaTestnet,
  transport: http()
})

export const faucetWalletClient = createWalletClient({
  chain: hederaTestnet,
  transport: http(),
  account: privateKeyToAccount((process.env.NEXT_PUBLIC_PRIVATE_KEY || "0x") as Hex)
})