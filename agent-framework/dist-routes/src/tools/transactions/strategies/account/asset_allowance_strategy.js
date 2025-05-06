"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetAllowanceStrategy = void 0;
const sdk_1 = require("@hashgraph/sdk");
class AssetAllowanceStrategy {
    constructor(tokenId, amount, payerAccountId, spenderAccountId) {
        this.tokenId = tokenId;
        this.amount = amount;
        this.payerAccountId = payerAccountId;
        this.spenderAccountId = spenderAccountId;
    }
    build() {
        const tx = new sdk_1.AccountAllowanceApproveTransaction();
        if (this.tokenId) {
            tx.approveTokenAllowance(this.tokenId, this.payerAccountId, this.spenderAccountId, this.amount);
        }
        else {
            tx.approveHbarAllowance(this.payerAccountId, this.spenderAccountId, this.amount);
        }
        return tx;
    }
    formatResult(txResponse, receipt) {
        return {
            status: receipt.status.toString(),
            txHash: txResponse.transactionId.toString(),
        };
    }
}
exports.AssetAllowanceStrategy = AssetAllowanceStrategy;
