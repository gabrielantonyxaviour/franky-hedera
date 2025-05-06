"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonCustodialDissociateTokenResult = exports.CustodialDissociateTokenResult = void 0;
const types_1 = require("../../../types");
class CustodialDissociateTokenResult {
    constructor(txHash, status) {
        this.txHash = txHash;
        this.status = status;
        this.actionName = types_1.AgentKitActionName.DISSOCIATE_TOKEN_CUSTODIAL;
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
            message: "Token dissociated",
            txHash: this.txHash
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.CustodialDissociateTokenResult = CustodialDissociateTokenResult;
class NonCustodialDissociateTokenResult {
    constructor(txBytes) {
        this.txBytes = txBytes;
        this.actionName = types_1.AgentKitActionName.DISSOCIATE_TOKEN_NON_CUSTODIAL;
    }
    getRawResponse() {
        return this.txBytes;
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Token dissociation transaction bytes have been successfully created.",
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.NonCustodialDissociateTokenResult = NonCustodialDissociateTokenResult;
