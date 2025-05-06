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
function extractTopicMessages(messages) {
    const result = messages.reduce((acc, message) => {
        try {
            const toolResponse = JSON.parse(message.content);
            if (toolResponse.status === "success" && toolResponse.messages) {
                return toolResponse.messages;
            }
            return acc;
        }
        catch (error) {
            return acc;
        }
    }, null);
    if (!result) {
        throw new Error("No topic messages found");
    }
    return result;
}
dotenv.config();
(0, vitest_1.describe)("get_topic_messages", () => {
    let topic1;
    let topic2;
    let langchainAgent;
    let testCases;
    let networkClientWrapper;
    const hederaMirrorNodeClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient(process.env.HEDERA_NETWORK_TYPE);
    (0, vitest_1.beforeAll)(async () => {
        try {
            networkClientWrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
            await Promise.all([
                networkClientWrapper.createTopic("Hello world 1", true),
                networkClientWrapper.createTopic("Hello world 2", true),
            ]).then(([_topic1, _topic2]) => {
                topic1 = _topic1.topicId;
                topic2 = _topic2.topicId;
            });
            const timestampBefore = new Date().toISOString();
            await (0, utils_1.wait)(1000);
            await Promise.all([
                networkClientWrapper.submitTopicMessage(topic1, "(1) Test message for topic 1."),
            ]);
            await (0, utils_1.wait)(1000);
            const timestampAfterFirstMsg = new Date().toISOString();
            await Promise.all([
                networkClientWrapper.submitTopicMessage(topic1, "(2) Test message for topic 1."),
                networkClientWrapper.submitTopicMessage(topic1, "(3) Test message for topic 1."),
            ]);
            await (0, utils_1.wait)(1000);
            testCases = [
                {
                    textPrompt: `Give me messages from topic ${topic1}  that were posted after ${timestampAfterFirstMsg}`,
                    topicId: topic1,
                    range: { lowerTimestamp: timestampAfterFirstMsg, upperTimestamp: undefined },
                    expectedLength: 2,
                },
                {
                    textPrompt: `Give me messages from topic ${topic1} that were posted before ${timestampBefore}`,
                    topicId: topic1,
                    range: { lowerTimestamp: undefined, upperTimestamp: timestampBefore },
                    expectedLength: 0,
                },
                {
                    textPrompt: `Give me messages from topic ${topic1} that were posted after ${timestampBefore}`,
                    topicId: topic1,
                    range: { lowerTimestamp: timestampBefore, upperTimestamp: undefined },
                    expectedLength: 3,
                },
                {
                    textPrompt: `Give me messages from topic ${topic1} that were posted after ${timestampBefore} and before ${timestampAfterFirstMsg}.`,
                    topicId: topic1,
                    range: { lowerTimestamp: timestampBefore, upperTimestamp: timestampAfterFirstMsg },
                    expectedLength: 1,
                },
                {
                    textPrompt: `Give me messages from topic ${topic2}`,
                    topicId: topic2,
                    range: { lowerTimestamp: undefined, upperTimestamp: undefined },
                    expectedLength: 0,
                },
                {
                    textPrompt: `Give me messages from topic ${topic1}`,
                    topicId: topic1,
                    range: { lowerTimestamp: undefined, upperTimestamp: undefined },
                    expectedLength: 3,
                },
            ];
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.describe)("get topic messages checks", () => {
        (0, vitest_1.it)("should get topic messages", async () => {
            for (const { textPrompt, topicId, range, expectedLength } of testCases) {
                langchainAgent = await langchainAgent_1.LangchainAgent.create();
                const prompt = {
                    user: "user",
                    text: textPrompt,
                };
                const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
                const messages = extractTopicMessages(response.messages);
                await (0, utils_1.wait)(5000);
                const mirrorNodeTopicMessages = await hederaMirrorNodeClient.getTopicMessages(topicId, range);
                if (expectedLength == 0) {
                    (0, vitest_1.expect)(mirrorNodeTopicMessages.length).toEqual(0);
                }
                else {
                    for (const mirrorNodeMessage of mirrorNodeTopicMessages) {
                        (0, vitest_1.expect)(topicId).toEqual(mirrorNodeMessage.topic_id);
                        const messageText = mirrorNodeMessage.message;
                        const messageFound = messages.some(msg => msg.message === messageText);
                        (0, vitest_1.expect)(messageFound).toBe(true);
                    }
                }
            }
        });
    });
});
