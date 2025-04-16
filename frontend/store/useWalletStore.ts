import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WalletState {
  isConnected: boolean
  address: string | null
  setConnected: (connected: boolean) => void
  setAddress: (address: string | null) => void
  disconnect: () => void
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      isConnected: false,
      address: null,
      setConnected: (connected) => set({ isConnected: connected }),
      setAddress: (address) => set({ address }),
      disconnect: () => set({ isConnected: false, address: null }),
    }),
    {
      name: 'wallet-storage',
    }
  )
) 