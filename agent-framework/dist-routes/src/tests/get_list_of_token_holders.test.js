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
const langchainAgent_1 = require("./utils/langchainAgent");
[];
const IS_CUSTODIAL = true;
const extractHoldersData = (messages) => {
    const result = messages.reduce((acc, { content }) => {
        try {
            const response = JSON.parse(content);
            return response.holders;
        }
        catch {
            return acc;
        }
    }, "");
    if (!Array.isArray(result)) {
        throw new Error("Holders not found");
    }
    return result;
};
(0, vitest_1.describe)("get_list_of_token_holders", () => {
    let acc1;
    let acc2;
    let acc3;
    let token1;
    let token2;
    let testCases;
    let tresholdTestCases;
    let networkClientWrapper;
    (0, vitest_1.beforeAll)(async () => {
        dotenv.config();
        try {
            networkClientWrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
            await Promise.all([
                networkClientWrapper.createAccount(0, -1),
                networkClientWrapper.createAccount(0, -1),
                networkClientWrapper.createAccount(0, -1),
            ]).then(([account1, account2, account3]) => {
                acc1 = account1;
                acc2 = account2;
                acc3 = account3;
            });
            await Promise.all([
                networkClientWrapper.createFT({
                    name: "MyToken1",
                    symbol: "MTK1",
                    initialSupply: 1000,
                    decimals: 2,
                }),
                networkClientWrapper.createFT({
                    name: "MyToken2",
                    symbol: "MTK2",
                    initialSupply: 1000,
                    decimals: 2,
                }),
            ]).then(([t1, t2]) => {
                token1 = t1;
                token2 = t2;
            });
            await Promise.all([
                networkClientWrapper.transferToken(acc1.accountId, token1, 10),
                networkClientWrapper.transferToken(acc2.accountId, token1, 20),
                networkClientWrapper.transferToken(acc3.accountId, token1, 30),
                networkClientWrapper.transferToken(acc1.accountId, token2, 40),
                networkClientWrapper.transferToken(acc2.accountId, token2, 50),
                networkClientWrapper.transferToken(acc3.accountId, token2, 60),
            ]);
            testCases = [
                {
                    holders: [
                        { accountId: acc1.accountId, balance: "0.1" },
                        { accountId: acc2.accountId, balance: "0.2" },
                        { accountId: acc3.accountId, balance: "0.3" },
                        {
                            accountId: networkClientWrapper.getAccountId(),
                            balance: "9.4",
                        },
                    ],
                    promptText: `Who owns token ${token1} and what are their balances?`,
                },
                {
                    holders: [
                        { accountId: acc1.accountId, balance: "0.4" },
                        { accountId: acc2.accountId, balance: "0.5" },
                        { accountId: acc3.accountId, balance: "0.6" },
                        {
                            accountId: networkClientWrapper.getAccountId(),
                            balance: "8.5",
                        },
                    ],
                    promptText: `Who owns token ${token2} and what are their balances?`,
                },
            ];
            tresholdTestCases = [
                {
                    holders: [
                        { accountId: acc3.accountId, balance: "0.3" },
                        {
                            accountId: networkClientWrapper.getAccountId(),
                            balance: "9.4",
                        },
                    ],
                    promptText: `Which wallets hold token ${token1} and have at least 0.3 tokens?`,
                },
                {
                    holders: [
                        { accountId: acc3.accountId, balance: "0.6" },
                        {
                            accountId: networkClientWrapper.getAccountId(),
                            balance: "8.5",
                        },
                    ],
                    promptText: `Show me the token holders for ${token2} with balances greater or equal 0.6.`,
                },
            ];
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.describe)("get list of token holders checks", () => {
        (0, vitest_1.it)("should get list of token holders", async () => {
            for (const { promptText, holders } of testCases) {
                const prompt = {
                    user: "user",
                    text: promptText,
                };
                const langchainAgent = await langchainAgent_1.LangchainAgent.create();
                const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
                const langchainResponseHolders = extractHoldersData(response.messages);
                (0, vitest_1.expect)(langchainResponseHolders.length).toBe(holders.length);
                langchainResponseHolders.forEach((holder) => {
                    const relevantHolder = holders.find((h) => h.accountId === holder.account);
                    (0, vitest_1.expect)(relevantHolder?.balance).toEqual(holder.balance);
                    (0, vitest_1.expect)(relevantHolder?.accountId).toEqual(holder.account);
                });
            }
        });
        (0, vitest_1.it)("should get list of token holders with treshold", async () => {
            for (const { promptText, holders } of tresholdTestCases) {
                const prompt = {
                    user: "user",
                    text: promptText,
                };
                const langchainAgent = await langchainAgent_1.LangchainAgent.create();
                const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
                const langchainResponseHolders = extractHoldersData(response.messages);
                (0, vitest_1.expect)(langchainResponseHolders.length).toBe(holders.length);
                langchainResponseHolders.forEach((holder) => {
                    const relevantHolder = holders.find((h) => h.accountId === holder.account);
                    (0, vitest_1.expect)(relevantHolder?.balance).toEqual(holder.balance);
                    (0, vitest_1.expect)(relevantHolder?.accountId).toEqual(holder.account);
                });
            }
        });
    });
});
