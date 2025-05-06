"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonCustodialAssetAllowanceResult = exports.CustodialAssetAllowanceResult = void 0;
const types_1 = require("../../../types");
class CustodialAssetAllowanceResult {
    constructor(txHash, status) {
        this.txHash = txHash;
        this.status = status;
        this.actionName = types_1.AgentKitActionName.ASSET_ALLOWANCE_CUSTODIAL;
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
            message: "Asset allowance created",
            txHash: this.txHash
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.CustodialAssetAllowanceResult = CustodialAssetAllowanceResult;
class NonCustodialAssetAllowanceResult {
    constructor(txBytes) {
        this.txBytes = txBytes;
        this.actionName = types_1.AgentKitActionName.ASSET_ALLOWANCE_NON_CUSTODIAL;
    }
    getRawResponse() {
        return this.txBytes;
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Asset allowance transaction bytes have been successfully created.",
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.NonCustodialAssetAllowanceResult = NonCustodialAssetAllowanceResult;
