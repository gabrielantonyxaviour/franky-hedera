import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createPublicClient, http } from "viem"
import { filecoinCalibration } from "viem/chains"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const publicClient = createPublicClient({
  chain: filecoinCalibration,
  transport: http()
})