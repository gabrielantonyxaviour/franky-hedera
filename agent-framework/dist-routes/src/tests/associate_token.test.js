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
const IS_CUSTODIAL = true;
dotenv.config();
(0, vitest_1.describe)("associate_token", () => {
    let tokenCreatorAccount;
    let token1;
    let token2;
    let networkClientWrapper;
    let claimerInitialMaxAutoAssociation;
    let langchainAgent;
    let testCases;
    let hederaMirrorNodeClient;
    (0, vitest_1.beforeAll)(async () => {
        try {
            langchainAgent = await langchainAgent_1.LangchainAgent.create();
            hederaMirrorNodeClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
            networkClientWrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
            // Create test account
            const startingHbars = 10;
            const autoAssociation = 0; // no auto association
            tokenCreatorAccount = await networkClientWrapper.createAccount(startingHbars, autoAssociation);
            claimerInitialMaxAutoAssociation = (await hederaMirrorNodeClient.getAccountInfo(networkClientWrapper.getAccountId())).max_automatic_token_associations;
            const maxAutoAssociationForTest = await hederaMirrorNodeClient.getAutomaticAssociationsCount(networkClientWrapper.getAccountId());
            await networkClientWrapper.setMaxAutoAssociation(maxAutoAssociationForTest);
            const tokenCreatorAccountNetworkClientWrapper = new testnetClient_1.NetworkClientWrapper(tokenCreatorAccount.accountId, tokenCreatorAccount.privateKey, tokenCreatorAccount.publicKey, "ECDSA", "testnet");
            // create tokens
            await Promise.all([
                tokenCreatorAccountNetworkClientWrapper.createFT({
                    name: "TokenToAssociate1",
                    symbol: "TTA1",
                    initialSupply: 1000,
                    decimals: 2,
                }),
                tokenCreatorAccountNetworkClientWrapper.createFT({
                    name: "TokenToAssociate2",
                    symbol: "TTA2",
                    initialSupply: 1000,
                    decimals: 2,
                }),
            ]).then(([_token1, _token2]) => {
                token1 = _token1;
                token2 = _token2;
            });
            testCases = [
                {
                    tokenToAssociateId: token1,
                    promptText: `Associate token ${token1} to my account ${networkClientWrapper.getAccountId()}`,
                },
                {
                    tokenToAssociateId: token2,
                    promptText: `Associate token ${token2} to my account ${networkClientWrapper.getAccountId()}`,
                },
            ];
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.afterAll)(async () => {
        if (claimerInitialMaxAutoAssociation === -1) {
            await networkClientWrapper.setMaxAutoAssociation(claimerInitialMaxAutoAssociation);
        }
    });
    (0, vitest_1.describe)("associate token checks", () => {
        (0, vitest_1.it)("should associate token", async () => {
            for (const { promptText, tokenToAssociateId } of testCases || []) {
                const prompt = {
                    user: "user",
                    text: promptText,
                };
                const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
                await (0, utils_1.wait)(5000);
                console.log({
                    client: networkClientWrapper.getAccountId(),
                    tokenToAssociateId
                });
                const token = await hederaMirrorNodeClient.getAccountToken(networkClientWrapper.getAccountId(), tokenToAssociateId);
                (0, vitest_1.expect)(token).toBeDefined();
            }
        });
    });
});
