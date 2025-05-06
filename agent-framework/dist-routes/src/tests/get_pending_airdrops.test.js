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
const utils_1 = require("./utils/utils");
const IS_CUSTODIAL = true;
function findAirdrops(messages) {
    const result = messages.reduce((acc, message) => {
        try {
            const toolResponse = JSON.parse(message.content);
            if (toolResponse.status === "success" && toolResponse.airdrop) {
                return toolResponse.airdrop;
            }
            return acc;
        }
        catch (error) {
            return acc;
        }
    }, null);
    if (!result) {
        throw new Error("No airdrops found");
    }
    return result;
}
(0, vitest_1.describe)("get_pending_airdrops", () => {
    let acc1;
    let acc2;
    let acc3;
    let token1;
    let langchainAgent;
    let testCases;
    let networkClientWrapper;
    (0, vitest_1.beforeAll)(async () => {
        dotenv.config();
        try {
            langchainAgent = await langchainAgent_1.LangchainAgent.create();
            networkClientWrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
            // create test accounts
            const startingHbars = 0;
            const autoAssociation = 0; // no auto association
            await Promise.all([
                networkClientWrapper.createAccount(startingHbars, autoAssociation),
                networkClientWrapper.createAccount(startingHbars, autoAssociation),
                networkClientWrapper.createAccount(startingHbars, autoAssociation),
            ]).then(([_acc1, _acc2, _acc3]) => {
                acc1 = _acc1;
                acc2 = _acc2;
                acc3 = _acc3;
            });
            // create token
            token1 = await networkClientWrapper.createFT({
                name: "AirDrop1",
                symbol: "AD1",
                initialSupply: 1000,
                decimals: 2,
            });
            // airdrop token
            await networkClientWrapper.airdropToken(token1, [
                {
                    accountId: acc1.accountId,
                    amount: 10,
                },
                {
                    accountId: acc2.accountId,
                    amount: 10,
                },
                {
                    accountId: acc3.accountId,
                    amount: 7,
                },
            ]);
            await (0, utils_1.wait)(5000);
            testCases = [
                [
                    acc1.accountId,
                    token1,
                    `Show me pending airdrops for account ${acc1.accountId}`,
                    10,
                ],
                [
                    acc2.accountId,
                    token1,
                    `Get pending airdrops for account ${acc2.accountId}`,
                    10,
                ],
                [
                    acc3.accountId,
                    token1,
                    `Display pending airdrops for account ${acc3.accountId}`,
                    7,
                ],
            ];
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.describe)("pending airdrops checks", () => {
        (0, vitest_1.it)("should test dynamic token airdrops", async () => {
            for (const [accountId, tokenId, promptText, expectedAmount,] of testCases) {
                const prompt = {
                    user: "user",
                    text: promptText,
                };
                const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
                const airdrops = findAirdrops(response.messages);
                const relevantAirdrop = airdrops.find((airdrop) => airdrop.receiver_id === accountId && airdrop.token_id === tokenId);
                if (!relevantAirdrop) {
                    throw new Error(`No matching airdrop found for account ${accountId} and token ${tokenId}`);
                }
                const expectedResult = {
                    amount: expectedAmount,
                    receiver_id: accountId,
                    sender_id: networkClientWrapper.getAccountId(),
                    token_id: tokenId,
                };
                (0, vitest_1.expect)(relevantAirdrop.amount).toEqual(expectedResult.amount);
                (0, vitest_1.expect)(relevantAirdrop.receiver_id).toEqual(expectedResult.receiver_id);
                (0, vitest_1.expect)(relevantAirdrop.sender_id).toEqual(expectedResult.sender_id);
                (0, vitest_1.expect)(relevantAirdrop.token_id).toEqual(expectedResult.token_id);
                await (0, utils_1.wait)(5000);
            }
        });
    });
});
