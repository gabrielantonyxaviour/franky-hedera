"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hederaTestnet = void 0;
const viem_1 = require("viem");
exports.hederaTestnet = (0, viem_1.defineChain)({
    id: 0x128,
    name: 'HederaTestnet',
    network: 'hedera-testnet',
    nativeCurrency: {
        symbol: 'ℏ',
        name: 'HBAR',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://testnet.hashio.io/api'],
        },
        public: {
            http: ['https://testnet.hashio.io/api'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Hashscan',
            url: 'https://hashscan.io/testnet'
        },
    },
    contracts: {},
});
