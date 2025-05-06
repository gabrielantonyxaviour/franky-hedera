"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MintNftStrategy = void 0;
const sdk_1 = require("@hashgraph/sdk");
class MintNftStrategy {
    constructor(tokenId, tokenMetadata) {
        this.tokenId = tokenId;
        this.tokenMetadata = tokenMetadata;
    }
    build() {
        return new sdk_1.TokenMintTransaction()
            .setTokenId(this.tokenId)
            .addMetadata(this.tokenMetadata);
    }
    formatResult(txResponse, receipt) {
        return {
            status: receipt.status.toString(),
            txHash: txResponse.transactionId.toString(),
        };
    }
}
exports.MintNftStrategy = MintNftStrategy;
