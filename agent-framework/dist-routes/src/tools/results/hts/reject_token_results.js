"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonCustodialRejectTokenResult = exports.CustodialRejectTokenResult = void 0;
const types_1 = require("../../../types");
class CustodialRejectTokenResult {
    constructor(txHash, status) {
        this.txHash = txHash;
        this.status = status;
        this.actionName = types_1.AgentKitActionName.REJECT_TOKEN_CUSTODIAL;
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
            message: "Token rejected",
            txHash: this.txHash
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.CustodialRejectTokenResult = CustodialRejectTokenResult;
class NonCustodialRejectTokenResult {
    constructor(txBytes) {
        this.txBytes = txBytes;
        this.actionName = types_1.AgentKitActionName.REJECT_TOKEN_NON_CUSTODIAL;
    }
    getRawResponse() {
        return this.txBytes;
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Token reject transaction bytes have been successfully created.",
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.NonCustodialRejectTokenResult = NonCustodialRejectTokenResult;
