import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, sepolia } from '@reown/appkit/networks'
import { cookieStorage, createStorage, http } from '@wagmi/core'

// Get projectId from environment variables
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '07ae1f8ae1086fd0dfb5547956caa349'

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Define networks to support - only EVM networks, focusing on mainnet
export const networks = [mainnet, sepolia] as any

// Set up the Wagmi Adapter (Config) with simple configuration
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks,
  // Simplified transports to reduce complexity
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http()
  }
})

// Export Wagmi config for use in providers
export const config = wagmiAdapter.wagmiConfig 