"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonCustodialCreateTokenResult = exports.CustodialCreateTokenResult = void 0;
const types_1 = require("../../../types");
class CustodialCreateTokenResult {
    constructor(txHash, status, tokenId) {
        this.txHash = txHash;
        this.status = status;
        this.tokenId = tokenId;
        this.actionName = types_1.AgentKitActionName.CREATE_TOKEN_CUSTODIAL;
    }
    getRawResponse() {
        return {
            status: this.status.toLowerCase(),
            txHash: this.txHash,
            tokenId: this.tokenId,
        };
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: this.status.toLowerCase(),
            message: "Token created",
            txHash: this.txHash,
            tokenId: this.tokenId.toString(),
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.CustodialCreateTokenResult = CustodialCreateTokenResult;
class NonCustodialCreateTokenResult {
    constructor(txBytes) {
        this.txBytes = txBytes;
        this.actionName = types_1.AgentKitActionName.CREATE_TOKEN_NON_CUSTODIAL;
    }
    getRawResponse() {
        return this.txBytes;
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Create token transaction bytes have been successfully created.",
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.NonCustodialCreateTokenResult = NonCustodialCreateTokenResult;
