"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaSubmitTopicMessageTool = void 0;
const tools_1 = require("@langchain/core/tools");
const sdk_1 = require("@hashgraph/sdk");
class HederaSubmitTopicMessageTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_submit_topic_message';
        this.description = `Submit a message to a topic on Hedera
Inputs (input is a JSON string):
topicId: string, the ID of the topic to submit the message to e.g. 0.0.123456,
message: string, the message to submit to the topic e.g. "Hello, Hedera!"
Example usage:
1. Submit a message to topic 0.0.123456:
  '{
    "topicId": "0.0.123456",
    "message": "Hello, Hedera!"
  }'
`;
    }
    async _call(input, _runManager, config) {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            console.log(`hedera_submit_topic_message tool has been called (${isCustodial ? 'custodial' : 'non-custodial'})`);
            const parsedInput = JSON.parse(input);
            const topicId = sdk_1.TopicId.fromString(parsedInput.topicId);
            return await this.hederaKit
                .submitTopicMessage(topicId, parsedInput.message, isCustodial)
                .then(response => response.getStringifiedResponse());
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
exports.HederaSubmitTopicMessageTool = HederaSubmitTopicMessageTool;
