"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaAgentKit = void 0;
const sdk_1 = require("@hashgraph/sdk");
const builders_1 = require("../tools/transactions/builders");
const builders_2 = require("../tools/transactions/builders");
const builders_3 = require("../tools/transactions/builders");
const tools_1 = require("../tools");
const builders_4 = require("../tools/transactions/builders");
const tools_2 = require("../tools");
const tools_3 = require("../tools");
const tools_4 = require("../tools");
const tools_5 = require("../tools");
const tools_6 = require("../tools");
const tools_7 = require("../tools");
const tools_8 = require("../tools");
const tools_9 = require("../tools");
const tools_10 = require("../tools");
const tools_11 = require("../tools");
const tools_12 = require("../tools");
const tools_13 = require("../tools");
const tools_14 = require("../tools");
const logger_1 = require("../utils/logger");
class HederaAgentKit {
    constructor(accountId, privateKey, publicKey, network = 'mainnet') {
        this.network = 'mainnet';
        logger_1.logger.info('HederaAgentKit', 'Initializing HederaAgentKit', {
            accountId,
            hasPrivateKey: !!privateKey,
            hasPublicKey: !!publicKey,
            network
        });
        if (privateKey) {
            logger_1.logger.debug('HederaAgentKit', 'Initializing in custodial mode');
            // @ts-ignore
            this.client = sdk_1.Client.forNetwork(network).setOperator(accountId, privateKey);
            this.privateKey = privateKey;
            this.isCustodial = true;
        }
        else {
            logger_1.logger.debug('HederaAgentKit', 'Initializing in non-custodial mode');
            // @ts-ignore
            this.client = sdk_1.Client.forNetwork(network);
            if (!publicKey) {
                logger_1.logger.error('HederaAgentKit', 'Public key is missing for non-custodial mode');
                throw new Error("Public key is missing. To perform non custodial action you should pass public key!");
            }
            this.isCustodial = false;
        }
        try {
            this.publicKey = sdk_1.PublicKey.fromString(publicKey);
            logger_1.logger.debug('HederaAgentKit', 'Public key parsed successfully');
        }
        catch (error) {
            logger_1.logger.error('HederaAgentKit', 'Failed to parse public key', error);
            throw error;
        }
        this.network = network;
        this.accountId = accountId;
        logger_1.logger.info('HederaAgentKit', 'HederaAgentKit initialized successfully', {
            accountId: this.accountId,
            network: this.network,
            isCustodial: this.isCustodial
        });
    }
    isClient(x) {
        logger_1.logger.debug('HederaAgentKit', 'Checking if object is a Hedera Client', {
            hasSetOperator: typeof x.setOperator === 'function'
        });
        return typeof x.setOperator === 'function';
    }
    async createTopic(topicMemo, isSubmitKey, custodial) {
        logger_1.logger.info('HederaAgentKit', 'Creating topic', {
            topicMemo,
            isSubmitKey,
            custodialParam: custodial,
            defaultIsCustodial: this.isCustodial
        });
        const useCustodial = custodial ?? this.isCustodial;
        logger_1.logger.debug('HederaAgentKit', `Using ${useCustodial ? 'custodial' : 'non-custodial'} mode`);
        if (useCustodial) {
            if (!this.privateKey) {
                logger_1.logger.error('HederaAgentKit', 'Private key missing for custodial operation');
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.createTopicCustodial(topicMemo, isSubmitKey);
        }
        return this.createTopicNonCustodial(topicMemo, isSubmitKey);
    }
    async createTopicCustodial(topicMemo, isSubmitKey) {
        logger_1.logger.debug('HederaAgentKit', 'Creating topic (custodial mode)', {
            topicMemo,
            isSubmitKey
        });
        if (!this.privateKey) {
            logger_1.logger.error('HederaAgentKit', 'Private key missing for custodial topic creation');
            throw new Error("Custodial actions require privateKey!");
        }
        try {
            logger_1.logger.debug('HederaAgentKit', 'Building create topic transaction');
            const txBuilder = builders_1.HcsTransactionBuilder
                .createTopic(topicMemo, this.client.operatorPublicKey, isSubmitKey);
            logger_1.logger.debug('HederaAgentKit', 'Signing and executing create topic transaction');
            const response = await txBuilder.signAndExecute(this.client);
            logger_1.logger.info('HederaAgentKit', 'Topic created successfully', {
                topicId: response.topicId.toString(),
                txHash: response.txHash,
                status: response.status
            });
            return new tools_2.CustodialCreateTopicResult(response.topicId, response.txHash, response.status);
        }
        catch (error) {
            logger_1.logger.error('HederaAgentKit', 'Failed to create topic (custodial mode)', error);
            throw error;
        }
    }
    async createTopicNonCustodial(topicMemo, isSubmitKey) {
        logger_1.logger.debug('HederaAgentKit', 'Creating topic (non-custodial mode)', {
            topicMemo,
            isSubmitKey
        });
        try {
            logger_1.logger.debug('HederaAgentKit', 'Building create topic transaction');
            const txBuilder = builders_1.HcsTransactionBuilder
                .createTopic(topicMemo, this.client.operatorPublicKey, isSubmitKey);
            logger_1.logger.debug('HederaAgentKit', 'Generating transaction bytes');
            const txBytes = await txBuilder.getTxBytesString(this.client, this.accountId);
            logger_1.logger.info('HederaAgentKit', 'Topic transaction bytes generated', {
                bytesLength: txBytes.length
            });
            return new tools_2.NonCustodialCreateTopicResult(txBytes);
        }
        catch (error) {
            logger_1.logger.error('HederaAgentKit', 'Failed to create topic (non-custodial mode)', error);
            throw error;
        }
    }
    async submitTopicMessage(topicId, message, custodial) {
        logger_1.logger.info('HederaAgentKit', 'Submitting topic message', {
            topicId: topicId.toString(),
            messageLength: message.length,
            custodialParam: custodial,
            defaultIsCustodial: this.isCustodial
        });
        const useCustodial = custodial ?? this.isCustodial;
        logger_1.logger.debug('HederaAgentKit', `Using ${useCustodial ? 'custodial' : 'non-custodial'} mode`);
        if (useCustodial) {
            if (!this.privateKey) {
                logger_1.logger.error('HederaAgentKit', 'Private key missing for custodial message submission');
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.submitTopicMessageCustodial(topicId, message);
        }
        return this.submitTopicMessageNonCustodial(topicId, message);
    }
    async submitTopicMessageCustodial(topicId, message) {
        logger_1.logger.debug('HederaAgentKit', 'Submitting topic message (custodial mode)', {
            topicId: topicId.toString(),
            messageLength: message.length
        });
        if (!this.privateKey) {
            logger_1.logger.error('HederaAgentKit', 'Private key missing for custodial message submission');
            throw new Error("Custodial actions require privateKey!");
        }
        try {
            logger_1.logger.debug('HederaAgentKit', 'Building submit message transaction');
            const txBuilder = builders_1.HcsTransactionBuilder
                .submitTopicMessage(topicId, message);
            logger_1.logger.debug('HederaAgentKit', 'Signing and executing submit message transaction');
            const response = await txBuilder.signAndExecute(this.client);
            logger_1.logger.info('HederaAgentKit', 'Message submitted successfully', {
                topicId: topicId.toString(),
                txHash: response.txHash,
                status: response.status
            });
            return new tools_3.CustodialSubmitMessageResult(response.txHash, response.status, topicId.toString());
        }
        catch (error) {
            logger_1.logger.error('HederaAgentKit', 'Failed to submit topic message (custodial mode)', error);
            throw error;
        }
    }
    async submitTopicMessageNonCustodial(topicId, message) {
        const txBytes = await builders_1.HcsTransactionBuilder
            .submitTopicMessage(topicId, message)
            .getTxBytesString(this.client, this.accountId);
        return new tools_3.NonCustodialSubmitMessageResult(txBytes);
    }
    async transferHbar(toAccountId, amount, custodial) {
        const useCustodial = custodial ?? this.isCustodial;
        if (useCustodial) {
            if (!this.privateKey) {
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.transferHbarCustodial(toAccountId, amount);
        }
        return this.transferHbarNonCustodial(toAccountId, amount);
    }
    async transferHbarCustodial(toAccountId, amount) {
        if (!this.privateKey)
            throw new Error("Custodial actions require privateKey!");
        const response = await builders_3.HbarTransactionBuilder
            .transferHbar(this.client.operatorAccountId, toAccountId, amount)
            .signAndExecute(this.client);
        return new tools_4.CustodialTransferHbarResult(response.txHash, response.status);
    }
    async transferHbarNonCustodial(toAccountId, amount) {
        const txBytes = await builders_3.HbarTransactionBuilder
            .transferHbar(this.accountId, toAccountId, amount)
            .getTxBytesString(this.client, this.accountId);
        return new tools_4.NonCustodialTransferHbarResult(txBytes);
    }
    async createFT(options, custodial) {
        const useCustodial = custodial ?? this.isCustodial;
        if (useCustodial) {
            if (!this.privateKey) {
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.createFTCustodial(options);
        }
        return this.createFTNonCustodial(options);
    }
    async createFTCustodial(options) {
        if (!this.privateKey)
            throw new Error("Custodial actions require privateKey!");
        const response = await builders_2.HtsTransactionBuilder.createToken({
            ...options,
            tokenType: sdk_1.TokenType.FungibleCommon,
            client: this.client,
        }, this.client.operatorPublicKey, this.client.operatorAccountId).signAndExecute(this.client);
        return new tools_5.CustodialCreateTokenResult(response.txHash, response.status, response.tokenId);
    }
    async createFTNonCustodial(options) {
        const txBytes = await builders_2.HtsTransactionBuilder.createToken({
            ...options,
            tokenType: sdk_1.TokenType.FungibleCommon,
            client: this.client,
        }, this.publicKey, this.accountId).getTxBytesString(this.client, this.accountId);
        return new tools_5.NonCustodialCreateTokenResult(txBytes);
    }
    async createNFT(options, custodial) {
        const useCustodial = custodial ?? this.isCustodial;
        if (useCustodial) {
            if (!this.privateKey) {
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.createNFTCustodial(options);
        }
        return this.createNFTNonCustodial(options);
    }
    async createNFTCustodial(options) {
        if (!this.privateKey)
            throw new Error("Custodial actions require privateKey!");
        const response = await builders_2.HtsTransactionBuilder.createToken({
            ...options,
            decimals: 0,
            initialSupply: 0,
            isSupplyKey: true,
            tokenType: sdk_1.TokenType.NonFungibleUnique,
            client: this.client,
        }, this.client.operatorPublicKey, this.client.operatorAccountId).signAndExecute(this.client);
        return new tools_5.CustodialCreateTokenResult(response.txHash, response.status, response.tokenId);
    }
    async createNFTNonCustodial(options) {
        const txBytes = await builders_2.HtsTransactionBuilder.createToken({
            ...options,
            decimals: 0,
            initialSupply: 0,
            isSupplyKey: true,
            tokenType: sdk_1.TokenType.NonFungibleUnique,
            client: this.client,
        }, this.publicKey, this.accountId).getTxBytesString(this.client, this.accountId);
        return new tools_5.NonCustodialCreateTokenResult(txBytes);
    }
    async transferToken(tokenId, toAccountId, amount, custodial) {
        const useCustodial = custodial ?? this.isCustodial;
        if (useCustodial) {
            if (!this.privateKey) {
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.transferTokenCustodial(tokenId, toAccountId, amount);
        }
        return this.transferTokenNonCustodial(tokenId, toAccountId, amount);
    }
    async transferTokenCustodial(tokenId, toAccountId, amount) {
        const response = await builders_2.HtsTransactionBuilder.transferToken(tokenId, amount, toAccountId, this.accountId).signAndExecute(this.client);
        return new tools_6.CustodialTransferTokenResult(response.txHash, response.status);
    }
    async transferTokenNonCustodial(tokenId, toAccountId, amount) {
        const txBytes = await builders_2.HtsTransactionBuilder.transferToken(tokenId, amount, toAccountId, this.accountId).getTxBytesString(this.client, this.accountId);
        return new tools_6.NonCustodialTransferTokenResult(txBytes);
    }
    async getHbarBalance(accountId) {
        const targetAccountId = accountId || this.client.operatorAccountId;
        return (0, tools_1.get_hbar_balance)(this.client, targetAccountId);
    }
    async getHtsBalance(tokenId, networkType, accountId) {
        const targetAccountId = accountId || this.client.operatorAccountId;
        return (0, tools_1.get_hts_balance)(tokenId, networkType, targetAccountId);
    }
    async getAllTokensBalances(networkType, accountId) {
        const targetAccountId = accountId || this.client.operatorAccountId;
        return (0, tools_1.get_all_tokens_balances)(networkType, targetAccountId);
    }
    async getHtsTokenDetails(tokenId, networkType) {
        return (0, tools_1.get_hts_token_details)(tokenId, networkType);
    }
    async getTokenHolders(tokenId, networkType, threshold) {
        return (0, tools_1.get_token_holders)(tokenId.toString(), networkType, threshold);
    }
    async associateToken(tokenId, custodial) {
        const useCustodial = custodial ?? this.isCustodial;
        if (useCustodial) {
            if (!this.privateKey) {
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.associateTokenCustodial(tokenId);
        }
        return this.associateTokenNonCustodial(tokenId);
    }
    async associateTokenCustodial(tokenId) {
        const response = await builders_2.HtsTransactionBuilder.associateToken(tokenId, this.accountId).signAndExecute(this.client);
        return new tools_7.CustodialAssociateTokenResult(response.txHash, response.status);
    }
    async associateTokenNonCustodial(tokenId) {
        const txBytes = await builders_2.HtsTransactionBuilder.associateToken(tokenId, this.accountId).getTxBytesString(this.client, this.accountId);
        return new tools_7.NonCustodialAssociateTokenResult(txBytes);
    }
    async dissociateToken(tokenId, custodial) {
        const useCustodial = custodial ?? this.isCustodial;
        if (useCustodial) {
            if (!this.privateKey) {
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.dissociateTokenCustodial(tokenId);
        }
        return this.dissociateTokenNonCustodial(tokenId);
    }
    async dissociateTokenCustodial(tokenId) {
        const response = await builders_2.HtsTransactionBuilder.dissociateToken(tokenId, this.accountId).signAndExecute(this.client);
        return new tools_1.CustodialDissociateTokenResult(response.txHash, response.status);
    }
    async dissociateTokenNonCustodial(tokenId) {
        const txBytes = await builders_2.HtsTransactionBuilder.dissociateToken(tokenId, this.accountId).getTxBytesString(this.client, this.accountId);
        return new tools_1.NonCustodialDissociateTokenResult(txBytes);
    }
    async airdropToken(tokenId, recipients, custodial) {
        const useCustodial = custodial ?? this.isCustodial;
        if (useCustodial) {
            if (!this.privateKey) {
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.airdropTokenCustodial(tokenId, recipients);
        }
        return this.airdropTokenNonCustodial(tokenId, recipients);
    }
    async airdropTokenCustodial(tokenId, recipients) {
        const response = await builders_2.HtsTransactionBuilder.airdropToken(tokenId, recipients, this.accountId).signAndExecute(this.client);
        return new tools_8.CustodialAirdropTokenResult(response.txHash, response.status);
    }
    async airdropTokenNonCustodial(tokenId, recipients) {
        const txBytes = await builders_2.HtsTransactionBuilder.airdropToken(tokenId, recipients, this.accountId).getTxBytesString(this.client, this.accountId);
        return new tools_8.NonCustodialAirdropTokenResult(txBytes);
    }
    async rejectToken(tokenId, custodial) {
        const useCustodial = custodial ?? this.isCustodial;
        if (useCustodial) {
            if (!this.privateKey) {
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.rejectTokenCustodial(tokenId);
        }
        return this.rejectTokenNonCustodial(tokenId);
    }
    async rejectTokenCustodial(tokenId) {
        const response = await builders_2.HtsTransactionBuilder.rejectToken(tokenId, sdk_1.AccountId.fromString(this.accountId)).signAndExecute(this.client);
        return new tools_9.CustodialRejectTokenResult(response.txHash, response.status);
    }
    async rejectTokenNonCustodial(tokenId) {
        const txBytes = await builders_2.HtsTransactionBuilder.rejectToken(tokenId, sdk_1.AccountId.fromString(this.accountId)).getTxBytesString(this.client, this.accountId);
        return new tools_9.NonCustodialRejectTokenResult(txBytes);
    }
    async mintToken(tokenId, amount, custodial) {
        const useCustodial = custodial ?? this.isCustodial;
        if (useCustodial) {
            if (!this.privateKey) {
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.mintTokenCustodial(tokenId, amount);
        }
        return this.mintTokenNonCustodial(tokenId, amount);
    }
    async mintTokenCustodial(tokenId, amount) {
        const response = await builders_2.HtsTransactionBuilder.mintToken(tokenId, amount).signAndExecute(this.client);
        return new tools_10.CustodialMintTokenResult(response.txHash, response.status);
    }
    async mintTokenNonCustodial(tokenId, amount) {
        const txBytes = await builders_2.HtsTransactionBuilder.mintToken(tokenId, amount).getTxBytesString(this.client, this.accountId);
        return new tools_10.NonCustodialMintTokenResult(txBytes);
    }
    async mintNFTToken(tokenId, tokenMetadata, custodial) {
        const useCustodial = custodial ?? this.isCustodial;
        if (useCustodial) {
            if (!this.privateKey) {
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.mintNFTTokenCustodial(tokenId, tokenMetadata);
        }
        return this.mintNFTTokenNonCustodial(tokenId, tokenMetadata);
    }
    async mintNFTTokenCustodial(tokenId, tokenMetadata) {
        const response = await builders_2.HtsTransactionBuilder.mintNft(tokenId, tokenMetadata).signAndExecute(this.client);
        return new tools_11.CustodialMintNFTResult(response.txHash, response.status);
    }
    async mintNFTTokenNonCustodial(tokenId, tokenMetadata) {
        const txBytes = await builders_2.HtsTransactionBuilder.mintNft(tokenId, tokenMetadata).getTxBytesString(this.client, this.accountId);
        return new tools_11.NonCustodialMintNFTResult(txBytes);
    }
    async claimAirdrop(airdropId, custodial) {
        const useCustodial = custodial ?? this.isCustodial;
        if (useCustodial) {
            if (!this.privateKey) {
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.claimAirdropCustodial(airdropId);
        }
        return this.claimAirdropNonCustodial(airdropId);
    }
    async claimAirdropCustodial(airdropId) {
        const response = await builders_2.HtsTransactionBuilder.claimAirdrop(airdropId).signAndExecute(this.client);
        return new tools_12.CustodialClaimAirdropResult(response.txHash, response.status);
    }
    async claimAirdropNonCustodial(airdropId) {
        const txBytes = await builders_2.HtsTransactionBuilder.claimAirdrop(airdropId).getTxBytesString(this.client, this.accountId);
        return new tools_12.NonCustodialClaimAirdropResult(txBytes);
    }
    async getPendingAirdrops(accountId, networkType) {
        return (0, tools_1.get_pending_airdrops)(networkType, accountId);
    }
    async deleteTopic(topicId, custodial) {
        const useCustodial = custodial ?? this.isCustodial;
        if (useCustodial) {
            if (!this.privateKey) {
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.deleteTopicCustodial(topicId);
        }
        return this.deleteTopicNonCustodial(topicId);
    }
    async deleteTopicCustodial(topicId) {
        const response = await builders_1.HcsTransactionBuilder.deleteTopic(topicId).signAndExecute(this.client);
        return new tools_13.CustodialDeleteTopicResult(response.txHash, response.status);
    }
    async deleteTopicNonCustodial(topicId) {
        const txBytes = await builders_1.HcsTransactionBuilder.deleteTopic(topicId).getTxBytesString(this.client, this.accountId);
        return new tools_13.NonCustodialDeleteTopicResult(txBytes);
    }
    async getTopicInfo(topicId, networkType) {
        return (0, tools_1.get_topic_info)(topicId, networkType);
    }
    async getTopicMessages(topicId, networkType, lowerTimestamp, upperTimestamp) {
        return (0, tools_1.get_topic_messages)(topicId, networkType, lowerTimestamp, upperTimestamp);
    }
    async approveAssetAllowance(spenderAccount, amount, tokenId, custodial) {
        const useCustodial = custodial ?? this.isCustodial;
        if (useCustodial) {
            if (!this.privateKey) {
                throw new Error("Private key is missing. To perform custodial action you should pass private key!");
            }
            return this.approveAssetAllowanceCustodial(spenderAccount, amount, tokenId);
        }
        return this.approveAssetAllowanceNonCustodial(spenderAccount, amount, tokenId);
    }
    async approveAssetAllowanceCustodial(spenderAccount, amount, tokenId) {
        const response = await builders_4.AccountTransactionBuilder.approveAssetAllowance(spenderAccount, amount, this.accountId, tokenId).signAndExecute(this.client);
        return new tools_14.CustodialAssetAllowanceResult(response.txHash, response.status);
    }
    async approveAssetAllowanceNonCustodial(spenderAccount, amount, tokenId) {
        const txBytes = await builders_4.AccountTransactionBuilder.approveAssetAllowance(spenderAccount, amount, this.accountId, tokenId).getTxBytesString(this.client, this.accountId);
        return new tools_14.NonCustodialAssetAllowanceResult(txBytes);
    }
}
exports.HederaAgentKit = HederaAgentKit;
exports.default = HederaAgentKit;
