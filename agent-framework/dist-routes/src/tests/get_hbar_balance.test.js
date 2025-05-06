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
const testnetClient_1 = require("./utils/testnetClient");
const langchainAgent_1 = require("./utils/langchainAgent");
const utils_1 = require("./utils/utils");
const IS_CUSTODIAL = true;
(0, vitest_1.describe)("get_hbar_balance", () => {
    let acc1;
    let acc2;
    let acc3;
    let langchainAgent;
    let hederaApiClient;
    let testCases;
    (0, vitest_1.beforeAll)(async () => {
        dotenv.config();
        try {
            const wrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
            acc1 = await wrapper.createAccount(1);
            acc2 = await wrapper.createAccount(0.3);
            acc3 = await wrapper.createAccount(0);
            langchainAgent = await langchainAgent_1.LangchainAgent.create();
            hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient(process.env.HEDERA_NETWORK_TYPE);
            testCases = [
                [acc1.accountId, `What's HBAR balance for ${acc1.accountId}`],
                [acc2.accountId, `How much HBARs has ${acc2.accountId}`],
                [acc3.accountId, `Check HBAR balance of wallet ${acc3.accountId}`],
            ];
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.describe)("balance checks", () => {
        (0, vitest_1.it)("should test dynamic account balances", async () => {
            for (const [accountId, promptText] of testCases) {
                const prompt = {
                    user: "user",
                    text: promptText,
                };
                const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
                let hederaActionBalance;
                const match = response.messages[response.messages.length - 1].text.match(/(\d+\.\d+|\d+)\s*HBAR/);
                if (match) {
                    hederaActionBalance = parseFloat(match[1]);
                }
                else {
                    throw new Error("No match for HBAR balance found in response.");
                }
                const accountInfo = await hederaApiClient.getAccountInfo(accountId);
                const accountBalanceInBaseUnits = accountInfo.balance.balance;
                const mirrorNodeBalanceInDisplayUnits = await hederaApiClient.getHbarBalance(accountId);
                const HBAR_DECIMALS = 8;
                // compare balance in display units
                (0, vitest_1.expect)(hederaActionBalance).toEqual(mirrorNodeBalanceInDisplayUnits);
                // compare balance in base units
                (0, vitest_1.expect)(hederaActionBalance * 10 ** HBAR_DECIMALS).toEqual(accountBalanceInBaseUnits);
                await (0, utils_1.wait)(1000);
            }
        });
    });
});
