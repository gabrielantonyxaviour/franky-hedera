"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaGetTopicMessagesTool = void 0;
const tools_1 = require("@langchain/core/tools");
const sdk_1 = require("@hashgraph/sdk");
class HederaGetTopicMessagesTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_get_topic_messages';
        this.description = `Get messages from a topic on Hedera within an optional time range.

Inputs (input is a JSON string):
- topicId: string, the ID of the topic to get the messages from e.g. "0.0.123456"
- lowerThreshold: string (optional), ISO date string for the start of the time range e.g. "2025-01-02T00:00:00.000Z"
- upperThreshold: string (optional), ISO date string for the end of the time range e.g. "2025-01-20T12:50:30.123Z"

Example usage:
1. Get all messages from topic 0.0.123456:
  '{
    "topicId": "0.0.123456"
  }'

2. Get messages from topic after January 2, 2025:
  '{
    "topicId": "0.0.123456",
    "lowerThreshold": "2025-01-02T00:00:00.000Z"
  }'

3. Get messages between two dates: 2024-03-05T13:40:00.000Z and 2025-01-20T12:50:30.123Z
  '{
    "topicId": "0.0.123456", 
    "lowerThreshold": "2024-03-05T13:40:00.000Z",
    "upperThreshold": "2025-01-20T12:50:30.123Z"
  }'
`;
    }
    async _call(input) {
        try {
            console.log('hedera_get_topic_messages tool has been called');
            const parsedInput = JSON.parse(input);
            const messages = await this.hederaKit.getTopicMessages(sdk_1.TopicId.fromString(parsedInput.topicId), process.env.HEDERA_NETWORK_TYPE || "testnet", parsedInput.lowerThreshold, parsedInput.upperThreshold);
            return JSON.stringify({
                status: "success",
                message: "Topic messages retrieved",
                messages: messages
            });
        }
        catch (error) {
            return JSON.stringify({
                status: "error",
                message: error.message,
                code: error.code || "UNKNOWN_ERROR",
            });
        }
    }
}
exports.HederaGetTopicMessagesTool = HederaGetTopicMessagesTool;
