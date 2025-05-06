"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DissociateTokenStrategy = void 0;
const sdk_1 = require("@hashgraph/sdk");
class DissociateTokenStrategy {
    constructor(tokenId, issuerAccountId) {
        this.tokenId = tokenId;
        this.issuerAccountId = issuerAccountId;
    }
    build() {
        return new sdk_1.TokenDissociateTransaction()
            .setAccountId(this.issuerAccountId)
            .setTokenIds([this.tokenId]);
    }
    formatResult(txResponse, receipt) {
        return {
            status: receipt.status.toString(),
            txHash: txResponse.transactionId.toString(),
        };
    }
}
exports.DissociateTokenStrategy = DissociateTokenStrategy;
