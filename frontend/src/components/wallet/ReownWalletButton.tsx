'use client'

import { useState, useEffect } from 'react'
import { FiSmartphone, FiCheck } from 'react-icons/fi'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useAccount } from 'wagmi'
import { modal } from '@/components/ReownProviders'

export default function ReownWalletButton({
  buttonText = 'Connect Wallet',
  className = '',
  fullWidth = false,
  showAddress = true,
  onConnect = () => {},
  onDisconnect = () => {},
}) {
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
  
  // Handle connection status changes
  useEffect(() => {
    if (isConnected && address) {
      onConnect()
    } else if (!isConnected) {
      onDisconnect()
    }
  }, [isConnected, address, onConnect, onDisconnect])

  // Connect wallet function
  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true)
      await open()
    } catch (error) {
      console.error('Error connecting wallet:', error)
      
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

  // Return the shortened address
  const shortenAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }
  
  // Connected state
  if (isConnected && address && showAddress) {
    return (
      <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-[#00FF88]/20">
        <div className="flex items-center">
          <div className="flex justify-center items-center h-6 w-6 rounded-full bg-[#00FF88]/20 mr-2">
            <FiCheck className="text-[#00FF88] text-sm" />
          </div>
          <span className="text-[#00FF88] text-sm font-medium">
            {shortenAddress(address)}
          </span>
        </div>
      </div>
    )
  }

  // Not connected or address hiding is enabled
  return (
    <button
      onClick={handleConnectWallet}
      disabled={isConnecting || isConnected}
      className={`${
        fullWidth ? 'w-full' : ''
      } ${className} px-4 py-3 bg-gradient-to-r from-[#00FF88]/20 to-emerald-500/20 hover:from-[#00FF88]/30 hover:to-emerald-500/30 backdrop-blur-sm rounded-lg transition-all border border-[#00FF88]/30 focus:outline-none flex items-center justify-center ${isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isConnecting ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#00FF88]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-bold">Connecting...</span>
        </>
      ) : isConnected ? (
        <>
          <FiCheck className="mr-3 text-xl" />
          <span className="font-bold">Connected</span>
        </>
      ) : (
        <>
          <FiSmartphone className="mr-3 text-xl" />
          <span className="font-bold">{buttonText}</span>
        </>
      )}
    </button>
  )
} 