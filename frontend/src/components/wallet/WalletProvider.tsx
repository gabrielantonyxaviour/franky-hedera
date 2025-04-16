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