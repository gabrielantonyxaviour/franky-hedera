require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Load environment variables
const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  "0x0000000000000000000000000000000000000000000000000000000000000000";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hederaTestnet: {
      url: process.env.HEDERA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 296,
    },
  },
  etherscan: {
    apiKey: {
      hederaTestnet: "empty",
    },
    customChains: [
      {
        network: "hederaTestnet",
        chainId: 314159,
        urls: {
          apiURL: "https://hashscan.io/testnet/api",
          browserURL: "https://hashscan.io/testnet",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
