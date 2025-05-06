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
(0, vitest_1.describe)("reject_token", async () => {
    let acc1;
    let token1;
    let token2;
    let langchainAgent;
    let networkClientWrapper;
    const AIRDROPS_COUNT = 2;
    let airdropCreatorNetworkClientWrapper;
    let testCases;
    let hederaMirrorNodeClient;
    (0, vitest_1.beforeAll)(async () => {
        dotenv.config();
        try {
            langchainAgent = await langchainAgent_1.LangchainAgent.create();
            hederaMirrorNodeClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient("testnet");
            networkClientWrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
            const autoAssociationsCount = await hederaMirrorNodeClient.getAutomaticAssociationsCount(networkClientWrapper.getAccountId());
            const maxAutoAssociation = (await hederaMirrorNodeClient.getAccountInfo(networkClientWrapper.getAccountId())).max_automatic_token_associations;
            if (maxAutoAssociation !== -1 &&
                maxAutoAssociation - autoAssociationsCount < AIRDROPS_COUNT) {
                // need to be sure that airdrops will be claimed automatically
                await networkClientWrapper.setMaxAutoAssociation(autoAssociationsCount + AIRDROPS_COUNT);
            }
            // Create test account
            const startingHbars = 10;
            const autoAssociation = -1; // unlimited
            acc1 = await networkClientWrapper.createAccount(startingHbars, autoAssociation);
            airdropCreatorNetworkClientWrapper = new testnetClient_1.NetworkClientWrapper(acc1.accountId, acc1.privateKey, acc1.publicKey, "ECDSA", "testnet");
            // Create test tokens
            await Promise.all([
                airdropCreatorNetworkClientWrapper.createFT({
                    name: "AirdropToken",
                    symbol: "ADT",
                    initialSupply: 10000000,
                    decimals: 2,
                }),
                airdropCreatorNetworkClientWrapper.createFT({
                    name: "AirdropToken2",
                    symbol: "ADT2",
                    initialSupply: 10000,
                    decimals: 0,
                }),
            ]).then(([_token1, _token2]) => {
                token1 = _token1;
                token2 = _token2;
            });
            // Define test cases using created accounts and tokens
            //FIXME: failing
            await Promise.all([
                airdropCreatorNetworkClientWrapper.airdropToken(token1, [
                    {
                        accountId: networkClientWrapper.getAccountId(),
                        amount: 1,
                    },
                ]),
                airdropCreatorNetworkClientWrapper.airdropToken(token2, [
                    {
                        accountId: networkClientWrapper.getAccountId(),
                        amount: 1,
                    },
                ]),
            ]);
            testCases = [
                {
                    tokenId: token1,
                    promptText: `Reject token ${token1} from account ${airdropCreatorNetworkClientWrapper.getAccountId()}`,
                },
                {
                    tokenId: token2,
                    promptText: `Reject token ${token2} from account ${airdropCreatorNetworkClientWrapper.getAccountId()}`,
                },
            ];
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.it)("it should reject token from account", async () => {
        for (const { promptText, tokenId } of testCases) {
            const prompt = {
                user: "user",
                text: promptText,
            };
            const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
            await (0, utils_1.wait)(5000);
            const tokenInfo = await hederaMirrorNodeClient.getAccountToken(networkClientWrapper.getAccountId(), tokenId);
            (0, vitest_1.expect)(tokenInfo?.balance ?? 0).toBe(0);
        }
    });
});
