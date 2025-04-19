'use client'

import React, { useEffect, useState } from 'react'

// This is a minimal implementation using WalletConnect's Ethereum Provider
export default function DirectExample() {
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const initializeWalletConnect = async () => {
      try {
        if (typeof window !== 'undefined') {
          // Import Ethereum Provider
          const { default: EthereumProvider } = await import('@walletconnect/ethereum-provider')
          
          // Initialize provider directly
          const provider = await EthereumProvider.init({
            projectId: '07ae1f8ae1086fd0dfb5547956caa349',
            chains: [1], // Ethereum mainnet
            showQrModal: true,
            metadata: {
              name: 'Franky',
              description: 'Direct WalletConnect Integration',
              url: window.location.origin,
              icons: ['https://example.com/franky-logo.png']
            }
          })
          
          console.log('WalletConnect provider initialized:', provider)
          
          // Store on window for debugging
          ;(window as any).wcProvider = provider
          
          // Add button event listener
          const button = document.getElementById('connect-wallet-btn')
          if (button) {
            button.addEventListener('click', async () => {
              try {
                await provider.connect()
                  .then(info => {
                    console.log('Connected!', info)
                  })
                  .catch(e => {
                    console.error('Connection error:', e)
                    setError('Connection failed. See console for details.')
                  })
              } catch (error) {
                console.error('Connection error:', error)
                setError('Connection failed. See console for details.')
              }
            })
          }
          
          setIsInitializing(false)
        }
      } catch (error) {
        console.error('Failed to initialize WalletConnect provider:', error)
        setError('Provider initialization failed. See console for details.')
        setIsInitializing(false)
      }
    }
    
    initializeWalletConnect()
  }, [])
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-8">Direct WalletConnect Example</h1>
      
      <div className="w-full max-w-md p-6 bg-gray-800 rounded-xl shadow-lg">
        <div className="flex flex-col items-center">
          <p className="mb-6 text-center">
            This example uses the WalletConnect Ethereum Provider directly
          </p>
          
          {error && (
            <div className="w-full p-3 mb-4 bg-red-800 bg-opacity-50 rounded-lg text-sm text-white">
              {error}
            </div>
          )}
          
          <button
            id="connect-wallet-btn"
            disabled={isInitializing}
            className={`w-full py-3 ${
              isInitializing 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700'
            } rounded-lg font-bold transition-colors`}
          >
            {isInitializing ? 'Initializing...' : 'Connect with WalletConnect'}
          </button>
        </div>
        
        <div className="mt-6 text-sm text-gray-400">
          <p className="mt-2">
            Using direct WalletConnect Ethereum Provider implementation
          </p>
        </div>
      </div>
    </div>
  )
} 