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