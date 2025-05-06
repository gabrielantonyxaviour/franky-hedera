import { Hbar, PrivateKey, AccountId, TokenId } from '@hashgraph/sdk';
import { logger } from './logger';
import { 
  FeeConfigBuilder, 
  InboundTopicType 
} from '@hashgraphonline/standards-sdk';

// Export the FeeConfigBuilder directly from standards-sdk
export { 
  FeeConfigBuilder,
  InboundTopicType
};

// If the module doesn't export FeeConfig directly, define it here based on the SDK's structure
export interface FeeConfig {
  feeAmount: number;
  feeCollector: string;
  exemptAccounts?: string[];
  network?: string;
  useHip991?: boolean;
  feeToken?: string;
}

// Default fee amount in Hbar for connection messages
const DEFAULT_FEE_AMOUNT = 0.01; // 0.01 HBAR per message

/**
 * Get the default fee amount for transactions
 * @returns The default fee amount in HBAR as a number
 */
export const getDefaultFeeAmount = (): number => {
  const defaultValue = 0.01; // Default to 0.01 HBAR per message
  return process.env.DEFAULT_FEE_AMOUNT ? parseFloat(process.env.DEFAULT_FEE_AMOUNT) : defaultValue;
};

/**
 * Convert a string fee amount to Hbar
 * @param feeAmountStr The fee amount as a string
 * @returns The fee amount as Hbar
 */
export const convertFeeToHbar = (feeAmountStr: string): Hbar => {
  try {
    const feeAmount = parseFloat(feeAmountStr);
    return new Hbar(feeAmount);
  } catch (error) {
    logger.error('FEE', `Error converting fee amount to Hbar: ${error}`);
    // Default to the standard fee if conversion fails
    return new Hbar(DEFAULT_FEE_AMOUNT);
  }
};

/**
 * Validate that a fee amount string is valid
 * @param feeAmountStr The fee amount as a string
 * @returns Whether the fee amount is valid
 */
export const isValidFeeAmount = (feeAmountStr: string): boolean => {
  try {
    const feeAmount = parseFloat(feeAmountStr);
    return !isNaN(feeAmount) && feeAmount >= 0;
  } catch (error) {
    return false;
  }
}; 