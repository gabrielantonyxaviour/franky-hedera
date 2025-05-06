"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTransactionBuilder = void 0;
const sdk_1 = require("@hashgraph/sdk");
const logger_1 = require("../../../utils/logger");
class BaseTransactionBuilder {
    constructor(strategy) {
        this.strategy = strategy;
        logger_1.logger.debug('BaseTransactionBuilder', 'Created transaction builder', {
            strategyType: strategy.constructor.name
        });
    }
    async signAndExecute(client) {
        try {
            logger_1.logger.debug('BaseTransactionBuilder', 'Building transaction');
            const tx = this.strategy.build();
            logger_1.logger.debug('BaseTransactionBuilder', 'Transaction built', {
                txType: tx.constructor.name,
                hasNodeAccounts: !!tx._nodeAccountIds
            });
            logger_1.logger.info('BaseTransactionBuilder', 'Executing transaction', {
                operatorAccount: client.operatorAccountId?.toString() || 'none',
                hasOperatorKey: !!client.operatorPublicKey
            });
            const startExecute = Date.now();
            const txResponse = await tx.execute(client);
            const executeTime = Date.now() - startExecute;
            logger_1.logger.debug('BaseTransactionBuilder', 'Transaction executed', {
                transactionId: txResponse.transactionId?.toString(),
                executeTimeMs: executeTime
            });
            logger_1.logger.debug('BaseTransactionBuilder', 'Getting receipt');
            const startReceipt = Date.now();
            const receipt = await txResponse.getReceipt(client);
            const receiptTime = Date.now() - startReceipt;
            const status = receipt.status.toString();
            logger_1.logger.info('BaseTransactionBuilder', 'Transaction receipt received', {
                status,
                receiptTimeMs: receiptTime,
                totalTimeMs: executeTime + receiptTime
            });
            if (!status.includes('SUCCESS')) {
                logger_1.logger.error('BaseTransactionBuilder', 'Transaction failed', {
                    status,
                    transactionId: txResponse.transactionId?.toString()
                });
                throw new Error(`Transaction failed with status: ${status}`);
            }
            logger_1.logger.debug('BaseTransactionBuilder', 'Formatting transaction result');
            const result = this.strategy.formatResult(txResponse, receipt);
            logger_1.logger.debug('BaseTransactionBuilder', 'Transaction result formatted', {
                resultType: result?.constructor.name || typeof result
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('BaseTransactionBuilder', 'Transaction execution failed', {
                error: {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                },
                strategyType: this.strategy.constructor.name
            });
            throw new Error(`Transaction failed: ${error}`);
        }
    }
    async getTxBytesString(client, fromAccountId) {
        try {
            logger_1.logger.debug('BaseTransactionBuilder', 'Building transaction for bytes generation');
            const tx = this.strategy.build();
            if (fromAccountId) {
                logger_1.logger.debug('BaseTransactionBuilder', 'Setting transaction ID', {
                    fromAccountId: fromAccountId.toString()
                });
                const txId = sdk_1.TransactionId.generate(fromAccountId);
                tx.setTransactionId(txId);
            }
            logger_1.logger.debug('BaseTransactionBuilder', 'Freezing transaction with client');
            const frozenTx = tx.freezeWith(client);
            logger_1.logger.debug('BaseTransactionBuilder', 'Converting transaction to bytes');
            const frozenTxBytes = frozenTx.toBytes();
            const base64String = Buffer.from(frozenTxBytes.buffer, frozenTxBytes.byteOffset, frozenTxBytes.byteLength).toString("base64");
            logger_1.logger.info('BaseTransactionBuilder', 'Transaction bytes generated', {
                bytesLength: base64String.length,
                fromAccountId: fromAccountId.toString()
            });
            return base64String;
        }
        catch (error) {
            logger_1.logger.error('BaseTransactionBuilder', 'Failed to generate transaction bytes', {
                error: {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                },
                fromAccountId: fromAccountId.toString(),
                strategyType: this.strategy.constructor.name
            });
            throw error;
        }
    }
}
exports.BaseTransactionBuilder = BaseTransactionBuilder;
