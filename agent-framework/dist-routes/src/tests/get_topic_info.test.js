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
const hederaMirrorNodeClient_1 = require("./utils/hederaMirrorNodeClient");
const langchainAgent_1 = require("./utils/langchainAgent");
const utils_1 = require("./utils/utils");
const IS_CUSTODIAL = true;
function extractTopicInfo(messages) {
    const result = messages.reduce((acc, message) => {
        try {
            const parsedMessage = JSON.parse(message.content);
            if (parsedMessage.topicInfo) {
                return parsedMessage.topicInfo;
            }
            return acc;
        }
        catch (error) {
            return acc;
        }
    }, "");
    if (!result) {
        throw new Error("No topic info found");
    }
    return result;
}
dotenv.config();
(0, vitest_1.describe)("get_topic_info", () => {
    let topic1;
    let topic2;
    let topic3;
    let langchainAgent;
    let testCases;
    let networkClientWrapper;
    const hederaMirrorNodeClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient(process.env.HEDERA_NETWORK_TYPE);
    (0, vitest_1.beforeAll)(async () => {
        try {
            langchainAgent = await langchainAgent_1.LangchainAgent.create();
            networkClientWrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
            await Promise.all([
                networkClientWrapper.createTopic("Hello world 1", true),
                networkClientWrapper.createTopic("Hello world 2", true),
                networkClientWrapper.createTopic("Hello world 3", true),
            ]).then(([_topic1, _topic2, _topic3]) => {
                topic1 = _topic1.topicId;
                topic2 = _topic2.topicId;
                topic3 = _topic3.topicId;
            });
            testCases = [
                {
                    textPrompt: `Give me the info for topic ${topic1}`,
                    topicId: topic1,
                },
                {
                    textPrompt: `Give me the details about topic ${topic2}`,
                    topicId: topic2,
                },
                {
                    textPrompt: `I'd like to see the status of topic ${topic3}`,
                    topicId: topic3,
                },
            ];
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.describe)("get topic info checks", () => {
        (0, vitest_1.it)("should get topic info", async () => {
            for (const { textPrompt } of testCases) {
                const prompt = {
                    user: "user",
                    text: textPrompt,
                };
                const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
                await (0, utils_1.wait)(5000);
                const topicInfo = extractTopicInfo(response.messages);
                const topicId = topicInfo.topic_id ?? "";
                const mirrorNodeTopicInfo = await hederaMirrorNodeClient.getTopic(topicId);
                (0, vitest_1.expect)(topicId).toBe(mirrorNodeTopicInfo.topic_id);
                (0, vitest_1.expect)(topicInfo.memo).toBe(mirrorNodeTopicInfo.memo);
                (0, vitest_1.expect)(topicInfo.admin_key?.key).toBe(mirrorNodeTopicInfo.admin_key?.key);
                (0, vitest_1.expect)(topicInfo.admin_key?._type).toBe(mirrorNodeTopicInfo.admin_key?._type);
                (0, vitest_1.expect)(topicInfo.timestamp?.from).toBe(mirrorNodeTopicInfo.timestamp.from);
                (0, vitest_1.expect)(topicInfo.timestamp?.to).toBe(mirrorNodeTopicInfo.timestamp.to);
            }
        });
    });
});
