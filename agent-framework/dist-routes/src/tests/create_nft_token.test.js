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
const hederaMirrorNodeClient_1 = require("./utils/hederaMirrorNodeClient");
const dotenv = __importStar(require("dotenv"));
const langchainAgent_1 = require("./utils/langchainAgent");
const testnetClient_1 = require("./utils/testnetClient");
const sdk_1 = require("@hashgraph/sdk");
const IS_CUSTODIAL = true;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function extractTokenId(messages) {
    const result = messages.reduce((acc, message) => {
        try {
            const toolResponse = JSON.parse(message.content);
            if (toolResponse.status === "success" && toolResponse.tokenId) {
                return toolResponse.tokenId;
            }
            return acc;
        }
        catch (error) {
            return acc;
        }
    }, null);
    if (!result) {
        throw new Error("No token id found");
    }
    return result;
}
(0, vitest_1.describe)("create_nft_token", () => {
    let langchainAgent;
    let hederaApiClient;
    let wrapper;
    const INFINITE_SUPPLY = 0;
    (0, vitest_1.beforeAll)(async () => {
        wrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
        hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
    });
    (0, vitest_1.beforeEach)(async () => {
        dotenv.config();
        await wait(3000);
    });
    (0, vitest_1.it)("Create NFT token with all possible parameters", async () => {
        const prompt = {
            user: "user",
            text: "Create non-fungible token with name TestToken, symbol TT, and max supply of 100. Set memo to 'This is an example memo' and token metadata to 'And that's an example metadata'. Add admin key. Set metadata key.",
        };
        langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenId = extractTokenId(response.messages);
        await wait(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenId);
        (0, vitest_1.expect)(tokenDetails.symbol).toEqual("TT");
        (0, vitest_1.expect)(tokenDetails.name).toEqual("TestToken");
        (0, vitest_1.expect)(tokenDetails.type).toEqual(sdk_1.TokenType.NonFungibleUnique.toString());
        (0, vitest_1.expect)(Number(tokenDetails.max_supply)).toEqual(100);
        (0, vitest_1.expect)(tokenDetails.memo).toEqual("This is an example memo");
        (0, vitest_1.expect)(atob(tokenDetails.metadata)).toEqual("And that's an example metadata");
        (0, vitest_1.expect)(tokenDetails?.supply_key?.key).toBeTruthy(); // all NFTs have supply key set by default
        (0, vitest_1.expect)(tokenDetails?.admin_key?.key).toBeTruthy();
        (0, vitest_1.expect)(tokenDetails?.metadata_key?.key).toBeTruthy();
    });
    (0, vitest_1.it)("Create without optional keys", async () => {
        const prompt = {
            user: "user",
            text: "Create non-fungible token with name TestToken, symbol TT, and max supply of 100. Set memo to 'This is an example memo' and token metadata to 'And that's an example metadata'. Do not set the metadata and admin keys",
        };
        langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenId = extractTokenId(response.messages);
        await wait(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenId);
        (0, vitest_1.expect)(tokenDetails.symbol).toEqual("TT");
        (0, vitest_1.expect)(tokenDetails.name).toEqual("TestToken");
        (0, vitest_1.expect)(tokenDetails.type).toEqual(sdk_1.TokenType.NonFungibleUnique.toString());
        (0, vitest_1.expect)(Number(tokenDetails.max_supply)).toEqual(100);
        (0, vitest_1.expect)(tokenDetails.memo).toEqual("This is an example memo");
        (0, vitest_1.expect)(atob(tokenDetails.metadata)).toEqual("And that's an example metadata");
        (0, vitest_1.expect)(tokenDetails?.supply_key?.key).toBeTruthy(); // all NFTs have supply key set by default
        (0, vitest_1.expect)(tokenDetails?.admin_key?.key).toBeFalsy();
        (0, vitest_1.expect)(tokenDetails?.metadata_key?.key).toBeFalsy();
    });
    (0, vitest_1.it)("Create token with minimal parameters", async () => {
        const prompt = {
            user: "user",
            text: "Create non-fungible token with name TestToken, symbol TT.",
        };
        langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenId = extractTokenId(response.messages);
        await wait(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenId);
        (0, vitest_1.expect)(tokenDetails.symbol).toEqual("TT");
        (0, vitest_1.expect)(tokenDetails.name).toEqual("TestToken");
        (0, vitest_1.expect)(tokenDetails.type).toEqual(sdk_1.TokenType.NonFungibleUnique.toString());
        (0, vitest_1.expect)(Number(tokenDetails.max_supply)).toEqual(INFINITE_SUPPLY);
        (0, vitest_1.expect)(tokenDetails.memo).toEqual("");
        (0, vitest_1.expect)(tokenDetails.metadata).toEqual("");
        (0, vitest_1.expect)(tokenDetails?.supply_key?.key).toBeTruthy(); // all NFTs have supply key set by default
        (0, vitest_1.expect)(tokenDetails?.admin_key?.key).toBeFalsy();
        (0, vitest_1.expect)(tokenDetails?.metadata_key?.key).toBeFalsy();
    });
    (0, vitest_1.it)("Create token with minimal parameters plus memo and max supply", async () => {
        const prompt = {
            user: "user",
            text: "Create non-fungible token with name TestToken, symbol TT. Set memo to 'This is memo'. Set max supply to 10.",
        };
        langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenId = extractTokenId(response.messages);
        await wait(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenId);
        (0, vitest_1.expect)(tokenDetails.symbol).toEqual("TT");
        (0, vitest_1.expect)(tokenDetails.name).toEqual("TestToken");
        (0, vitest_1.expect)(tokenDetails.type).toEqual(sdk_1.TokenType.NonFungibleUnique.toString());
        (0, vitest_1.expect)(Number(tokenDetails.max_supply)).toEqual(10);
        (0, vitest_1.expect)(tokenDetails.memo).toEqual("This is memo");
        (0, vitest_1.expect)(tokenDetails.metadata).toEqual("");
        (0, vitest_1.expect)(tokenDetails?.supply_key?.key).toBeTruthy(); // all NFTs have supply key set by default
        (0, vitest_1.expect)(tokenDetails?.admin_key?.key).toBeFalsy();
        (0, vitest_1.expect)(tokenDetails?.metadata_key?.key).toBeFalsy();
    });
    (0, vitest_1.it)("Create token with minimal parameters plus metadata key", async () => {
        const prompt = {
            user: "user",
            text: "Create non-fungible token with name TestToken, symbol TT. Set metadata key.",
        };
        langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenId = extractTokenId(response.messages);
        await wait(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenId);
        (0, vitest_1.expect)(tokenDetails.symbol).toEqual("TT");
        (0, vitest_1.expect)(tokenDetails.name).toEqual("TestToken");
        (0, vitest_1.expect)(tokenDetails.type).toEqual(sdk_1.TokenType.NonFungibleUnique.toString());
        (0, vitest_1.expect)(Number(tokenDetails.max_supply)).toEqual(INFINITE_SUPPLY);
        (0, vitest_1.expect)(tokenDetails.memo).toEqual("");
        (0, vitest_1.expect)(tokenDetails.metadata).toEqual("");
        (0, vitest_1.expect)(tokenDetails?.supply_key?.key).toBeTruthy(); // all NFTs have supply key set by default
        (0, vitest_1.expect)(tokenDetails?.admin_key?.key).toBeFalsy();
        (0, vitest_1.expect)(tokenDetails?.metadata_key?.key).toBeTruthy();
    });
    (0, vitest_1.it)("Create token with minimal parameters plus admin key and metadata key and memo and metadata", async () => {
        const prompt = {
            user: "user",
            text: "Create non-fungible token with name TestToken, symbol TT. Set metadata key and admin key. Add memo 'thats memo' and metadata 'thats metadata'.",
        };
        langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenId = extractTokenId(response.messages);
        await wait(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenId);
        (0, vitest_1.expect)(tokenDetails.symbol).toEqual("TT");
        (0, vitest_1.expect)(tokenDetails.name).toEqual("TestToken");
        (0, vitest_1.expect)(tokenDetails.type).toEqual(sdk_1.TokenType.NonFungibleUnique.toString());
        (0, vitest_1.expect)(Number(tokenDetails.max_supply)).toEqual(INFINITE_SUPPLY);
        (0, vitest_1.expect)(tokenDetails.memo).toEqual("thats memo");
        (0, vitest_1.expect)(atob(tokenDetails.metadata)).toEqual("thats metadata");
        (0, vitest_1.expect)(tokenDetails?.supply_key?.key).toBeTruthy(); // all NFTs have supply key set by default
        (0, vitest_1.expect)(tokenDetails?.admin_key?.key).toBeTruthy();
        (0, vitest_1.expect)(tokenDetails?.metadata_key?.key).toBeTruthy();
    });
});
