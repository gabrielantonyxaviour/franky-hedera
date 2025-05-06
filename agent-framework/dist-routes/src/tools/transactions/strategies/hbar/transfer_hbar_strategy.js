"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferHbarStrategy = void 0;
const sdk_1 = require("@hashgraph/sdk");
class TransferHbarStrategy {
    constructor(fromAccountId, toAccountId, amount) {
        this.fromAccountId = fromAccountId;
        this.toAccountId = toAccountId;
        this.amount = amount;
    }
    build() {
        return new sdk_1.TransferTransaction()
            .addHbarTransfer(this.fromAccountId, new sdk_1.Hbar(-this.amount))
            .addHbarTransfer(this.toAccountId, new sdk_1.Hbar(this.amount));
    }
    formatResult(txResponse, receipt) {
        return {
            status: receipt.status.toString(),
            txHash: txResponse.transactionId.toString(),
        };
    }
}
exports.TransferHbarStrategy = TransferHbarStrategy;
