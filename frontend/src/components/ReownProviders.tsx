'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import React, { type ReactNode } from 'react'
import { wagmiAdapter } from '@/config'
import { createAppKit } from '@reown/appkit/react'

// Set up queryClient
const queryClient = new QueryClient()

// Set up metadata
const metadata = {
  name: 'Franky App',
  description: 'Deploy devices and create AI agents',
  url: 'https://franky.ai',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Create the modal for use in components
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
  networks: wagmiAdapter.networks,
  metadata,
  themeMode: 'dark',
  chainImages: {
    84532: 'https://avatars.githubusercontent.com/u/108554348?s=280&v=4'
  },
  features: {
    email: true,
    socials: ['google', 'x', 'github', 'discord', 'apple', 'facebook', 'farcaster'],
    emailShowWallets: true,
    swaps: true,
    onramp: true,
    connectMethodsOrder: ['email', 'social'],
    smartAccount: {
      enabled: true,
      showSwitchModal: true
    }
  }
} as any)

interface ReownProvidersProps {
  children: ReactNode;
  cookies?: string | null;
}

export default function ReownProviders({ children, cookies = null }: ReownProvidersProps) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as any}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
} 