"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultFeeAmount = exports.createCustomClient = exports.getHederaClient = void 0;
// @ts-ignore
const standards_sdk_1 = require("@hashgraphonline/standards-sdk");
const logger_1 = require("../utils/logger");
// Initialize logger
const logger = logger_1.Logger.getInstance({
    level: process.env.LOG_LEVEL || 'info',
    module: 'hedera',
});
// Singleton instance of HCS10Client
let hederaClient = null;
/**
 * Get or initialize the Hedera client
 */
const getHederaClient = async () => {
    if (hederaClient) {
        return hederaClient;
    }
    try {
        // Validate environment variables
        if (!process.env.HEDERA_ACCOUNT_ID) {
            throw new Error('HEDERA_ACCOUNT_ID environment variable is not set');
        }
        if (!process.env.HEDERA_PRIVATE_KEY) {
            throw new Error('HEDERA_PRIVATE_KEY environment variable is not set');
        }
        if (!process.env.HEDERA_NETWORK) {
            throw new Error('HEDERA_NETWORK environment variable is not set');
        }
        // Create HCS10Client
        hederaClient = new standards_sdk_1.HCS10Client({
            network: process.env.HEDERA_NETWORK,
            operatorId: process.env.HEDERA_ACCOUNT_ID,
            operatorPrivateKey: process.env.HEDERA_PRIVATE_KEY,
            logLevel: process.env.LOG_LEVEL || 'info',
            prettyPrint: true,
            feeAmount: process.env.DEFAULT_FEE_AMOUNT ? parseFloat(process.env.DEFAULT_FEE_AMOUNT) : 0.5,
        });
        logger.info(`Initialized Hedera client for account ${process.env.HEDERA_ACCOUNT_ID} on ${process.env.HEDERA_NETWORK}`);
        return hederaClient;
    }
    catch (error) {
        logger.error(`Failed to initialize Hedera client: ${error}`);
        throw error;
    }
};
exports.getHederaClient = getHederaClient;
/**
 * Create a client with custom credentials
 */
const createCustomClient = async (accountId, privateKey) => {
    try {
        // Create HCS10Client with custom credentials
        const client = new standards_sdk_1.HCS10Client({
            network: process.env.HEDERA_NETWORK || 'testnet',
            operatorId: accountId,
            operatorPrivateKey: privateKey,
            logLevel: process.env.LOG_LEVEL || 'info',
            prettyPrint: true,
        });
        logger.info(`Created custom Hedera client for account ${accountId}`);
        return client;
    }
    catch (error) {
        logger.error(`Failed to create custom Hedera client: ${error}`);
        throw error;
    }
};
exports.createCustomClient = createCustomClient;
/**
 * Get the default fee amount for transactions
 */
const getDefaultFeeAmount = () => {
    return process.env.DEFAULT_FEE_AMOUNT ? parseFloat(process.env.DEFAULT_FEE_AMOUNT) : 0.5;
};
exports.getDefaultFeeAmount = getDefaultFeeAmount;
