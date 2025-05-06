"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitTopicMessageStrategy = void 0;
const sdk_1 = require("@hashgraph/sdk");
class SubmitTopicMessageStrategy {
    constructor(topicId, message) {
        this.topicId = topicId;
        this.message = message;
    }
    build() {
        return new sdk_1.TopicMessageSubmitTransaction({
            topicId: this.topicId,
            message: this.message,
        });
    }
    formatResult(txResponse, receipt) {
        return {
            txHash: txResponse.transactionId.toString(),
            status: receipt.status.toString(),
            topicId: this.topicId.toString()
        };
    }
}
exports.SubmitTopicMessageStrategy = SubmitTopicMessageStrategy;
