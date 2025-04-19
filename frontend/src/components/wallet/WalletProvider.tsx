'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { useWalletStore } from '@/store/useWalletStore'
import { useAccount, useDisconnect } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'

export function WalletProvider({ children }: { children: ReactNode }) {
  const { setConnected, setAddress, disconnect: storeDisconnect } = useWalletStore()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const initializedRef = useRef(false)
  const { user } = usePrivy()

  // Sync wagmi state with our store
  useEffect(() => {
    try {
      if (user && user.smartWallet) {
        setConnected(true)
        setAddress(user.smartWallet.address)
      } else if (!user) {
        setConnected(false)
        setAddress(null)
      }
    } catch (error) {
      console.error('Error syncing wallet state:', error)
    }
  }, [user, setConnected, setAddress])

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