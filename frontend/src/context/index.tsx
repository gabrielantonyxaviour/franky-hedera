'use client'

import { wagmiAdapter } from '@/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import React, { type ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { projectId, networks } from '@/config'

// Set up queryClient
const queryClient = new QueryClient()

// Set up metadata
const metadata = {
  name: 'Franky Wallet',
  description: 'Franky Wallet Integration',
  url: 'https://franky.ai',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Define chain images with Base Sepolia
const chainImages = {
  84532: 'https://raw.githubusercontent.com/base-org/brand-kit/001c0e9b40a67799ebe0418671ac4196b6a3ba68/logo/in-product/Base_Network_Logo.svg' // Base Sepolia
}

// Create the modal
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  themeMode: 'light',
  chainImages
} as any)

// Simple ContextProvider component
function ContextProvider({ children }: { children: ReactNode; cookies?: string | null }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as any}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider 