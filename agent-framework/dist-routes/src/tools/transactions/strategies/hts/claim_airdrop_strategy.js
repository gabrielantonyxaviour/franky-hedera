"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimAirdropStrategy = void 0;
const sdk_1 = require("@hashgraph/sdk");
class ClaimAirdropStrategy {
    constructor(airdropId) {
        this.airdropId = airdropId;
    }
    build() {
        return new sdk_1.TokenClaimAirdropTransaction()
            .addPendingAirdropId(this.airdropId);
    }
    formatResult(txResponse, receipt) {
        return {
            status: receipt.status.toString(),
            txHash: txResponse.transactionId.toString(),
        };
    }
}
exports.ClaimAirdropStrategy = ClaimAirdropStrategy;
