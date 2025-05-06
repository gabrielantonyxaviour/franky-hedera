"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteTopicStrategy = void 0;
const sdk_1 = require("@hashgraph/sdk");
class DeleteTopicStrategy {
    constructor(topicId) {
        this.topicId = topicId;
    }
    build() {
        return new sdk_1.TopicDeleteTransaction()
            .setTopicId(this.topicId);
    }
    formatResult(txResponse, receipt) {
        return {
            txHash: txResponse.transactionId.toString(),
            status: receipt.status.toString(),
        };
    }
}
exports.DeleteTopicStrategy = DeleteTopicStrategy;
