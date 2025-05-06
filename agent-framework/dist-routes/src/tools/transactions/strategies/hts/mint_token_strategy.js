"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MintTokenStrategy = void 0;
const sdk_1 = require("@hashgraph/sdk");
class MintTokenStrategy {
    constructor(tokenId, amount) {
        this.tokenId = tokenId;
        this.amount = amount;
    }
    build() {
        return new sdk_1.TokenMintTransaction()
            .setTokenId(this.tokenId)
            .setAmount(this.amount);
    }
    formatResult(txResponse, receipt) {
        return {
            status: receipt.status.toString(),
            txHash: txResponse.transactionId.toString(),
        };
    }
}
exports.MintTokenStrategy = MintTokenStrategy;
