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
const hederaMirrorNodeClient_1 = require("./utils/hederaMirrorNodeClient");
const dotenv = __importStar(require("dotenv"));
const testnetClient_1 = require("./utils/testnetClient");
const utils_1 = require("./utils/utils");
const IS_CUSTODIAL = true;
const extractTokenBalance = (messages) => {
    return messages.reduce((acc, { content }) => {
        try {
            const response = JSON.parse(content);
            if (response.status === "error") {
                throw new Error(response.message);
            }
            return String(response.balance);
        }
        catch {
            return acc;
        }
    }, "");
};
(0, vitest_1.describe)("get_hts_balance", () => {
    let acc1;
    let acc2;
    let acc3;
    let token1;
    let token2;
    let langchainAgent;
    let hederaApiClient;
    let testCases;
    (0, vitest_1.beforeAll)(async () => {
        dotenv.config();
        try {
            langchainAgent = await langchainAgent_1.LangchainAgent.create();
            const networkClientWrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
            await Promise.all([
                networkClientWrapper.createAccount(0, -1),
                networkClientWrapper.createAccount(0, -1),
                networkClientWrapper.createAccount(0, -1),
            ]).then(([_acc1, _acc2, _acc3]) => {
                acc1 = _acc1;
                acc2 = _acc2;
                acc3 = _acc3;
            });
            token1 = await networkClientWrapper.createFT({
                name: "MyToken",
                symbol: "MTK",
                initialSupply: 1000,
                decimals: 2,
            });
            token2 = await networkClientWrapper.createFT({
                name: "MyToken2",
                symbol: "MTK2",
                initialSupply: 2000,
                decimals: 0,
            });
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
                    token1,
                    `What's balance of token ${token1} for ${acc1.accountId}`,
                ],
                [
                    acc2.accountId,
                    token2,
                    `How many tokens with id ${token2} account ${acc2.accountId} has`,
                ],
                [
                    acc3.accountId,
                    token2,
                    `Check balance of token ${token2} for wallet ${acc3.accountId}`,
                ],
                [
                    acc1.accountId,
                    token2,
                    `What's balance of ${token2} for ${acc1.accountId}`,
                ],
                [
                    acc3.accountId,
                    token1,
                    `What is the token balance of ${token1} account ${acc3.accountId} has`,
                ],
                [
                    acc3.accountId,
                    token2,
                    `Check balance of token ${token2} for wallet ${acc3.accountId}`,
                ],
            ];
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.describe)("balance checks", () => {
        (0, vitest_1.it)("should test dynamic token balances", async () => {
            for (const [accountId, tokenId, promptText] of testCases) {
                const prompt = {
                    user: "user",
                    text: promptText,
                };
                const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
                await (0, utils_1.wait)(5000);
                const hederaActionBalanceInDisplayUnits = extractTokenBalance(response.messages);
                const mirrorNodeBalanceInDisplayUnits = await hederaApiClient.getTokenBalance(accountId, tokenId);
                const mirrorNodeBalanceInBaseUnits = (await hederaApiClient.getAccountToken(accountId, tokenId))?.balance ?? 0;
                const decimals = (await hederaApiClient.getTokenDetails(tokenId))?.decimals;
                const hederaActionBalanceInBaseUnits = (Number(hederaActionBalanceInDisplayUnits) * 10 ** Number(decimals)).toFixed(0);
                (0, vitest_1.expect)(String(hederaActionBalanceInDisplayUnits)).toEqual(String(mirrorNodeBalanceInDisplayUnits));
                (0, vitest_1.expect)(hederaActionBalanceInBaseUnits).toEqual(String(mirrorNodeBalanceInBaseUnits));
            }
        });
    });
});
