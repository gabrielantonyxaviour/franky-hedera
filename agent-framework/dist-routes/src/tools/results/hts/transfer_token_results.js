"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonCustodialTransferTokenResult = exports.CustodialTransferTokenResult = void 0;
const types_1 = require("../../../types");
class CustodialTransferTokenResult {
    constructor(txHash, status) {
        this.txHash = txHash;
        this.status = status;
        this.actionName = types_1.AgentKitActionName.TRANSFER_TOKEN_NON_CUSTODIAL;
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
exports.CustodialTransferTokenResult = CustodialTransferTokenResult;
class NonCustodialTransferTokenResult {
    constructor(txBytes) {
        this.txBytes = txBytes;
        this.actionName = types_1.AgentKitActionName.TRANSFER_TOKEN_CUSTODIAL;
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
exports.NonCustodialTransferTokenResult = NonCustodialTransferTokenResult;
