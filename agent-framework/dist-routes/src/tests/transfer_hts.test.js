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
const extractTransferDetails = (messages) => {
    return messages.reduce((acc, { content }) => {
        try {
            const response = JSON.parse(content);
            if (response.status === "error") {
                throw new Error(response.message);
            }
            return response;
        }
        catch {
            return acc;
        }
    }, null);
};
const formatTxHash = (txHash) => {
    const [txId, txTimestamp] = txHash.split("@");
    if (!txId || !txTimestamp) {
        throw new Error("Invalid tx hash");
    }
    return `${txId}-${txTimestamp?.replace(".", "-")}`;
};
(0, vitest_1.describe)("Test Token transfer", async () => {
    let acc1;
    let acc2;
    let acc3;
    let token1;
    let token2;
    let hederaApiClient;
    let networkClientWrapper;
    let testCases;
    (0, vitest_1.beforeAll)(async () => {
        dotenv.config();
        try {
            networkClientWrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
            // Create test accounts
            await Promise.all([
                networkClientWrapper.createAccount(0, -1),
                networkClientWrapper.createAccount(0, -1),
                networkClientWrapper.createAccount(0, -1),
            ]).then(([_acc1, _acc2, _acc3]) => {
                acc1 = _acc1;
                acc2 = _acc2;
                acc3 = _acc3;
            });
            // Create test tokens
            await Promise.all([
                networkClientWrapper.createFT({
                    name: "TestToken1",
                    symbol: "TT1",
                    initialSupply: 1000000,
                    decimals: 2,
                }),
                networkClientWrapper.createFT({
                    name: "TestToken2",
                    symbol: "TT2",
                    initialSupply: 2000,
                    decimals: 0,
                }),
            ]).then(([_token1, _token2]) => {
                token1 = _token1;
                token2 = _token2;
            });
            await (0, utils_1.wait)(5000);
            hederaApiClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
            // Define test cases using created accounts and tokens
            // Operate on display units
            testCases = [
                [
                    acc1.accountId,
                    12.5,
                    token1,
                    `Transfer 12.5 tokens ${token1} to the account ${acc1.accountId}`,
                ],
                [
                    acc2.accountId,
                    10,
                    token2,
                    `Send 10 tokens ${token2} to account ${acc2.accountId}.`,
                ],
                [
                    acc3.accountId,
                    3,
                    token1,
                    `Transfer exactly 3 of token ${token1} to ${acc3.accountId}.`,
                ],
            ];
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.describe)("token transfers", () => {
        (0, vitest_1.it)("should process token transfers for dynamically created accounts", async () => {
            for (const [receiversAccountId, transferAmountInDisplayUnits, tokenId, promptText,] of testCases) {
                const agentsAccountId = process.env.HEDERA_ACCOUNT_ID;
                if (!agentsAccountId || receiversAccountId === agentsAccountId) {
                    throw new Error("Note that transfers cant be done to the operator account address.");
                }
                const tokenDetails = await hederaApiClient.getTokenDetails(tokenId);
                const balanceAgentBeforeInDisplayUnits = await hederaApiClient.getTokenBalance(agentsAccountId, tokenId);
                const balanceAgentBeforeInBaseUnits = (await hederaApiClient.getAccountToken(agentsAccountId, tokenId))?.balance;
                const balanceReceiverBeforeInDisplayUnits = await hederaApiClient.getTokenBalance(receiversAccountId, tokenId);
                const balanceReceiverBeforeInBaseUnits = (await hederaApiClient.getAccountToken(receiversAccountId, tokenId))?.balance ?? 0;
                const prompt = {
                    user: "user",
                    text: promptText,
                };
                const langchainAgent = await langchainAgent_1.LangchainAgent.create();
                const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
                const transferDetails = extractTransferDetails(response.messages);
                const formattedTxHash = formatTxHash(transferDetails?.txHash ?? "");
                if (!formattedTxHash) {
                    throw new Error("No match for transaction hash found in response.");
                }
                await (0, utils_1.wait)(5000);
                const balanceAgentAfterInDisplayUnits = await hederaApiClient.getTokenBalance(agentsAccountId, tokenId);
                const balanceAgentAfterInBaseUnits = (await hederaApiClient.getAccountToken(agentsAccountId, tokenId))
                    ?.balance ?? 0;
                const balanceReceiverAfterInDisplayUnits = await hederaApiClient.getTokenBalance(receiversAccountId, tokenId);
                const balanceReceiverAfterInBaseUnits = (await hederaApiClient.getAccountToken(receiversAccountId, tokenId))
                    ?.balance ?? 0;
                const txReport = await hederaApiClient.getTransactionReport(formattedTxHash, agentsAccountId, [receiversAccountId]);
                // Compare before and after including the difference due to paid fees
                (0, vitest_1.expect)(txReport.status).toEqual("SUCCESS");
                // check if balance is correct in display units
                (0, vitest_1.expect)(balanceAgentBeforeInDisplayUnits).toEqual(balanceAgentAfterInDisplayUnits + transferAmountInDisplayUnits);
                // check if balance is correct in base units
                (0, vitest_1.expect)(balanceAgentBeforeInBaseUnits).toEqual(balanceAgentAfterInBaseUnits +
                    transferAmountInDisplayUnits * 10 ** Number(tokenDetails.decimals));
                // check if balance is correct in display units for receiver
                (0, vitest_1.expect)(balanceReceiverBeforeInDisplayUnits).toEqual(balanceReceiverAfterInDisplayUnits - transferAmountInDisplayUnits);
                // check if balance is correct in base units for receiver
                (0, vitest_1.expect)(balanceReceiverBeforeInBaseUnits).toEqual(balanceReceiverAfterInBaseUnits -
                    transferAmountInDisplayUnits * 10 ** Number(tokenDetails.decimals));
                await (0, utils_1.wait)(1000);
            }
        });
    });
});
