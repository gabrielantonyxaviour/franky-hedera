import {TopicDeleteTransaction, TopicId, Transaction, TransactionReceipt, TransactionResponse} from "@hashgraph/sdk";
import { TransactionStrategy } from "../base_strategy";
import { DeleteTopicResult } from "../../../results";

export class DeleteTopicStrategy implements TransactionStrategy<DeleteTopicResult> {
    constructor(
        private topicId: TopicId | string,
    ) {}

    build(): Transaction {
        return new TopicDeleteTransaction()
            .setTopicId(this.topicId)
    }

    formatResult(txResponse: TransactionResponse, receipt:  TransactionReceipt): DeleteTopicResult {
        return {
            txHash: txResponse.transactionId.toString(),
            status: receipt.status.toString(),
        };
    }
}