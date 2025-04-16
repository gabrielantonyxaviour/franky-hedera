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