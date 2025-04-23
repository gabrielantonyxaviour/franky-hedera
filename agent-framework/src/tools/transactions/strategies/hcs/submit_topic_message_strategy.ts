import {
    TopicId,
    TopicMessageSubmitTransaction,
    Transaction,
    TransactionReceipt,
    TransactionResponse
} from "@hashgraph/sdk";
import { TransactionStrategy } from "../base_strategy";
import { SubmitMessageResult } from "../../../results";

export class SubmitTopicMessageStrategy implements TransactionStrategy<SubmitMessageResult> {
    constructor(
        private topicId: TopicId |string,
        private message: string,
    ) {}

    build(): Transaction {
        return new TopicMessageSubmitTransaction({
            topicId: this.topicId,
            message: this.message,
        });
    }

    formatResult(txResponse: TransactionResponse, receipt:  TransactionReceipt): SubmitMessageResult {
        return {
            txHash: txResponse.transactionId.toString(),
            status: receipt.status.toString(),
            topicId: this.topicId.toString()
        };
    }
}