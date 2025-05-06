"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTopicStrategy = void 0;
const sdk_1 = require("@hashgraph/sdk");
class CreateTopicStrategy {
    constructor(memo, publicKey, isSubmitKey) {
        this.memo = memo;
        this.publicKey = publicKey;
        this.isSubmitKey = isSubmitKey;
    }
    build() {
        let tx = new sdk_1.TopicCreateTransaction()
            .setTopicMemo(this.memo)
            .setAdminKey(this.publicKey);
        if (this.isSubmitKey) {
            tx.setSubmitKey(this.publicKey);
        }
        return tx;
    }
    formatResult(txResponse, receipt) {
        if (!receipt.topicId)
            throw new Error("Topic Create Transaction failed");
        return {
            txHash: txResponse.transactionId.toString(),
            status: receipt.status.toString(),
            topicId: receipt.topicId.toString(),
        };
    }
}
exports.CreateTopicStrategy = CreateTopicStrategy;
