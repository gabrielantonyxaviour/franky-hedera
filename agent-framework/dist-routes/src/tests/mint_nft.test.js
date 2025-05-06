"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const dotenv = __importStar(require("dotenv"));
const testnetClient_1 = require("./utils/testnetClient");
const hederaMirrorNodeClient_1 = require("./utils/hederaMirrorNodeClient");
const langchainAgent_1 = require("./utils/langchainAgent");
const utils_1 = require("./utils/utils");
dotenv.config();
const IS_CUSTODIAL = true;
(0, vitest_1.describe)("hedera_mint_nft", () => {
    let langchainAgent;
    let hederaApiClient;
    let networkClientWrapper;
    (0, vitest_1.beforeAll)(async () => {
        hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
        networkClientWrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
    });
    (0, vitest_1.beforeEach)(async () => {
        dotenv.config();
        await (0, utils_1.wait)(3000);
    });
    (0, vitest_1.it)("should mint non-fungible token", async () => {
        const tokenId = await networkClientWrapper.createNFT({
            name: "TokenToMint",
            symbol: "TTM",
            maxSupply: 1000,
        });
        const STARTING_SUPPLY = 0;
        const prompt = {
            user: "user",
            text: `Mint an NFT with metadata "My NFT" to token ${tokenId}`,
        };
        langchainAgent = await langchainAgent_1.LangchainAgent.create();
        await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        await (0, utils_1.wait)(5000);
        const tokenInfo = await hederaApiClient.getTokenDetails(tokenId);
        (0, vitest_1.expect)(Number(tokenInfo.total_supply)).toBe(STARTING_SUPPLY + 1);
    });
});
