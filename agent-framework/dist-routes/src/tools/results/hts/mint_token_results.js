"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonCustodialMintTokenResult = exports.CustodialMintTokenResult = void 0;
const types_1 = require("../../../types");
class CustodialMintTokenResult {
    constructor(txHash, status) {
        this.txHash = txHash;
        this.status = status;
        this.actionName = types_1.AgentKitActionName.MINT_TOKEN_CUSTODIAL;
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
            message: "Token minted",
            txHash: this.txHash
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.CustodialMintTokenResult = CustodialMintTokenResult;
class NonCustodialMintTokenResult {
    constructor(txBytes) {
        this.txBytes = txBytes;
        this.actionName = types_1.AgentKitActionName.MINT_TOKEN_NON_CUSTODIAL;
    }
    getRawResponse() {
        return this.txBytes;
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Token mint transaction bytes have been successfully created.",
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.NonCustodialMintTokenResult = NonCustodialMintTokenResult;
