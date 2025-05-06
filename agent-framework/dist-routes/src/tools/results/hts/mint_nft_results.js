"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonCustodialMintNFTResult = exports.CustodialMintNFTResult = void 0;
const types_1 = require("../../../types");
class CustodialMintNFTResult {
    constructor(txHash, status) {
        this.txHash = txHash;
        this.status = status;
        this.actionName = types_1.AgentKitActionName.MINT_NFT_TOKEN_CUSTODIAL;
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
            message: "NFT minted",
            txHash: this.txHash
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.CustodialMintNFTResult = CustodialMintNFTResult;
class NonCustodialMintNFTResult {
    constructor(txBytes) {
        this.txBytes = txBytes;
        this.actionName = types_1.AgentKitActionName.MINT_NFT_TOKEN_NON_CUSTODIAL;
    }
    getRawResponse() {
        return this.txBytes;
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "NFT mint transaction bytes have been successfully created.",
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.NonCustodialMintNFTResult = NonCustodialMintNFTResult;
