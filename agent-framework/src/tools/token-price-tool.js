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
  "aurora": "1313161554",
  "klaytn": "8217"
};

// Currency mapping for common currencies
const CURRENCIES = {
  "usd": "USD",
  "eur": "EUR",
  "gbp": "GBP",
  "jpy": "JPY",
  "cny": "CNY",
  "inr": "INR",
  "krw": "KRW",
  "rub": "RUB",
  "cad": "CAD",
  "aud": "AUD"
};

// API key for 1inch
const INCH_API_KEY = "dW9QkztjMUhg3wZU0rFbPBRxZ7DF06PB";

/**
 * Fetches prices of all whitelisted tokens on a specific network
 * @param {string|number} network - The blockchain network name or chainId
 * @param {string} currency - The currency to display prices in (optional, defaults to USD)
 * @returns {Promise<Object>} Token price data or error
 */
export async function getTokenPrices(network = 'ethereum', currency = 'USD') {
  let chainId;
  
  // Handle the case where network is passed as a number (chainId)
  if (typeof network === 'number' || !isNaN(parseInt(network))) {
    // Convert to string for lookup in reverse mapping
    chainId = network.toString();
    
    // Create a reverse mapping of chainId to network name
    const reverseNetworkMap = {};
    for (const [name, id] of Object.entries(NETWORK_IDS)) {
      reverseNetworkMap[id] = name;
    }
    
    // Try to get the network name from the chainId
    network = reverseNetworkMap[chainId] || `Chain ${chainId}`;
  } else {
    // Get the chain ID from the network name
    const networkLower = network.toLowerCase();
    chainId = NETWORK_IDS[networkLower];
    
    if (!chainId) {
      return { 
        error: `Unsupported network: ${network}. Supported networks are: ${Object.keys(NETWORK_IDS).join(', ')}` 
      };
    }
  }
  
  // Handle the case where currency is passed as fromCurrency
  if (typeof currency !== 'string' && arguments[1] && arguments[1].fromCurrency) {
    currency = arguments[1].fromCurrency;
  }
  
  // Normalize the currency
  const currencyUpper = currency.toUpperCase();
  const validCurrency = CURRENCIES[currency.toLowerCase()] || currencyUpper;
  
  // Construct the URL exactly as in the code snippet
  const url = `https://api.1inch.dev/price/v1.1/${chainId}`;
  
  // Create the config object exactly as in the code snippet
  const config = {
    headers: {
      "Authorization": `Bearer ${INCH_API_KEY}`
    },
    params: {
      "currency": validCurrency
    },
    paramsSerializer: {
      indexes: null
    }
  };
  
  try {
    console.log(`🔍 Fetching token prices from 1inch API for network: ${network} (chainId: ${chainId}) in ${validCurrency}`);
    console.log(`🔧 Request config:`, JSON.stringify(config, null, 2));
    
    // Make the API call exactly as in the code snippet
    const response = await axios.get(url, config);
    
    // Log the raw response data (truncated for readability)
    const tokenCount = Object.keys(response.data).length;
    console.log(`✅ Raw 1inch API token price response for ${network} in ${validCurrency}: ${tokenCount} tokens received`);
    
    return { 
      success: true, 
      data: response.data,
      network: network,
      chainId: chainId,
      currency: validCurrency
    };
  } catch (error) {
    console.error(`❌ Error fetching token prices for ${network} in ${validCurrency}:`, error.message);
    
    // Log more detailed error information if available
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
    }
    
    return { 
      error: `Failed to fetch token prices for ${network} in ${validCurrency}: ${error.message}` 
    };
  }
}

/**
 * Prepares token price data in a clean format for the model
 * @param {string} network - The blockchain network
 * @param {string} currency - The currency used
 * @param {Object} result - The raw API result
 * @returns {Object} Formatted token price data
 */
export function prepareTokenPriceData(network, currency, result) {
  // Handle error case
  if (result.error) {
    return { error: result.error };
  }
  
  // Check if there's valid data
  if (!result.data || typeof result.data !== 'object' || Object.keys(result.data).length === 0) {
    return {
      network: network,
      currency: currency,
      message: "No token price data found or invalid response format."
    };
  }
  
  // Common token addresses and their symbols for better readability
  const commonTokens = {
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH",
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "WBTC",
    "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
    "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
    "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": "UNI",
    "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0": "MATIC",
    "0x4fabb145d64652a948d72533023f6e7a623c7c53": "BUSD",
    "0x514910771af9ca656af840dff83e8264ecf986ca": "LINK",
    "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce": "SHIB",
    "0xb8c77482e45f1f44de1745f52c74426c631bdd52": "BNB"
  };
  
  // Format the token prices (limit to 20 to avoid overwhelming the model)
  const tokenAddresses = Object.keys(result.data);
  const tokenPrices = tokenAddresses.slice(0, 20).map(address => {
    const price = parseFloat(result.data[address]);
    return {
      address: address,
      symbol: commonTokens[address.toLowerCase()] || "Unknown",
      price: price.toLocaleString('en-US', { 
        style: 'currency', 
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      })
    };
  });
  
  return {
    network: network,
    currency: currency,
    tokenCount: tokenAddresses.length,
    tokens: tokenPrices
  };
}

// Export the tool definition for use in the API
export const tokenPriceTool = {
  type: "function",
  function: {
    name: "GetTokenPrices",
    description: "Fetches the prices of all whitelisted tokens on a specific blockchain network in the currency of choice. Use when the user asks about token prices, cryptocurrency prices, or market rates.",
    parameters: {
      type: "object",
      properties: {
        network: {
          type: "string",
          description: "The blockchain network to check (e.g., ethereum, polygon, avalanche, binance, arbitrum, optimism, base, fantom, aurora, klaytn)",
          default: "ethereum"
        },
        currency: {
          type: "string",
          description: "The currency to display prices in (e.g., USD, EUR, GBP, JPY, CNY, INR)",
          default: "USD"
        }
      },
      required: ["network"]
    }
  }
};

// Export regex patterns for detecting token price queries
export const tokenPriceQueryPatterns = {
  primary: /(?:token|crypto|cryptocurrency)(?:\s+prices?|\s+rates?|\s+values?).*?(?:on|in|for)\s+([a-zA-Z]+)(?:.*?(?:in|using|with)\s+([a-zA-Z]{3,}))?/i,
  alternative: /(?:what(?:'s| is| are) the|check|get|show|find).*?(?:token|crypto|cryptocurrency)(?:\s+prices?|\s+rates?|\s+values?).*?(?:on|in|for)\s+([a-zA-Z]+)(?:.*?(?:in|using|with)\s+([a-zA-Z]{3,}))?/i,
  intentInResponse: /(?:token|crypto|cryptocurrency) (?:prices?|rates?|values?).*?(?:on|in|for) ([a-zA-Z]+)(?:.*?(?:in|using|with) ([a-zA-Z]{3,}))?/i,
  // Add patterns to match just network and currency mentions
  networkOnly: /(?:token|crypto|cryptocurrency)(?:\s+prices?|\s+rates?|\s+values?).*?(?:on|in|for)\s+([a-zA-Z]+)/i,
  currencyOnly: /(?:token|crypto|cryptocurrency)(?:\s+prices?|\s+rates?|\s+values?).*?(?:in|using|with)\s+([a-zA-Z]{3,})/i
}; 