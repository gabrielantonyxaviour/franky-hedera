'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSetActiveWallet } from '@privy-io/wagmi';
import { useAccount } from 'wagmi';

// Helper to shorten addresses for display
const shortenAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function Button() {
  // Privy hooks
  const { ready, user, authenticated, login, connectWallet, logout, linkWallet } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  // WAGMI hooks
  const { address, isConnected } = useAccount();
  const { setActiveWallet } = useSetActiveWallet();

  if (!ready) {
    return (
      <button
        className="w-full py-3 bg-gray-600 rounded-lg font-bold transition-colors mb-4 cursor-not-allowed opacity-70"
        disabled
      >
        Loading...
      </button>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex flex-col gap-4 w-full">
        <button
          onClick={login}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition-colors mb-2"
        >
          Login with Privy
        </button>
        <button
          onClick={connectWallet}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold transition-colors"
        >
          Connect Wallet Only
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="p-4 bg-gray-700 rounded-lg">
        <p className="text-sm mb-2">You are connected with Privy!</p>
        {address && (
          <p className="font-mono text-sm bg-gray-800 p-2 rounded">
            Address: {shortenAddress(address)}
          </p>
        )}
      </div>

      {walletsReady && wallets.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm">Your wallets:</p>
          {wallets.map((wallet) => (
            <div
              key={wallet.address}
              className="flex justify-between items-center bg-gray-700 p-3 rounded-lg"
            >
              <span className="font-mono text-sm">{shortenAddress(wallet.address)}</span>
              <button
                onClick={() => setActiveWallet(wallet)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
              >
                Make Active
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={connectWallet}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold transition-colors"
        >
          Connect Another Wallet
        </button>
        
        <button
          onClick={linkWallet}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
        >
          Link Another Wallet
        </button>
        
        <button
          onClick={logout}
          className="w-full py-2 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
} 