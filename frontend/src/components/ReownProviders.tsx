'use client'

import { createConfig, http } from 'wagmi'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { WagmiProvider } from 'wagmi'
import { base, baseSepolia } from 'viem/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, createContext } from 'react'

// Create modal context to provide modal functionality
export const modal = createContext({
  open: () => {},
  close: () => {}
})

// Get projectId from env
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

// Create wagmi config
const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http()
  }
})

// Create web3modal
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  chains: [base, baseSepolia],
  themeMode: 'dark'
})

// Create query client
const queryClient = new QueryClient()

export function ReownProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
} 