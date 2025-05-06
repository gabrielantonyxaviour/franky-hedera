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
const langchainAgent_1 = require("./utils/langchainAgent");
const testnetClient_1 = require("./utils/testnetClient");
const dotenv = __importStar(require("dotenv"));
const hederaMirrorNodeClient_1 = require("./utils/hederaMirrorNodeClient");
const utils_1 = require("./utils/utils");
const IS_CUSTODIAL = true;
(0, vitest_1.describe)("claim_pending_airdrops", () => {
    let airdropCreatorAccount;
    let token1;
    let token2;
    let langchainAgent;
    let claimerInitialMaxAutoAssociation;
    let testCases;
    let networkClientWrapper;
    let hederaMirrorNodeClient;
    (0, vitest_1.beforeAll)(async () => {
        dotenv.config();
        try {
            langchainAgent = await langchainAgent_1.LangchainAgent.create();
            hederaMirrorNodeClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
            networkClientWrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
            // Create test account
            const startingHbars = 10;
            const autoAssociation = 0; // no auto association
            airdropCreatorAccount = await networkClientWrapper.createAccount(startingHbars, autoAssociation);
            claimerInitialMaxAutoAssociation = (await hederaMirrorNodeClient.getAccountInfo(networkClientWrapper.getAccountId())).max_automatic_token_associations;
            const maxAutoAssociationForTest = await hederaMirrorNodeClient.getAutomaticAssociationsCount(networkClientWrapper.getAccountId());
            await networkClientWrapper.setMaxAutoAssociation(maxAutoAssociationForTest);
            const airdropCreatorAccountNetworkClientWrapper = new testnetClient_1.NetworkClientWrapper(airdropCreatorAccount.accountId, airdropCreatorAccount.privateKey, airdropCreatorAccount.publicKey, "ECDSA", "testnet");
            // create tokens
            await Promise.all([
                airdropCreatorAccountNetworkClientWrapper.createFT({
                    name: "ClaimAirdrop1",
                    symbol: "CA1",
                    initialSupply: 1000,
                    decimals: 2,
                }),
                airdropCreatorAccountNetworkClientWrapper.createFT({
                    name: "ClaimAirdrop2",
                    symbol: "CA2",
                    initialSupply: 1000,
                    decimals: 2,
                }),
            ]).then(([_token1, _token2]) => {
                token1 = _token1;
                token2 = _token2;
            });
            // airdrop tokens
            await Promise.all([
                airdropCreatorAccountNetworkClientWrapper.airdropToken(token1, [
                    {
                        accountId: process.env.HEDERA_ACCOUNT_ID,
                        amount: 10,
                    },
                ]),
                airdropCreatorAccountNetworkClientWrapper.airdropToken(token2, [
                    {
                        accountId: process.env.HEDERA_ACCOUNT_ID,
                        amount: 40,
                    },
                ]),
            ]);
            await (0, utils_1.wait)(5000);
            testCases = [
                {
                    receiverAccountId: networkClientWrapper.getAccountId(),
                    senderAccountId: airdropCreatorAccount.accountId,
                    tokenId: token1,
                    promptText: `Claim airdrop for token ${token1} from sender ${airdropCreatorAccount.accountId}`,
                    expectedClaimedAmount: 10,
                },
                {
                    receiverAccountId: networkClientWrapper.getAccountId(),
                    senderAccountId: airdropCreatorAccount.accountId,
                    tokenId: token2,
                    promptText: `Claim airdrop for token ${token2} from sender ${airdropCreatorAccount.accountId}`,
                    expectedClaimedAmount: 40,
                },
            ];
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.afterAll)(async () => {
        await networkClientWrapper.setMaxAutoAssociation(claimerInitialMaxAutoAssociation);
    });
    (0, vitest_1.describe)("pending airdrops checks", () => {
        (0, vitest_1.it)("should test dynamic token airdrops", async () => {
            for (const { receiverAccountId, tokenId, promptText, expectedClaimedAmount, } of testCases || []) {
                const prompt = {
                    user: "user",
                    text: promptText,
                };
                langchainAgent = await langchainAgent_1.LangchainAgent.create();
                const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
                const tokenBalance = await networkClientWrapper.getAccountTokenBalance(tokenId, 'testnet', receiverAccountId);
                (0, vitest_1.expect)(tokenBalance ?? 0).toBe(expectedClaimedAmount);
            }
        });
    });
});
