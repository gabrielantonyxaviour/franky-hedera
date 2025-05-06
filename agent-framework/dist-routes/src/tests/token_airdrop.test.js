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
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function extractLangchainResponse(messages) {
    const toolMessages = messages.filter((msg) => (msg.id && msg.id[2] === "ToolMessage") ||
        msg.name === "hedera_airdrop_token");
    for (const message of toolMessages) {
        try {
            const toolResponse = JSON.parse(message.content);
            if (toolResponse.status !== "success" || !toolResponse.tokenId) {
                throw new Error(toolResponse.message ?? "Unknown error");
            }
            return toolResponse;
        }
        catch (error) {
            console.error("Error parsing tool message:", error);
        }
    }
    return null;
}
const formatTxHash = (txHash) => {
    const [txId, txTimestamp] = txHash.split("@");
    if (!txId || !txTimestamp) {
        throw new Error("Invalid tx hash");
    }
    return `${txId}-${txTimestamp?.replace(".", "-")}`;
};
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
(0, vitest_1.describe)("Test Token Airdrop", async () => {
    let acc1;
    let acc2;
    let acc3;
    let acc4;
    let acc5;
    let token1;
    let token2;
    let token3;
    let langchainAgent;
    let hederaApiClient;
    let networkClientWrapper;
    let testCases;
    (0, vitest_1.beforeAll)(async () => {
        dotenv.config();
        try {
            langchainAgent = await langchainAgent_1.LangchainAgent.create();
            hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
            networkClientWrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
            // Create test accounts
            await Promise.all([
                networkClientWrapper.createAccount(0, -1),
                networkClientWrapper.createAccount(0, -1),
                networkClientWrapper.createAccount(0, -1),
                networkClientWrapper.createAccount(0, -1),
                networkClientWrapper.createAccount(0, -1),
            ]).then(([_acc1, _acc2, _acc3, _acc4, _acc5]) => {
                acc1 = _acc1;
                acc2 = _acc2;
                acc3 = _acc3;
                acc4 = _acc4;
                acc5 = _acc5;
            });
            // Create test tokens
            await Promise.all([
                networkClientWrapper.createFT({
                    name: "AirdropToken",
                    symbol: "ADT",
                    initialSupply: 10000000,
                    decimals: 2,
                }),
                networkClientWrapper.createFT({
                    name: "AirdropToken2",
                    symbol: "ADT2",
                    initialSupply: 10000,
                    decimals: 0,
                }),
                networkClientWrapper.createFT({
                    name: "AirdropToken3",
                    symbol: "ADT3",
                    initialSupply: 10000000,
                    decimals: 3,
                }),
            ]).then(([_token1, _token2, _token3]) => {
                token1 = _token1;
                token2 = _token2;
                token3 = _token3;
            });
            // Define test cases using created accounts and tokens
            testCases = [
                [
                    [acc1.accountId, acc2.accountId, acc3.accountId],
                    10,
                    token1,
                    `Airdrop 10 tokens ${token1} to accounts ${acc1.accountId}, ${acc2.accountId}, ${acc3.accountId}`,
                ],
                [
                    [acc1.accountId, acc2.accountId, acc3.accountId],
                    2,
                    token2,
                    `Send token airdrop of 2 tokens ${token2} to accounts ${acc1.accountId}, ${acc2.accountId}, ${acc3.accountId}`,
                ],
                [
                    [
                        acc1.accountId,
                        acc2.accountId,
                        acc3.accountId,
                        acc4.accountId,
                        acc5.accountId,
                    ],
                    3,
                    token3,
                    `Make airdrop of 3 tokens  ${token3} to accounts ${acc1.accountId}, ${acc2.accountId}, ${acc3.accountId}, ${acc4.accountId}, ${acc5.accountId}`,
                ],
            ];
            await wait(5000);
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.describe)("token airdrops", () => {
        (0, vitest_1.it)("should process airdrop for dynamically created accounts", async () => {
            for (const [receiversAccountsIds, transferAmount, tokenId, promptText,] of testCases) {
                const agentsAccountId = process.env.HEDERA_ACCOUNT_ID;
                if (!agentsAccountId ||
                    receiversAccountsIds.find((id) => id === agentsAccountId)) {
                    throw new Error("Env file must be defined and matching the env of running ElizaOs instance! Note that airdrops cannot be done to the operator account address.");
                }
                // Get balances before
                const balanceAgentBefore = await hederaApiClient.getTokenBalance(agentsAccountId, tokenId);
                const balancesOfReceiversBefore = new Map();
                for (const id of receiversAccountsIds) {
                    const balance = await hederaApiClient.getTokenBalance(id, tokenId);
                    balancesOfReceiversBefore.set(id, balance);
                }
                const prompt = {
                    user: "user",
                    text: promptText,
                };
                const response = await langchainAgent.sendPrompt(prompt);
                const airdropResponse = extractLangchainResponse(response.messages);
                const txHash = formatTxHash(airdropResponse?.txHash ?? '');
                // Get balances after transaction being successfully processed by mirror node
                await wait(5000);
                const balanceAgentAfter = await hederaApiClient.getTokenBalance(agentsAccountId, tokenId);
                const balancesOfReceiversAfter = new Map(await Promise.all(receiversAccountsIds.map(async (id) => {
                    const balance = await hederaApiClient.getTokenBalance(id, tokenId);
                    return [id, balance];
                })));
                const txReport = await hederaApiClient.getTransactionReport(txHash, agentsAccountId, receiversAccountsIds);
                // Compare before and after including the difference due to paid fees
                (0, vitest_1.expect)(txReport.status).toEqual("SUCCESS");
                (0, vitest_1.expect)(balanceAgentBefore).toEqual(balanceAgentAfter + transferAmount * receiversAccountsIds.length);
                receiversAccountsIds.forEach((id) => (0, vitest_1.expect)(balancesOfReceiversBefore.get(id)).toEqual(balancesOfReceiversAfter.get(id) - transferAmount));
                await wait(1000);
            }
        });
    });
});
