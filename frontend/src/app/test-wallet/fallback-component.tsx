'use client'

import { useEffect, useState } from 'react'

export function FallbackWeb3Modal() {
  const [isLoaded, setIsLoaded] = useState(false)
  
  useEffect(() => {
    // First try to load the universal provider directly
    const loadUniversalProvider = async () => {
      try {
        // Dynamically import the universal provider
        const { UniversalProvider } = await import('@walletconnect/universal-provider')
        console.log('Universal provider imported successfully:', !!UniversalProvider)
        
        // Store on window for debugging
        ;(window as any).UniversalProvider = UniversalProvider
        setIsLoaded(true)
      } catch (e) {
        console.error('Failed to load UniversalProvider directly:', e)
        // Fall back to CDN script
        loadViaScript()
      }
    }
    
    // Fallback: Add Web3Modal scripts via CDN
    const loadViaScript = () => {
      const scriptId = 'web3modal-script'
      
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script')
        script.id = scriptId
        script.src = 'https://unpkg.com/@web3modal/standalone@2.4.1/dist/index.umd.js'
        script.async = true
        
        script.onload = () => {
          // Initialize web3modal once loaded - if window.Web3Modal exists
          if ((window as any).Web3Modal) {
            const web3modal = new (window as any).Web3Modal.Web3Modal({
              projectId: '07ae1f8ae1086fd0dfb5547956caa349',
              themeMode: 'dark',
              themeVariables: {
                '--w3m-accent': '#00FF88',
              }
            })
            
            // Store in window for easy access
            ;(window as any).web3modal = web3modal
            console.log('Web3Modal initialized directly via CDN')
            setIsLoaded(true)
          }
        }
        
        script.onerror = () => {
          console.error('Failed to load Web3Modal script')
        }
        
        document.body.appendChild(script)
      }
    }
    
    loadUniversalProvider()
  }, [])
  
  return (
    <div className="mt-8 p-4 border border-gray-700 rounded-lg">
      <h3 className="text-lg font-medium text-gray-300 mb-4">Fallback Web3Modal</h3>
      <p className="text-sm text-gray-400 mb-4">
        If the AppKit button doesn't work, try this direct implementation:
      </p>
      <button 
        onClick={() => {
          if ((window as any).web3modal) {
            (window as any).web3modal.openModal()
          } else if ((window as any).UniversalProvider) {
            // Try to create a provider instance if available
            alert('Attempting to create a direct Universal Provider instance')
            try {
              const provider = new (window as any).UniversalProvider({
                projectId: '07ae1f8ae1086fd0dfb5547956caa349',
                metadata: {
                  name: 'Franky',
                  description: 'Direct WalletConnect integration',
                  url: window.location.origin,
                  icons: ['https://example.com/franky-logo.png']
                }
              })
              provider.connect()
                .then(() => console.log('Connected!'))
                .catch((e: any) => console.error('Connection error:', e))
            } catch (e) {
              console.error('Failed to create provider:', e)
              alert('Failed to create provider. See console for details.')
            }
          } else {
            alert('Web3Modal not initialized yet. Please wait a moment and try again.')
          }
        }}
        disabled={!isLoaded}
        className={`w-full py-3 ${
          isLoaded 
            ? 'bg-purple-600 hover:bg-purple-700' 
            : 'bg-gray-600 cursor-not-allowed'
        } rounded-lg font-bold transition-colors`}
      >
        {isLoaded ? 'Open Direct Web3Modal' : 'Loading Web3Modal...'}
      </button>
    </div>
  )
} 