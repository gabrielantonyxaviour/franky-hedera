"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferTokenStrategy = void 0;
const sdk_1 = require("@hashgraph/sdk");
class TransferTokenStrategy {
    constructor(tokenId, amount, targetAccountId, issuerAccountId) {
        this.tokenId = tokenId;
        this.amount = amount;
        this.targetAccountId = targetAccountId;
        this.issuerAccountId = issuerAccountId;
    }
    build() {
        return new sdk_1.TransferTransaction()
            .addTokenTransfer(this.tokenId, this.issuerAccountId, -this.amount)
            .addTokenTransfer(this.tokenId, this.targetAccountId, this.amount);
    }
    formatResult(txResponse, receipt) {
        return {
            status: receipt.status.toString(),
            txHash: txResponse.transactionId.toString(),
        };
    }
}
exports.TransferTokenStrategy = TransferTokenStrategy;
