// Import our custom HCS10Client implementation
import { HCS10Client, HCS11Client } from '@hashgraphonline/standards-sdk';
import { Logger } from '@hashgraphonline/standards-sdk';
import { logger } from '../utils/logger';
import { PrivateKey } from '@hashgraph/sdk';

// Singleton instance of HCS10Client
let hederaClient: HCS10Client | null = null;

/**
 * Get or initialize the Hedera client
 */
export const getHederaClient = async (profileTopicId?: string): Promise<HCS10Client> => {
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

    // Create HCS10Client using the standards-sdk
    hederaClient = new HCS10Client({
      network: (process.env.HEDERA_NETWORK || 'testnet') as any,
      operatorId: process.env.HEDERA_ACCOUNT_ID,
      operatorPrivateKey: process.env.HEDERA_PRIVATE_KEY,
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      prettyPrint: true,
      guardedRegistryBaseUrl: process.env.REGISTRY_URL,
      feeAmount: process.env.DEFAULT_FEE_AMOUNT ? parseFloat(process.env.DEFAULT_FEE_AMOUNT) : 0.5,
    });

    // If profile topic ID is provided, update the account memo
    if (profileTopicId) {
      try {
        const hcs11Client = new HCS11Client({
          network: (process.env.HEDERA_NETWORK || 'testnet') as any,
          auth: {
            operatorId: process.env.HEDERA_ACCOUNT_ID,
            privateKey: process.env.HEDERA_PRIVATE_KEY,
          },
          logLevel: 'info',
        });

        await hcs11Client.updateAccountMemoWithProfile(
          process.env.HEDERA_ACCOUNT_ID,
          profileTopicId
        );
        logger.info('HEDERA', `Set profile topic ID ${profileTopicId} in account memo`);
      } catch (memoError) {
        logger.error('HEDERA', `Failed to set profile topic ID in account memo: ${memoError}`, memoError);
      }
    }

    logger.info('HEDERA', `Initialized Hedera client for account ${process.env.HEDERA_ACCOUNT_ID} on ${process.env.HEDERA_NETWORK}`);
    return hederaClient;
  } catch (error) {
    logger.error('HEDERA', `Failed to initialize Hedera client: ${error}`, error);
    throw error;
  }
};

/**
 * Create a client with custom credentials
 */
export const createCustomClient = async (
  accountId: string,
  privateKey: string,
  profileTopicId?: string
): Promise<HCS10Client> => {
  try {
    // Create HCS10Client with custom credentials using standards-sdk
    const client = new HCS10Client({
      network: (process.env.HEDERA_NETWORK || 'testnet') as any,
      operatorId: accountId,
      operatorPrivateKey: PrivateKey.fromStringECDSA(privateKey).toString(),
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      prettyPrint: true,
      guardedRegistryBaseUrl: process.env.REGISTRY_URL,
    });

    // If profile topic ID is provided, update the account memo
    if (profileTopicId) {
      try {
        const hcs11Client = new HCS11Client({
          network: (process.env.HEDERA_NETWORK || 'testnet') as any,
          auth: {
            operatorId: accountId,
            privateKey: privateKey,
          },
          logLevel: 'info',
        });

        await hcs11Client.updateAccountMemoWithProfile(accountId, profileTopicId);
        logger.info('HEDERA', `Set profile topic ID ${profileTopicId} in account memo for ${accountId}`);
      } catch (memoError) {
        logger.error('HEDERA', `Failed to set profile topic ID in account memo: ${memoError}`, memoError);
      }
    }

    logger.info('HEDERA', `Created custom Hedera client for account ${accountId}`);
    return client;
  } catch (error) {
    logger.error('HEDERA', `Failed to create custom Hedera client: ${error}`, error);
    throw error;
  }
};

/**
 * Get the default fee amount for transactions
 * @returns The default fee amount as a number
 */
export const getDefaultFeeAmount = (): number => {
  const defaultValue = 0.01; // Default to 0.01 HBAR per message
  return process.env.DEFAULT_FEE_AMOUNT ? parseFloat(process.env.DEFAULT_FEE_AMOUNT) : defaultValue;
}; 