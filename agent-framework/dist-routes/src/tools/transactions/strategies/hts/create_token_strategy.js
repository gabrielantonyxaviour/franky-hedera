"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTokenStrategy = void 0;
const sdk_1 = require("@hashgraph/sdk");
class CreateTokenStrategy {
    constructor(options, publicKey, issuerAccountId) {
        this.options = options;
        this.publicKey = publicKey;
        this.issuerAccountId = issuerAccountId;
    }
    build() {
        const tx = new sdk_1.TokenCreateTransaction()
            .setTokenName(this.options.name)
            .setTokenSymbol(this.options.symbol)
            .setTokenType(this.options.tokenType)
            .setDecimals(this.options?.decimals || 0)
            .setInitialSupply(this.options?.initialSupply || 0)
            .setTreasuryAccountId(this.issuerAccountId);
        // Optional and conditional parameters
        if (this.options.maxSupply) {
            tx.setMaxSupply(this.options.maxSupply).setSupplyType(sdk_1.TokenSupplyType.Finite);
        }
        if (this.options.tokenMetadata) {
            tx.setMetadata(this.options.tokenMetadata);
        }
        if (this.options.memo) {
            tx.setTokenMemo(this.options.memo);
        }
        if (this.options.isMetadataKey) {
            tx.setMetadataKey(this.publicKey);
        }
        if (this.options.isSupplyKey) {
            tx.setSupplyKey(this.publicKey);
        }
        if (this.options.isAdminKey) {
            tx.setAdminKey(this.publicKey);
        }
        return tx;
    }
    formatResult(txResponse, receipt) {
        if (!receipt.tokenId)
            throw new Error("Token Create Transaction failed");
        return {
            status: receipt.status.toString(),
            txHash: txResponse.transactionId.toString(),
            tokenId: receipt.tokenId,
        };
    }
}
exports.CreateTokenStrategy = CreateTokenStrategy;
