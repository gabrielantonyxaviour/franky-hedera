"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkClientWrapper = void 0;
const sdk_1 = require("@hashgraph/sdk");
const testnetUtils_1 = require("./testnetUtils");
const agent_1 = __importDefault(require("../../agent"));
class NetworkClientWrapper {
    constructor(accountIdString, privateKeyString, publicKey, keyType, networkType) {
        this.publicKey = sdk_1.PublicKey.fromString(publicKey);
        this.accountId = sdk_1.AccountId.fromString(accountIdString);
        this.privateKey = (0, testnetUtils_1.hederaPrivateKeyFromString)({
            key: privateKeyString,
            keyType,
        }).privateKey;
        this.client = sdk_1.Client.forTestnet();
        this.client.setOperator(this.accountId, this.privateKey);
        this.agentKit = new agent_1.default(this.accountId.toString(), this.privateKey.toString(), this.publicKey.toStringDer(), networkType);
    }
    async createAccount(initialHBARAmount = 0, maxAutoAssociation = -1 // defaults to setting max auto association to unlimited
    ) {
        const accountPrivateKey = sdk_1.PrivateKey.generateECDSA();
        const accountPublicKey = accountPrivateKey.publicKey;
        const tx = new sdk_1.AccountCreateTransaction()
            .setKey(accountPublicKey)
            .setAlias(accountPublicKey.toEvmAddress())
            .setInitialBalance(new sdk_1.Hbar(initialHBARAmount))
            .setMaxAutomaticTokenAssociations(maxAutoAssociation);
        const txResponse = await tx.execute(this.client);
        const receipt = await txResponse.getReceipt(this.client);
        const txStatus = receipt.status;
        if (!txStatus.toString().includes("SUCCESS"))
            throw new Error("Token Association failed");
        const accountId = receipt.accountId;
        return {
            accountId: accountId.toString(),
            privateKey: accountPrivateKey.toStringRaw(),
            publicKey: accountPublicKey.toStringRaw(),
        };
    }
    async setMaxAutoAssociation(maxAutoAssociation) {
        const tx = new sdk_1.AccountUpdateTransaction()
            .setAccountId(this.accountId)
            .setMaxAutomaticTokenAssociations(maxAutoAssociation)
            .freezeWith(this.client);
        const txResponse = await tx.execute(this.client);
        await txResponse.getReceipt(this.client);
    }
    async createFT(options) {
        const isCustodial = true; // this method is hardcoded as custodial
        const result = await this.agentKit
            .createFT(options, isCustodial)
            .then(response => response.getRawResponse());
        return result.tokenId.toString();
    }
    async createNFT(options) {
        const isCustodial = true; // this method is hardcoded as custodial
        const result = await this.agentKit
            .createNFT(options, isCustodial)
            .then(response => response.getRawResponse());
        return result.tokenId.toString();
    }
    async transferToken(receiverId, tokenId, amount) {
        const isCustodial = true; // this method is hardcoded as custodial
        await this.agentKit.transferToken(sdk_1.TokenId.fromString(tokenId), receiverId, amount, isCustodial);
    }
    async airdropToken(tokenId, recipients) {
        const isCustodial = true; // this method is hardcoded as custodial
        return await this.agentKit
            .airdropToken(sdk_1.TokenId.fromString(tokenId), recipients, isCustodial)
            .then(response => response.getRawResponse());
    }
    getAccountId() {
        return this.accountId.toString();
    }
    async createTopic(topicMemo, submitKey) {
        const isCustodial = true; // this method is hardcoded as custodial
        return this.agentKit
            .createTopic(topicMemo, submitKey, isCustodial)
            .then(response => response.getRawResponse());
    }
    async getAccountTokenBalance(tokenId, networkType, accountId) {
        return this.agentKit.getHtsBalance(tokenId, networkType, accountId);
    }
    async submitTopicMessage(topicId, message) {
        const isCustodial = true; // this method is hardcoded as custodial
        return this.agentKit
            .submitTopicMessage(sdk_1.TopicId.fromString(topicId), message, isCustodial)
            .then(response => response.getRawResponse());
    }
}
exports.NetworkClientWrapper = NetworkClientWrapper;
