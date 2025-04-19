test-wallet/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { modal } from '@/context'
import { FallbackWeb3Modal } from './fallback-component'
import Link from 'next/link'

export default function TestWalletPage() {
  const [isClient, setIsClient] = useState(false)
  
  // Set isClient to true after component mounts to avoid SSR issues
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-8">REOWN AppKit Wallet Test</h1>
      
      <div className="w-full max-w-md p-6 bg-gray-800 rounded-xl shadow-lg">
        <div className="flex flex-col items-center">
          <p className="mb-6 text-center">
            Connect your wallet using the button below:
          </p>
          
          {isClient && (
            <>
              <div className="mb-6">
                <appkit-button />
              </div>
              
              <button
                onClick={() => modal.open()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold transition-colors mb-4"
              >
                Manual Open Modal
              </button>
              
              <Link href="/direct-example" className="w-full">
                <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors">
                  Try Direct WalletConnect Implementation
                </button>
              </Link>
            </>
          )}
        </div>
        
        <div className="mt-6 text-sm text-gray-400">
          <p className="mt-2">
            This page is used to test the REOWN AppKit integration in isolation.
          </p>
        </div>
        
        {isClient && <FallbackWeb3Modal />}
      </div>
    </div>
  )
} 

components/wallet/appkitprovider.tsx

'use client'

import { modal } from '@/context'
import { useAppKit as useReownAppKit, useAppKitAccount } from '@reown/appkit/react'
import { createContext, useContext, ReactNode, useEffect, useState } from 'react'

// Create context to provide AppKit functionality to components
interface AppKitContextType {
  connect: () => Promise<{selectedChain: string; address: string} | undefined>
  address: string | undefined
  isConnected: boolean
}

const AppKitContext = createContext<AppKitContextType | null>(null)

// Provider component to wrap sections that need AppKit access
export function AppKitProvider({ children }: { children: ReactNode }) {
  const { open } = useReownAppKit()
  const { address, isConnected } = useAppKitAccount()
  const [isClient, setIsClient] = useState(false)
  
  // Set isClient to true after component mounts to avoid SSR issues
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Connect function that wraps the AppKit open method
  const connect = async () => {
    try {
      // Open the AppKit modal
      await open()
      
      // If connected, return the chain and address
      if (address) {
        return { 
          selectedChain: 'eth', // Default to ethereum for now
          address 
        }
      }
      
      return undefined
    } catch (error) {
      console.error('Error connecting wallet:', error)
      return undefined
    }
  }
  
  // Provide AppKit values to children
  return (
    <AppKitContext.Provider 
      value={{ 
        connect, 
        address: isClient ? address : undefined, 
        isConnected: isClient ? isConnected : false
      }}
    >
      {children}
    </AppKitContext.Provider>
  )
}

// Hook to use AppKit functionality in components
export function useAppKit() {
  const context = useContext(AppKitContext)
  
  if (!context) {
    throw new Error('useAppKit must be used within an AppKitProvider')
  }
  
  return context
} 

components/wallet/connectbutton.tsx

'use client'

import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useWalletStore } from '@/store/useWalletStore'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface ConnectButtonProps {
  className?: string
}

