import { defaultWagmiConfig } from '@web3modal/wagmi'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { arbitrum, mainnet, polygon } from 'viem/chains'

// Get projectId from environment variable
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || '07ae1f8ae1086fd0dfb5547956caa349'

// Project metadata
const metadata = {
  name: 'FRANKY',
  description: 'Custom AI Agent Creator',
  url: 'https://franky.ai',
  icons: ['/logo.svg']
}

// Create wagmi config with supported chains
export const wagmiConfig = defaultWagmiConfig({
  chains: [mainnet, polygon, arbitrum] as const,
  projectId,
  metadata
})

// Track initialization status
let isInitialized = false

// Initialize Web3Modal on client side
export function createWeb3ModalInstance() {
  // Only run on client and only initialize once
  if (typeof window === 'undefined' || isInitialized) {
    return
  }
  
  try {
    // Set flag before initialization to prevent multiple attempts
    isInitialized = true
    
    // Delay initialization to ensure DOM is fully loaded
    setTimeout(() => {
      try {
        createWeb3Modal({
          wagmiConfig,
          projectId,
          themeMode: 'dark'
        })
        console.log('Web3Modal initialized successfully')
      } catch (error) {
        console.error('Failed to initialize Web3Modal (delayed):', error)
        isInitialized = false
      }
    }, 500)
  } catch (error) {
    console.error('Failed to setup Web3Modal initialization:', error)
    isInitialized = false
  }
} 