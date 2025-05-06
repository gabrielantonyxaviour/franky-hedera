"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonCustodialAirdropTokenResult = exports.CustodialAirdropTokenResult = void 0;
const types_1 = require("../../../types");
class CustodialAirdropTokenResult {
    constructor(txHash, status) {
        this.txHash = txHash;
        this.status = status;
        this.actionName = types_1.AgentKitActionName.AIRDROP_TOKEN_CUSTODIAL;
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
            message: "Token airdropped",
            txHash: this.txHash
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.CustodialAirdropTokenResult = CustodialAirdropTokenResult;
class NonCustodialAirdropTokenResult {
    constructor(txBytes) {
        this.txBytes = txBytes;
        this.actionName = types_1.AgentKitActionName.AIRDROP_TOKEN_NON_CUSTODIAL;
    }
    getRawResponse() {
        return this.txBytes;
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Token airdrop transaction bytes have been successfully created.",
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.NonCustodialAirdropTokenResult = NonCustodialAirdropTokenResult;
