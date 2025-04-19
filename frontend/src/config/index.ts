import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet, sepolia, defineChain } from "@reown/appkit/networks";
import { http } from "viem";
import { createStorage, cookieStorage } from "@wagmi/core";

// Your project ID from Reown
export const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ||
  "2b1e04f4-3198-42a3-bbf1-ec5c19366cb8";

// Define Base Sepolia as a custom network
const baseSepolia = defineChain({
  id: 84532,
  caipNetworkId: "eip155:84532",
  chainNamespace: "eip155",
  name: "Base Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [
        `https://base-sepolia.nodit.io/${process.env.NEXT_PUBLIC_NODIT_API_KEY}`,
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "BaseScan",
      url: "https://sepolia.basescan.org",
    },
  },
});

const base = defineChain({
  id: 8453,
  caipNetworkId: "eip155:8453",
  chainNamespace: "eip155",
  name: "Base Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [
        `https://base-mainnet.nodit.io/${process.env.NEXT_PUBLIC_NODIT_API_KEY}`,
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "BaseScan",
      url: "https://basescan.org",
    },
  },
});

// Define networks to support - only EVM networks, focusing on mainnet
export const networks = [base] as any;

// Set up the Wagmi Adapter (Config) with simple configuration
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks,
  // Simplified transports to reduce complexity
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [base.id]: http(
      `https://base-mainnet.nodit.io/${process.env.NEXT_PUBLIC_NODIT_API_KEY}`
    ),
  },
});

// Export Solana adapter as null to avoid undefined errors
export const solanaWeb3JsAdapter = null;
