"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirdropTokenStrategy = void 0;
const sdk_1 = require("@hashgraph/sdk");
class AirdropTokenStrategy {
    constructor(tokenId, recipients, payerAccountId) {
        this.tokenId = tokenId;
        this.recipients = recipients;
        this.payerAccountId = payerAccountId;
    }
    build() {
        const tx = new sdk_1.TokenAirdropTransaction();
        for (const recipient of this.recipients) {
            // Deduct from sender
            tx.addTokenTransfer(this.tokenId, this.payerAccountId, -recipient.amount);
            // Add to recipient
            tx.addTokenTransfer(this.tokenId, recipient.accountId, recipient.amount);
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
exports.AirdropTokenStrategy = AirdropTokenStrategy;
