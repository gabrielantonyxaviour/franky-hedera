import axios from 'axios';

// Network ID mapping (same as in gas-price-tool.js)
const NETWORK_IDS = {
  "ethereum": "1",
  "eth": "1",
  "mainnet": "1",
  "binance": "56",
  "bsc": "56",
  "polygon": "137",
  "matic": "137",
  "avalanche": "43114",
  "avax": "43114",
  "arbitrum": "42161",
  "optimism": "10",
  "base": "8453",
  "fantom": "250",
  "ftm": "250",
  "aurora": "1313161554"
};

// API key for 1inch
const INCH_API_KEY = "dW9QkztjMUhg3wZU0rFbPBRxZ7DF06PB";

/**
 * Fetches transaction history for a specific address on a blockchain network
 * @param {string} address - The blockchain address to check
 * @param {string} network - The blockchain network name
 * @returns {Promise<Object>} Transaction history data or error
 */
export async function getTransactionHistory(address, network) {
  // Get the chain ID from the network name
  const networkLower = network.toLowerCase();
  const chainId = NETWORK_IDS[networkLower];
  
  if (!chainId) {
    return { 
      error: `Unsupported network: ${network}. Supported networks are: ${Object.keys(NETWORK_IDS).join(', ')}` 
    };
  }
  
  // Validate the address format (basic check)
  if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return {
      error: `Invalid Ethereum address format: ${address}. Address should be a 42-character hexadecimal string starting with 0x.`
    };
  }
  
  const url = `https://api.1inch.dev/history/v2.0/history/${address}/events`;
  
  const config = {
    headers: {
      "Authorization": `Bearer ${INCH_API_KEY}`
    },
    params: {
      "chainId": chainId
    }
  };
  
  try {
    console.log(`🔍 Fetching transaction history from 1inch API for address: ${address} on network: ${network} (chainId: ${chainId})`);
    const response = await axios.get(url, config);
    
    // Log the raw response data
    console.log(`✅ Raw 1inch API transaction history response for ${address} on ${network}:`, JSON.stringify(response.data, null, 2));
    
    return { 
      success: true, 
      data: response.data,
      address: address,
      network: network,
      chainId: chainId
    };
  } catch (error) {
    console.error(`❌ Error fetching transaction history for ${address} on ${network}:`, error.message);
    
    // Log more detailed error information if available
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
    }
    
    return { 
      error: `Failed to fetch transaction history for ${address} on ${network}: ${error.message}` 
    };
  }
}

/**
 * Prepares transaction history data for the model
 * @param {string} address - The blockchain address
 * @param {string} network - The blockchain network
 * @param {Object} historyResult - The raw API response
 * @returns {Object} Formatted transaction history data
 */
export function prepareTransactionHistoryData(address, network, historyResult) {
  if (historyResult.error) {
    return {
      error: historyResult.error,
      address: address,
      network: network
    };
  }
  
  // Format the transaction history data in a clean, structured way for the model to use
  const historyData = historyResult.data;
  
  // Check if there are any transactions
  if (!historyData.items || historyData.items.length === 0) {
    return {
      address: address,
      network: network,
      message: "No transactions found for this address on this network."
    };
  }
  
  // Format the transactions (limit to 5 most recent to avoid overwhelming the model)
  const transactions = historyData.items.slice(0, 5).map(item => {
    const details = item.details;
    const tokenActions = details.tokenActions && details.tokenActions.length > 0 ? details.tokenActions[0] : null;
    
    // Convert timestamp to readable date
    const date = new Date(item.timeMs);
    const formattedDate = date.toISOString().split('T')[0];
    const formattedTime = date.toISOString().split('T')[1].split('.')[0];
    
    // Format the transaction
    return {
      date: formattedDate,
      time: formattedTime,
      type: details.type || "Unknown",
      status: details.status || "Unknown",
      from: details.fromAddress,
      to: details.toAddress,
      txHash: details.txHash,
      // Include token information if available
      token: tokenActions ? {
        type: tokenActions.standard,
        amount: tokenActions.amount,
        direction: tokenActions.direction
      } : null
    };
  });
  
  return {
    address: address,
    network: network,
    transactionCount: historyData.items.length,
    recentTransactions: transactions
  };
}

// Export the tool definition for use in the API
export const transactionHistoryTool = {
  type: "function",
  function: {
    name: "GetTransactionHistory",
    description: "Fetches the transaction history for a specific address on a blockchain network. Use when the user asks about transaction history, wallet activity, or past transfers for a blockchain address.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "The blockchain address to check (e.g., 0x1234...)"
        },
        network: {
          type: "string",
          description: "The blockchain network to check (e.g., ethereum, polygon, avalanche, binance, arbitrum, optimism, base, fantom, aurora)"
        }
      },
      required: ["address", "network"]
    }
  }
};

// Export regex patterns for detecting transaction history queries
export const transactionHistoryQueryPatterns = {
  // Make these patterns more specific and prioritize them over gas price patterns
  primary: /(?:transaction|tx|transfer|wallet)(?:\s+history|\s+list|\s+record|\s+activity).*?(?:for|of|by|from)\s+([0-9a-fA-Fx]{42})(?:.*?(?:on|in)\s+([a-zA-Z]+))?/i,
  alternative: /(?:what(?:'s| is) the|check|get|show|find).*?(?:transaction|tx|transfer|wallet).*?(?:for|of|by|from)\s+([0-9a-fA-Fx]{42})(?:.*?(?:on|in)\s+([a-zA-Z]+))?/i,
  intentInResponse: /(?:transaction|tx|transfer|wallet) (?:history|list|record|activity).*?(?:for|of|by|from) ([0-9a-fA-Fx]{42})(?:.*?(?:on|in) ([a-zA-Z]+))?/i,
  // Add a pattern to specifically match Ethereum addresses
  addressPattern: /\b(0x[a-fA-F0-9]{40})\b/i
}; 