'use client'

import { useState, useEffect } from 'react'
import { FiUser } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useAccount } from 'wagmi'
import { modal } from '@/components/ReownProviders'

export default function ReownWalletHeader() {
  const [isClient, setIsClient] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  
  // Set isClient to true after component mounts to avoid SSR issues
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Get AppKit hooks
  const { open } = useAppKit()
  const { address: appKitAddress, isConnected: appKitIsConnected } = useAppKitAccount()
  
  // Use wagmi account as backup
  const account = useAccount()
  
  // Determine the best address to use (prefer AppKit's address if available)
  const address = appKitAddress || account.address
  const isConnected = appKitIsConnected || !!account.address
  
  // Connect wallet function - always opens modal whether connected or not
  const handleWalletAction = async () => {
    try {
      setIsConnecting(true)
      await open()
    } catch (error) {
      console.error('Error opening modal:', error)
      
      // Fallback to modal from context
      try {
        modal.open()
      } catch (err) {
        console.error('Fallback also failed:', err)
      }
    } finally {
      setTimeout(() => {
        setIsConnecting(false)
      }, 500)
    }
  }
  
  // Show nothing during SSR
  if (!isClient) return null
  
  return (
    <motion.button
      onClick={handleWalletAction}
      disabled={isConnecting}
      className={`px-4 py-2 rounded-lg ${isConnected 
        ? 'bg-[#00FF88] bg-opacity-20' 
        : 'bg-[#00FF88] bg-opacity-10'} 
        text-[#00FF88] hover:bg-opacity-30 transition-colors flex items-center gap-2`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {isConnecting ? (
        <>
          <svg className="animate-spin h-4 w-4 text-[#00FF88]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Connecting...</span>
        </>
      ) : isConnected ? (
        <>
          <FiUser />
          <span>Profile</span>
        </>
      ) : (
        <>
          <FiUser />
          <span>Sign in</span>
        </>
      )}
    </motion.button>
  )
} 