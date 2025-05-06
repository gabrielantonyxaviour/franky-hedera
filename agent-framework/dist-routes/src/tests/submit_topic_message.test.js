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
const extractTopicId = (messages) => {
    const result = messages.reduce((acc, message) => {
        try {
            const parsedMessage = JSON.parse(message.content);
            if (parsedMessage.topicId) {
                return parsedMessage.topicId;
            }
            return acc;
        }
        catch (error) {
            return acc;
        }
    }, "");
    if (!result) {
        throw new Error("No topic ID found");
    }
    return result;
};
dotenv.config();
(0, vitest_1.describe)("submit_topic_message", () => {
    let topic1;
    let topic2;
    let topic3;
    const MESSAGE1 = "Message1";
    const MESSAGE2 = "Message2";
    const MESSAGE3 = "Message3";
    let testCases;
    let networkClientWrapper;
    const hederaMirrorNodeClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient(process.env.HEDERA_NETWORK_TYPE);
    (0, vitest_1.beforeAll)(async () => {
        try {
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
                    textPrompt: `Submit message ${MESSAGE1} to topic ${topic1}`,
                    topicId: topic1,
                    message: MESSAGE1,
                },
                {
                    textPrompt: `Submit message ${MESSAGE2} to topic ${topic2}`,
                    topicId: topic2,
                    message: MESSAGE2,
                },
                {
                    textPrompt: `Submit message ${MESSAGE3} to topic ${topic3}`,
                    topicId: topic3,
                    message: MESSAGE3,
                },
            ];
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.describe)("submit topic message checks", () => {
        (0, vitest_1.it)("should submit message to topic", async () => {
            for (const { textPrompt, message, topicId: expectedTopicId, } of testCases) {
                const prompt = {
                    user: "user",
                    text: textPrompt,
                };
                const langchainAgent = await langchainAgent_1.LangchainAgent.create();
                const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
                console.log(JSON.stringify(response, null, 2));
                const extractedTopicId = extractTopicId(response.messages);
                await (0, utils_1.wait)(5000);
                const topicMessages = await hederaMirrorNodeClient.getTopicMessages(extractedTopicId);
                const receivedMessage = topicMessages.find(({ message: _message }) => {
                    return message === _message;
                });
                (0, vitest_1.expect)(expectedTopicId).toEqual(extractedTopicId);
                (0, vitest_1.expect)(receivedMessage).toBeTruthy();
            }
        });
    });
});
