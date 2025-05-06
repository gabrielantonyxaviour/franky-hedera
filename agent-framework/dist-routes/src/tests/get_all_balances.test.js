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
const hederaMirrorNodeClient_1 = require("./utils/hederaMirrorNodeClient");
const vitest_1 = require("vitest");
const dotenv = __importStar(require("dotenv"));
const testnetClient_1 = require("./utils/testnetClient");
const langchainAgent_1 = require("./utils/langchainAgent");
const utils_1 = require("./utils/utils");
const IS_CUSTODIAL = true;
const extractBalances = (messages) => {
    const result = messages.reduce((acc, { content }) => {
        try {
            const response = JSON.parse(content);
            console.log(response);
            if (response.status === "error") {
                throw new Error(response.message);
            }
            if (!response?.balances) {
                throw new Error("Balance not found");
            }
            return response.balances;
        }
        catch {
            return acc;
        }
    }, "");
    if (!Array.isArray(result)) {
        throw new Error("No balances");
    }
    return result;
};
(0, vitest_1.describe)("get_all_balances", () => {
    let acc1;
    let acc2;
    let acc3;
    let token1;
    let token2;
    let hederaApiClient;
    let testCases;
    (0, vitest_1.beforeAll)(async () => {
        dotenv.config();
        try {
            const networkClientWrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
            // Create accounts
            await Promise.all([
                networkClientWrapper.createAccount(0, -1),
                networkClientWrapper.createAccount(0, -1),
                networkClientWrapper.createAccount(0, -1),
            ]).then(([_acc1, _acc2, _acc3]) => {
                acc1 = _acc1;
                acc2 = _acc2;
                acc3 = _acc3;
            });
            // Create tokens
            await Promise.all([
                networkClientWrapper.createFT({
                    name: "MyToken",
                    symbol: "MTK",
                    initialSupply: 1000,
                    decimals: 2,
                }),
                networkClientWrapper.createFT({
                    name: "MyToken2",
                    symbol: "MTK2",
                    initialSupply: 2000,
                    decimals: 0,
                }),
            ]).then(([_token1, _token2]) => {
                token1 = _token1;
                token2 = _token2;
            });
            // Transfer tokens to accounts
            await Promise.all([
                networkClientWrapper.transferToken(acc1.accountId, token1, 100),
                networkClientWrapper.transferToken(acc2.accountId, token2, 123),
                networkClientWrapper.transferToken(acc3.accountId, token2, 10),
                networkClientWrapper.transferToken(acc3.accountId, token1, 7),
            ]);
            await (0, utils_1.wait)(5000);
            hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
            testCases = [
                [
                    acc1.accountId,
                    `Show me the balances of all tokens for wallet ${acc1.accountId}`,
                ],
                [
                    acc2.accountId,
                    `What are the token balances for wallet ${acc2.accountId}`,
                ],
                [
                    acc3.accountId,
                    `Show me all token balances for account ${acc3.accountId}`,
                ],
                [process.env.HEDERA_ACCOUNT_ID, "Show me all your token balances."],
                [process.env.HEDERA_ACCOUNT_ID, "Show me all my token balances."],
            ];
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.describe)("balance checks", () => {
        (0, vitest_1.it)("should test all token balances", async () => {
            for (const [accountId, promptText] of testCases) {
                const prompt = {
                    user: "user",
                    text: promptText,
                };
                const langchainAgent = await langchainAgent_1.LangchainAgent.create();
                const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
                const allTokensBalances = await hederaApiClient.getAllTokensBalances(accountId);
                const formattedBalances = allTokensBalances.map((token) => ({
                    ...token,
                    balanceInDisplayUnit: token.balanceInDisplayUnit.toString(),
                }));
                const tokensBalanceFromLangchain = extractBalances(response.messages);
                formattedBalances.forEach((token) => {
                    const correspondingTokenFromLangchain = tokensBalanceFromLangchain.find(({ tokenId: elizaTokenId }) => elizaTokenId === token.tokenId);
                    (0, vitest_1.expect)(correspondingTokenFromLangchain?.tokenId).toEqual(token.tokenId);
                    (0, vitest_1.expect)(correspondingTokenFromLangchain?.balance).toEqual(token.balance);
                    (0, vitest_1.expect)(correspondingTokenFromLangchain?.tokenName).toEqual(token.tokenName);
                    (0, vitest_1.expect)(correspondingTokenFromLangchain?.tokenSymbol).toEqual(token.tokenSymbol);
                });
                await (0, utils_1.wait)(1000);
            }
        });
    });
});
