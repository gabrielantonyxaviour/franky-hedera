'use client'

import { useDisconnect, useAppKit, useAppKitAccount } from '@reown/appkit/react'

export default function ReownButton() {
  const { open } = useAppKit();
  const { isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    open();
  }

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  }

  return (
    <div className="flex justify-center">
      {isConnected ? (
        <button 
          onClick={handleDisconnect}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
        >
          Disconnect
        </button>
      ) : (
        <button 
          onClick={handleConnect}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
        >
          Connect Wallet
        </button>
      )}
    </div>
  )
}

// Alternative Web Component approach
export const ReownConnectButton = () => {
  return (
    <div className="flex justify-center">
      <appkit-button />
    </div>
  )
} 