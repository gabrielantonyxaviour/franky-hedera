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
const utils_1 = require("./utils/utils");
const langchainAgent_1 = require("./utils/langchainAgent");
const IS_CUSTODIAL = true;
function extractTokenDetails(messages) {
    console.log(messages);
    const result = messages.reduce((acc, message) => {
        try {
            const toolResponse = JSON.parse(message.content);
            if (toolResponse.status === "success" && toolResponse.tokenId) {
                return { tokenId: toolResponse.tokenId, initialSupply: toolResponse.initialSupply };
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
dotenv.config();
(0, vitest_1.describe)("create_fungible_token", () => {
    (0, vitest_1.it)("Create token with all possible parameters", async () => {
        const hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
        const promptText = "Create token GameGold with symbol GG, 2 decimal places, and starting supply of 7500. Set memo to 'This is an example memo' and token metadata to 'And that's an example metadata'. Add supply key, admin key. Set metadata key.";
        const prompt = {
            user: "user",
            text: promptText,
        };
        const langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenDetailsFromToolResponse = extractTokenDetails(response.messages);
        if (!tokenDetailsFromToolResponse) {
            throw new Error("No token details found");
        }
        await (0, utils_1.wait)(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenDetailsFromToolResponse.tokenId);
        (0, vitest_1.expect)(tokenDetails.symbol).toEqual("GG");
        (0, vitest_1.expect)(tokenDetails.name).toEqual("GameGold");
        (0, vitest_1.expect)(tokenDetails.decimals).toEqual("2");
        (0, vitest_1.expect)(tokenDetails.initial_supply).toEqual("7500");
        (0, vitest_1.expect)(tokenDetails.memo).toEqual("This is an example memo");
        (0, vitest_1.expect)(atob(tokenDetails.metadata)).toEqual("And that's an example metadata");
        (0, vitest_1.expect)(tokenDetails?.supply_key?.key).not.toBeFalsy();
        (0, vitest_1.expect)(tokenDetails?.admin_key?.key).not.toBeFalsy();
        (0, vitest_1.expect)(tokenDetails?.metadata_key?.key).not.toBeFalsy();
    });
    (0, vitest_1.it)("Create token with minimal parameters", async () => {
        const hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
        const promptText = "Create token Minimal Token with symbol MT, 3 decimal places, and starting supply of 333.";
        const prompt = {
            user: "user",
            text: promptText,
        };
        const langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenDetailsFromToolResponse = extractTokenDetails(response.messages);
        if (!tokenDetailsFromToolResponse) {
            throw new Error("No token details found");
        }
        await (0, utils_1.wait)(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenDetailsFromToolResponse.tokenId);
        (0, vitest_1.expect)(tokenDetails.symbol).toEqual("MT");
        (0, vitest_1.expect)(tokenDetails.name).toEqual("Minimal Token");
        (0, vitest_1.expect)(tokenDetails.decimals).toEqual("3");
        (0, vitest_1.expect)(tokenDetails.initial_supply).toEqual("333");
        (0, vitest_1.expect)(tokenDetails.memo).toBe("");
        (0, vitest_1.expect)(tokenDetails.metadata).toBe("");
        (0, vitest_1.expect)(tokenDetails?.supply_key?.key).toBeUndefined();
        (0, vitest_1.expect)(tokenDetails?.admin_key?.key).toBeUndefined();
        (0, vitest_1.expect)(tokenDetails?.metadata_key?.key).toBeUndefined();
    });
    (0, vitest_1.it)("Create token with minimal parameters plus memo", async () => {
        const hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
        const promptText = "Create token 'Minimal Plus Memo Token' with symbol MPMT, 4 decimal places, and starting supply of 444. Set memo to 'Automatic tests memo'";
        const prompt = {
            user: "user",
            text: promptText,
        };
        const langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenDetailsFromToolResponse = extractTokenDetails(response.messages);
        if (!tokenDetailsFromToolResponse) {
            throw new Error("No token details found");
        }
        await (0, utils_1.wait)(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenDetailsFromToolResponse.tokenId);
        (0, vitest_1.expect)(tokenDetails.symbol).toEqual("MPMT");
        (0, vitest_1.expect)(tokenDetails.name).toEqual("Minimal Plus Memo Token");
        (0, vitest_1.expect)(tokenDetails.decimals).toEqual("4");
        (0, vitest_1.expect)(tokenDetails.initial_supply).toEqual("444");
        (0, vitest_1.expect)(tokenDetails.memo).toEqual("Automatic tests memo");
        (0, vitest_1.expect)(tokenDetails.metadata).toBe("");
        (0, vitest_1.expect)(tokenDetails?.supply_key?.key).toBeUndefined();
        (0, vitest_1.expect)(tokenDetails?.admin_key?.key).toBeUndefined();
        (0, vitest_1.expect)(tokenDetails?.metadata_key?.key).toBeUndefined();
    });
    (0, vitest_1.it)("Create token with minimal parameters plus metadata key", async () => {
        const hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
        const promptText = "Create token 'Minimal Plus Metadata Key Token' with symbol MPMKT, 5 decimal places, and starting supply of 555. Set metadata key to agents key.";
        const prompt = {
            user: "user",
            text: promptText,
        };
        const langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenDetailsFromToolResponse = extractTokenDetails(response.messages);
        if (!tokenDetailsFromToolResponse) {
            throw new Error("No token details found");
        }
        await (0, utils_1.wait)(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenDetailsFromToolResponse.tokenId);
        (0, vitest_1.expect)(tokenDetails.symbol).toEqual("MPMKT");
        (0, vitest_1.expect)(tokenDetails.name).toEqual("Minimal Plus Metadata Key Token");
        (0, vitest_1.expect)(tokenDetails.decimals).toEqual("5");
        (0, vitest_1.expect)(tokenDetails.initial_supply).toEqual("555");
        (0, vitest_1.expect)(tokenDetails.memo).toBe("");
        (0, vitest_1.expect)(tokenDetails.metadata).toBe("");
        (0, vitest_1.expect)(tokenDetails?.supply_key?.key).toBeUndefined();
        (0, vitest_1.expect)(tokenDetails?.admin_key?.key).toBeUndefined();
        (0, vitest_1.expect)(tokenDetails?.metadata_key?.key).not.toBeUndefined();
    });
    (0, vitest_1.it)("Create token with minimal parameters plus admin key and supply key", async () => {
        const hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
        const promptText = "Create token 'Minimal Plus Admin Supply Keys Token' with symbol MPASKT, 1 decimal places, and starting supply of 111. Set admin key and supply keys.";
        const prompt = {
            user: "user",
            text: promptText,
        };
        const langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenDetailsFromToolResponse = extractTokenDetails(response.messages);
        if (!tokenDetailsFromToolResponse) {
            throw new Error("No token details found");
        }
        await (0, utils_1.wait)(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenDetailsFromToolResponse.tokenId);
        (0, vitest_1.expect)(tokenDetails.symbol).toEqual("MPASKT");
        (0, vitest_1.expect)(tokenDetails.name).toEqual("Minimal Plus Admin Supply Keys Token");
        (0, vitest_1.expect)(tokenDetails.decimals).toEqual("1");
        (0, vitest_1.expect)(tokenDetails.initial_supply).toEqual("111");
        (0, vitest_1.expect)(tokenDetails.memo).toBe("");
        (0, vitest_1.expect)(tokenDetails.memo).toBe("");
        (0, vitest_1.expect)(tokenDetails?.supply_key?.key).not.toBeUndefined();
        (0, vitest_1.expect)(tokenDetails?.admin_key?.key).not.toBeUndefined();
        (0, vitest_1.expect)(tokenDetails?.metadata_key?.key).toBeUndefined();
    });
    (0, vitest_1.it)("Create token with minimal parameters plus admin key and supply key and memo and metadata", async () => {
        const hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
        const promptText = "Create token 'Complex Token' with symbol CPLXT, 1 decimal places, and starting supply of 1111. Set admin key and supply keys. Set memo to 'This a complex token'. Set metadata to 'this could be a link to image'. Don't set metadata key";
        const prompt = {
            user: "user",
            text: promptText,
        };
        const langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenDetailsFromToolResponse = extractTokenDetails(response.messages);
        if (!tokenDetailsFromToolResponse) {
            throw new Error("No token details found");
        }
        await (0, utils_1.wait)(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenDetailsFromToolResponse.tokenId);
        (0, vitest_1.expect)(tokenDetails.symbol).toEqual("CPLXT");
        (0, vitest_1.expect)(tokenDetails.name).toEqual("Complex Token");
        (0, vitest_1.expect)(tokenDetails.decimals).toEqual("1");
        (0, vitest_1.expect)(tokenDetails.initial_supply).toEqual("1111");
        (0, vitest_1.expect)(tokenDetails.memo).toBe("This a complex token");
        (0, vitest_1.expect)(atob(tokenDetails.metadata)).toBe("this could be a link to image");
        (0, vitest_1.expect)(tokenDetails?.supply_key?.key).not.toBeUndefined();
        (0, vitest_1.expect)(tokenDetails?.admin_key?.key).not.toBeUndefined();
        (0, vitest_1.expect)(tokenDetails?.metadata_key?.key).toBeUndefined();
    });
    (0, vitest_1.it)("Create token with supply in display units using comma", async () => {
        const hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
        const promptText = "Create token GameGold with symbol GG, 2 decimal places, and starting supply of 75,55";
        const prompt = {
            user: "user",
            text: promptText,
        };
        const langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenDetailsFromToolResponse = extractTokenDetails(response.messages);
        if (!tokenDetailsFromToolResponse) {
            throw new Error("No token details found");
        }
        await (0, utils_1.wait)(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenDetailsFromToolResponse.tokenId);
        (0, vitest_1.expect)(tokenDetails.initial_supply).toEqual("7555");
    });
    (0, vitest_1.it)("Create token with supply in display units using dot", async () => {
        const hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
        const promptText = "Create token GameGold with symbol GG, 2 decimal places, and starting supply of 75.55";
        const prompt = {
            user: "user",
            text: promptText,
        };
        const langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenDetailsFromToolResponse = extractTokenDetails(response.messages);
        if (!tokenDetailsFromToolResponse) {
            throw new Error("No token details found");
        }
        await (0, utils_1.wait)(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenDetailsFromToolResponse.tokenId);
        (0, vitest_1.expect)(tokenDetails.initial_supply).toEqual("7555");
    });
    (0, vitest_1.it)("Create token with supply in display units using dot and zero", async () => {
        const hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
        const promptText = "Create token GameGold with symbol GG, 2 decimal places, and starting supply of 75.0";
        const prompt = {
            user: "user",
            text: promptText,
        };
        const langchainAgent = await langchainAgent_1.LangchainAgent.create();
        const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
        const tokenDetailsFromToolResponse = extractTokenDetails(response.messages);
        if (!tokenDetailsFromToolResponse) {
            throw new Error("No token details found");
        }
        await (0, utils_1.wait)(5000);
        const tokenDetails = await hederaApiClient.getTokenDetails(tokenDetailsFromToolResponse.tokenId);
        (0, vitest_1.expect)(tokenDetails.initial_supply).toEqual("7500");
    });
});
