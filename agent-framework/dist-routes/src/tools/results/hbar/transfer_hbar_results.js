"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonCustodialTransferHbarResult = exports.CustodialTransferHbarResult = void 0;
const types_1 = require("../../../types");
class CustodialTransferHbarResult {
    constructor(txHash, status) {
        this.txHash = txHash;
        this.status = status;
        this.actionName = types_1.AgentKitActionName.TRANSFER_HBAR_CUSTODIAL;
    }
    getRawResponse() {
        return {
            status: this.status,
            txHash: this.txHash,
        };
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: this.status,
            message: "HBAR transferred",
            txHash: this.txHash
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.CustodialTransferHbarResult = CustodialTransferHbarResult;
class NonCustodialTransferHbarResult {
    constructor(txBytes) {
        this.txBytes = txBytes;
        this.actionName = types_1.AgentKitActionName.TRANSFER_HBAR_NON_CUSTODIAL;
    }
    getRawResponse() {
        return this.txBytes;
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "HBAR transfer transaction bytes have been successfully created.",
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.NonCustodialTransferHbarResult = NonCustodialTransferHbarResult;
