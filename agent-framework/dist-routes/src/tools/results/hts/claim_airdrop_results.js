"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonCustodialClaimAirdropResult = exports.CustodialClaimAirdropResult = void 0;
const types_1 = require("../../../types");
class CustodialClaimAirdropResult {
    constructor(txHash, status) {
        this.txHash = txHash;
        this.status = status;
        this.actionName = types_1.AgentKitActionName.CLAIM_AIRDROP_CUSTODIAL;
    }
    getRawResponse() {
        return {
            status: this.status.toLowerCase(),
            txHash: this.txHash,
        };
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: this.status.toLowerCase(),
            message: "Airdrop claimed",
            txHash: this.txHash
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.CustodialClaimAirdropResult = CustodialClaimAirdropResult;
class NonCustodialClaimAirdropResult {
    constructor(txBytes) {
        this.txBytes = txBytes;
        this.actionName = types_1.AgentKitActionName.CLAIM_AIRDROP_NON_CUSTODIAL;
    }
    getRawResponse() {
        return this.txBytes;
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Claim airdrop transaction bytes have been successfully created.",
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.NonCustodialClaimAirdropResult = NonCustodialClaimAirdropResult;
