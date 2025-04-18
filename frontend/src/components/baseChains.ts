import { Chain } from 'viem';

// Base Sepolia Testnet Chain Configuration
export const baseSepolia: Chain = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [`https://base-sepolia.nodit.io/${process.env.NEXT_PUBLIC_NODIT_API_KEY}`],
    },
    public: {
      http: [`https://base-sepolia.nodit.io/${process.env.NEXT_PUBLIC_NODIT_API_KEY}`],
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://sepolia.basescan.org',
    },
  },
  testnet: true,
}; 