export function ConnectButton({ className = '' }: ConnectButtonProps) {
  const [web3ModalAvailable, setWeb3ModalAvailable] = useState(true)
  const { isConnected, address, disconnect } = useWalletStore()
  
  // Get Web3Modal hook safely
  let web3ModalHook: { open?: () => void } = {}
  try {
    web3ModalHook = useWeb3Modal()
  } catch (error) {
    console.error('Error using Web3Modal hook:', error)
    web3ModalHook = {}
  }
  
  const { open } = web3ModalHook
  
  // Check if Web3Modal is available
  useEffect(() => {
    try {
      if (typeof open !== 'function') {
        setWeb3ModalAvailable(false)
        console.warn('Web3Modal open function not available')
      } else {
        setWeb3ModalAvailable(true)
      }
    } catch (error) {
      console.error('Error checking Web3Modal availability:', error)
      setWeb3ModalAvailable(false)
    }
  }, [open])
  
  // Format address for display
  const formatAddress = (addr: string) => {
    if (!addr) return ''
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }
  
  // Handle connect click with fallback
  const handleConnectClick = () => {
    try {
      if (open && typeof open === 'function') {
        open()
      } else {
        console.warn('Web3Modal open function not available')
        alert('Wallet connection is currently unavailable. Please try again later.')
      }
    } catch (error) {
      console.error('Error opening Web3Modal:', error)
      alert('Failed to open wallet connection dialog. Please try again later.')
    }
  }
  
  return (
    <motion.button
      onClick={isConnected ? disconnect : handleConnectClick}
      className={`px-4 py-2 rounded-lg bg-black/50 border border-[#00FF88] border-opacity-50 text-[#00FF88] hover:bg-[#00FF88] hover:bg-opacity-10 transition-colors ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {isConnected ? formatAddress(address || '') : 'Connect Wallet'}
    </motion.button>
  )
} 

components/wallet/walletprovider.tsx

'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { useWalletStore } from '@/store/useWalletStore'
import { useAccount, useDisconnect } from 'wagmi'

export function WalletProvider({ children }: { children: ReactNode }) {
  const { setConnected, setAddress, disconnect: storeDisconnect } = useWalletStore()
  const { address, isConnected } = useAccount()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const initializedRef = useRef(false)
  
  // Sync wagmi state with our store
  useEffect(() => {
    try {
      if (isConnected && address) {
        setConnected(true)
        setAddress(address)
      } else if (!isConnected) {
        setConnected(false)
        setAddress(null)
      }
    } catch (error) {
      console.error('Error syncing wallet state:', error)
    }
  }, [isConnected, address, setConnected, setAddress])
  
  // Handle disconnect
  const handleDisconnect = () => {
    try {
      wagmiDisconnect()
      storeDisconnect()
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
      // Fallback to just using store disconnect
      storeDisconnect()
    }
  }
  
  // Expose disconnect method to the store - only once on mount
  useEffect(() => {
    if (!initializedRef.current) {
      try {
        initializedRef.current = true
        const originalDisconnect = storeDisconnect
        
        // Set the disconnect handler only once
        useWalletStore.setState({ disconnect: handleDisconnect })
        
        // Restore original disconnect on unmount
        return () => {
          try {
            useWalletStore.setState({ disconnect: originalDisconnect })
          } catch (error) {
            console.error('Error restoring disconnect handler:', error)
          }
        }
      } catch (error) {
        console.error('Error setting up disconnect handler:', error)
      }
    }
  }, []) // Empty dependency array to run only once
  
  return <>{children}</>
} 

components/wallet/web3modalprovider.tsx

'use client'

import { ReactNode } from 'react'
import { useWeb3Modal } from '@web3modal/wagmi/react'

interface Web3ModalProviderProps {
  children?: ReactNode
}

export function Web3ModalProvider({ children }: Web3ModalProviderProps) {
  const { open } = useWeb3Modal()
  
  return (
    <>
      {children}
      <button 
        onClick={() => open()}
        className="hidden"
        id="web3modal-opener"
      >
        Open Web3Modal
      </button>
    </>
  )
}

// Helper function to open the Web3Modal programmatically
export function openWeb3Modal() {
  if (typeof window !== 'undefined') {
    const button = document.getElementById('web3modal-opener')
    if (button) {
      button.click()
    }
  }
} 

components/wallet/web3modalbutton.tsx

'use client'

import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useEffect } from 'react'

// Global variable to store the open function
let openWeb3ModalFn: (() => void) | null = null

export function Web3ModalButton() {
  const { open } = useWeb3Modal()
  
  useEffect(() => {
    // Store the open function in the global variable
    openWeb3ModalFn = open
    
    return () => {
      openWeb3ModalFn = null
    }
  }, [open])
  
  return null
}

// Function to open the Web3Modal
export function openWeb3Modal() {
  if (openWeb3ModalFn) {
    openWeb3ModalFn()
  } else {
    console.error('Web3Modal open function not available')
  }
} 

src/config/index.ts:

import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, sepolia } from '@reown/appkit/networks'
import { cookieStorage, createStorage, http } from '@wagmi/core'

// Get projectId from environment variables
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '07ae1f8ae1086fd0dfb5547956caa349'

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Define networks to support - only EVM networks, focusing on mainnet
export const networks = [mainnet, sepolia] as any

// Set up the Wagmi Adapter (Config) with simple configuration
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks,
  // Simplified transports to reduce complexity
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http()
  }
})

// Export Wagmi config for use in providers
export const config = wagmiAdapter.wagmiConfig 

