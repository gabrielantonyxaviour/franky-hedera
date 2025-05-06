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
const extractTxHash = (messages) => {
    return messages.reduce((acc, { content }) => {
        try {
            const response = JSON.parse(content);
            if (response.status === "error") {
                throw new Error(response.message);
            }
            return String(response.txHash);
        }
        catch {
            return acc;
        }
    }, "");
};
const formatTxHash = (txHash) => {
    const [txId, txTimestamp] = txHash.split("@");
    if (!txId || !txTimestamp) {
        throw new Error("Invalid tx hash");
    }
    return `${txId}-${txTimestamp?.replace(".", "-")}`;
};
(0, vitest_1.describe)("Test HBAR transfer", async () => {
    let acc1;
    let acc2;
    let acc3;
    let langchainAgent;
    let hederaApiClient;
    let testCases;
    (0, vitest_1.beforeAll)(async () => {
        dotenv.config();
        try {
            langchainAgent = await langchainAgent_1.LangchainAgent.create();
            const wrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
            acc1 = await wrapper.createAccount(0);
            acc2 = await wrapper.createAccount(0);
            acc3 = await wrapper.createAccount(0);
            hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
            testCases = [
                [acc1.accountId, 1, `Transfer 1 HBAR to the account ${acc1.accountId}`],
                [acc2.accountId, 0.5, `Send 0.5 HBAR to account ${acc2.accountId}.`],
                [acc3.accountId, 3, `Transfer exactly 3 HBAR to ${acc3.accountId}.`],
            ];
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.describe)("balance checks", () => {
        (0, vitest_1.it)("should test dynamic HBAR transfers", async () => {
            for (const [receiversAccountId, transferAmount, promptText,] of testCases) {
                const agentsAccountId = process.env.HEDERA_ACCOUNT_ID;
                if (!agentsAccountId || receiversAccountId === agentsAccountId) {
                    throw new Error("Env file must be defined! Note that transfers can be done to the operator account address.");
                }
                // Get balances before
                const balanceAgentBefore = await hederaApiClient.getHbarBalance(agentsAccountId);
                const balanceReceiverBefore = await hederaApiClient.getHbarBalance(receiversAccountId);
                // Perform transfer action
                const prompt = {
                    user: "user",
                    text: promptText,
                };
                const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
                const txHash = extractTxHash(response.messages);
                // Get balances after transaction being successfully processed by mirror node
                await (0, utils_1.wait)(5000);
                const balanceAgentAfter = await hederaApiClient.getHbarBalance(agentsAccountId);
                const balanceReceiverAfter = await hederaApiClient.getHbarBalance(receiversAccountId);
                const txReport = await hederaApiClient.getTransactionReport(formatTxHash(txHash), agentsAccountId, [receiversAccountId]);
                // Compare before and after including the difference due to paid fees
                const margin = 0.5;
                (0, vitest_1.expect)(txReport.status).toEqual("SUCCESS");
                (0, vitest_1.expect)(Math.abs(balanceAgentBefore -
                    (balanceAgentAfter + transferAmount + txReport.totalPaidFees))).toBeLessThanOrEqual(margin);
                (0, vitest_1.expect)(Math.abs(balanceReceiverBefore - (balanceReceiverAfter - transferAmount))).toBeLessThanOrEqual(margin);
                await (0, utils_1.wait)(1000);
            }
        });
    });
});
