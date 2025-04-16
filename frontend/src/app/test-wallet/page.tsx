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