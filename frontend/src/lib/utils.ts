import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createPublicClient, createWalletClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { filecoinCalibration } from "viem/chains"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const publicClient = createPublicClient({
  chain: filecoinCalibration,
  transport: http()
})

export const faucetWalletClient = createWalletClient({
  account: privateKeyToAccount(process.env.NEXT_PUBLIC_FAUCET_WALLET as `0x${string}`),
  chain: filecoinCalibration,
  transport: http(),
})