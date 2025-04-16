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