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
(0, vitest_1.describe)("create_topic", () => {
    const hederaMirrorNodeClient = new hederaMirrorNodeClient_1.HederaMirrorNodeClient(process.env.HEDERA_NETWORK_TYPE);
    (0, vitest_1.describe)("create_topic", () => {
        (0, vitest_1.it)("should create topic", async () => {
            const MEMO = "Hello world";
            const prompt = {
                user: "user",
                text: `Create a topic with memo "${MEMO}"`,
            };
            const langchainAgent = await langchainAgent_1.LangchainAgent.create();
            const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
            console.log(JSON.stringify(response, null, 2));
            const topicId = extractTopicId(response.messages);
            await (0, utils_1.wait)(5000);
            const topic = await hederaMirrorNodeClient.getTopic(topicId);
            (0, vitest_1.expect)(topic.memo).toEqual(MEMO);
            (0, vitest_1.expect)(!!topic.submit_key).toBeFalsy();
        });
        (0, vitest_1.it)("should create topic with submit key", async () => {
            const MEMO = "Hello world";
            const prompt = {
                user: "user",
                text: `Create a topic with memo "${MEMO}". Restrict posting with a key`,
            };
            const langchainAgent = await langchainAgent_1.LangchainAgent.create();
            const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
            const topicId = extractTopicId(response.messages);
            await (0, utils_1.wait)(5000);
            const topic = await hederaMirrorNodeClient.getTopic(topicId);
            (0, vitest_1.expect)(topic.memo).toEqual(MEMO);
            (0, vitest_1.expect)(!!topic.submit_key).toBeTruthy();
        });
        (0, vitest_1.it)("should create topic without submit key", async () => {
            const MEMO = "Hello world";
            const prompt = {
                user: "user",
                text: `Create a topic with memo "${MEMO}". Do not set a submit key`,
            };
            const langchainAgent = await langchainAgent_1.LangchainAgent.create();
            const response = await langchainAgent.sendPrompt(prompt, IS_CUSTODIAL);
            const topicId = extractTopicId(response.messages);
            await (0, utils_1.wait)(5000);
            const topic = await hederaMirrorNodeClient.getTopic(topicId);
            (0, vitest_1.expect)(topic.memo).toEqual(MEMO);
            (0, vitest_1.expect)(!!topic.submit_key).toBeFalsy();
        });
    });
});
