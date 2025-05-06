"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaGetTopicInfoTool = void 0;
const tools_1 = require("@langchain/core/tools");
const sdk_1 = require("@hashgraph/sdk");
class HederaGetTopicInfoTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_get_topic_info';
        this.description = `Get information about a topic on Hedera
Inputs ( input is a JSON string ):
topicId: string, the ID of the topic to get the information for e.g. 0.0.123456,
Example usage:
1. Get information about topic 0.0.123456:
  '{
    "topicId": "0.0.123456"
  }'
`;
    }
    async _call(input) {
        try {
            console.log('hedera_get_topic_info tool has been called');
            const parsedInput = JSON.parse(input);
            const topicInfo = await this.hederaKit.getTopicInfo(sdk_1.TopicId.fromString(parsedInput.topicId), process.env.HEDERA_NETWORK_TYPE || "testnet");
            return JSON.stringify({
                status: "success",
                message: "Topic information retrieved",
                topicInfo: topicInfo
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
exports.HederaGetTopicInfoTool = HederaGetTopicInfoTool;
