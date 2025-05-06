"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaDeleteTopicTool = void 0;
const tools_1 = require("@langchain/core/tools");
const sdk_1 = require("@hashgraph/sdk");
class HederaDeleteTopicTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_delete_topic';
        this.description = `Delete a topic on Hedera
Inputs (input is a JSON string):
topicId: string, the ID of the topic to delete e.g. 0.0.123456,
Example usage:
1. Delete topic 0.0.123456:
  '{
    "topicId": "0.0.123456"
  }'
`;
    }
    async _call(input, _runManager, config) {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            console.log(`hedera_delete_topic tool has been called (${isCustodial ? 'custodial' : 'non-custodial'})`);
            const parsedInput = JSON.parse(input);
            return await this.hederaKit.deleteTopic(sdk_1.TopicId.fromString(parsedInput.topicId), isCustodial).then(response => response.getStringifiedResponse());
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
exports.HederaDeleteTopicTool = HederaDeleteTopicTool;
