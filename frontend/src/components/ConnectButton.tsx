'use client'

import { usePrivy } from '@privy-io/react-auth'

export const ConnectButton = () => {
  const { login, logout, authenticated, ready } = usePrivy();
  
  if (!ready) {
    return (
      <div className="flex justify-center">
        <button className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed">
          Loading...
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex justify-center">
      {authenticated ? (
        <button 
          onClick={logout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
        >
          Disconnect
        </button>
      ) : (
        <button 
          onClick={login}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
        >
          Connect Wallet
        </button>
      )}
    </div>
  )
} 