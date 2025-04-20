'use client'

import { modal } from '@/context'
import { useAppKit as useReownAppKit, useAppKitAccount, useAppKitState } from '@reown/appkit/react'
import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

// Create context to provide AppKit functionality to components
interface AppKitContextType {
  connect: () => void
  address: string | undefined
  isConnected: boolean
  networkId?: string | number
  switchToBaseSepolia: () => void
}

const AppKitContext = createContext<AppKitContextType | null>(null)

// Provider component to wrap sections that need AppKit access
export function AppKitProvider({ children }: { children: ReactNode }) {
  // Use Reown hooks directly
  const reownAppKit = useReownAppKit()
  const { address: appKitAddress, isConnected: appKitIsConnected } = useAppKitAccount()
  const { selectedNetworkId } = useAppKitState()
  
  // Get Wagmi account as backup
  const account = useAccount()
  
  // Combine address and connection status from both sources
  const address = appKitAddress || account.address
  const isConnected = appKitIsConnected || !!account.address
  
  // Simple connect function
  const connect = () => {
    try {
      reownAppKit.open()
    } catch (error) {
      console.error('Error opening modal:', error)
      
      // Fallback to modal from context
      try {
        modal.open()
      } catch (err) {
        console.error('Fallback also failed:', err)
      }
    }
  }
  
  // Function to switch to Base Sepolia
  const switchToBaseSepolia = () => {
    try {
      // Open the modal to let the user switch networks
      reownAppKit.open({
        view: 'Networks'
      })
      
      // We can't directly switch networks through the API
      // as it requires user interaction for security
    } catch (error) {
      console.error('Error opening network selector:', error)
      
      // Fallback to direct modal open
      try {
        modal.open()
      } catch (err) {
        console.error('Fallback also failed:', err)
      }
    }
  }
  
  // Provide context values
  return (
    <AppKitContext.Provider 
      value={{ 
        connect, 
        address,
        isConnected,
        networkId: selectedNetworkId,
        switchToBaseSepolia
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