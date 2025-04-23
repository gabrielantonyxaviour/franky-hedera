import { AccountId, Client, TransactionId } from "@hashgraph/sdk";
import { TransactionStrategy } from "../strategies";
import { logger } from "../../../utils/logger";

export class BaseTransactionBuilder<T> {
    constructor(private strategy: TransactionStrategy<T>) {
        logger.debug('BaseTransactionBuilder', 'Created transaction builder', {
            strategyType: strategy.constructor.name
        });
    }

    async signAndExecute(client: Client): Promise<T> {
        try {
            logger.debug('BaseTransactionBuilder', 'Building transaction');
            const tx = this.strategy.build();
            
            logger.debug('BaseTransactionBuilder', 'Transaction built', {
                txType: tx.constructor.name,
                hasNodeAccounts: !!tx._nodeAccountIds
            });
            
            logger.info('BaseTransactionBuilder', 'Executing transaction', {
                operatorAccount: client.operatorAccountId?.toString() || 'none',
                hasOperatorKey: !!client.operatorPublicKey
            });
            
            const startExecute = Date.now();
            const txResponse = await tx.execute(client);
            const executeTime = Date.now() - startExecute;
            
            logger.debug('BaseTransactionBuilder', 'Transaction executed', {
                transactionId: txResponse.transactionId?.toString(),
                executeTimeMs: executeTime
            });
            
            logger.debug('BaseTransactionBuilder', 'Getting receipt');
            const startReceipt = Date.now();
            const receipt = await txResponse.getReceipt(client);
            const receiptTime = Date.now() - startReceipt;
            
            const status = receipt.status.toString();
            logger.info('BaseTransactionBuilder', 'Transaction receipt received', {
                status,
                receiptTimeMs: receiptTime,
                totalTimeMs: executeTime + receiptTime
            });

            if (!status.includes('SUCCESS')) {
                logger.error('BaseTransactionBuilder', 'Transaction failed', {
                    status,
                    transactionId: txResponse.transactionId?.toString()
                });
                throw new Error(`Transaction failed with status: ${status}`);
            }
            
            logger.debug('BaseTransactionBuilder', 'Formatting transaction result');
            const result = this.strategy.formatResult(txResponse, receipt);
            
            logger.debug('BaseTransactionBuilder', 'Transaction result formatted', {
                resultType: result?.constructor.name || typeof result
            });
            
            return result;
        } catch (error: any) {
            logger.error('BaseTransactionBuilder', 'Transaction execution failed', {
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

    async getTxBytesString(client: Client, fromAccountId: AccountId | string): Promise<string> {
        try {
            logger.debug('BaseTransactionBuilder', 'Building transaction for bytes generation');
            const tx = this.strategy.build();
            
            if (fromAccountId) {
                logger.debug('BaseTransactionBuilder', 'Setting transaction ID', {
                    fromAccountId: fromAccountId.toString()
                });
                const txId = TransactionId.generate(fromAccountId);
                tx.setTransactionId(txId);
            }
            
            logger.debug('BaseTransactionBuilder', 'Freezing transaction with client');
            const frozenTx = tx.freezeWith(client);
            
            logger.debug('BaseTransactionBuilder', 'Converting transaction to bytes');
            const frozenTxBytes = frozenTx.toBytes();
            
            const base64String = Buffer.from(
                frozenTxBytes.buffer, 
                frozenTxBytes.byteOffset, 
                frozenTxBytes.byteLength
            ).toString("base64");
            
            logger.info('BaseTransactionBuilder', 'Transaction bytes generated', {
                bytesLength: base64String.length,
                fromAccountId: fromAccountId.toString()
            });
            
            return base64String;
        } catch (error: any) {
            logger.error('BaseTransactionBuilder', 'Failed to generate transaction bytes', {
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