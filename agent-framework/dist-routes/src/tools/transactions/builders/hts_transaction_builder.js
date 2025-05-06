"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HtsTransactionBuilder = void 0;
const base_transaction_builder_1 = require("./base_transaction_builder");
const strategies_1 = require("../strategies");
class HtsTransactionBuilder {
    static airdropToken(tokenId, recipients, issuerAccountId) {
        const strategy = new strategies_1.AirdropTokenStrategy(tokenId, recipients, issuerAccountId);
        return new base_transaction_builder_1.BaseTransactionBuilder(strategy);
    }
    static associateToken(tokenId, issuerAccountId) {
        const strategy = new strategies_1.AssociateTokenStrategy(tokenId, issuerAccountId);
        return new base_transaction_builder_1.BaseTransactionBuilder(strategy);
    }
    static claimAirdrop(airdropId) {
        const strategy = new strategies_1.ClaimAirdropStrategy(airdropId);
        return new base_transaction_builder_1.BaseTransactionBuilder(strategy);
    }
    static createToken(options, publicKey, issuerAccountId) {
        const strategy = new strategies_1.CreateTokenStrategy(options, publicKey, issuerAccountId);
        return new base_transaction_builder_1.BaseTransactionBuilder(strategy);
    }
    static dissociateToken(tokenId, issuerAccountId) {
        const strategy = new strategies_1.DissociateTokenStrategy(tokenId, issuerAccountId);
        return new base_transaction_builder_1.BaseTransactionBuilder(strategy);
    }
    static mintNft(tokenId, tokenMetadata) {
        const strategy = new strategies_1.MintNftStrategy(tokenId, tokenMetadata);
        return new base_transaction_builder_1.BaseTransactionBuilder(strategy);
    }
    static mintToken(tokenId, amount) {
        const strategy = new strategies_1.MintTokenStrategy(tokenId, amount);
        return new base_transaction_builder_1.BaseTransactionBuilder(strategy);
    }
    static rejectToken(tokenId, issuerAccountId) {
        const strategy = new strategies_1.RejectTokenStrategy(tokenId, issuerAccountId);
        return new base_transaction_builder_1.BaseTransactionBuilder(strategy);
    }
    static transferToken(tokenId, amount, targetAccountId, issuerAccountId) {
        const strategy = new strategies_1.TransferTokenStrategy(tokenId, amount, targetAccountId, issuerAccountId);
        return new base_transaction_builder_1.BaseTransactionBuilder(strategy);
    }
}
exports.HtsTransactionBuilder = HtsTransactionBuilder;
