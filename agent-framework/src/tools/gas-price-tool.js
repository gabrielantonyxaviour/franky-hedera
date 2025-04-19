import axios from 'axios';

// Network ID mapping for gas price tool
export const NETWORK_IDS = {
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

// Function to get gas price from 1inch API
export async function getGasPrice(network) {
  // Get the chain ID from the network name
  const networkLower = network.toLowerCase();
  const chainId = NETWORK_IDS[networkLower];
  
  if (!chainId) {
    return { 
      error: `Unsupported network: ${network}. Supported networks are: ${Object.keys(NETWORK_IDS).join(', ')}` 
    };
  }
  
  const url = `https://api.1inch.dev/gas-price/v1.5/${chainId}`;
  
  const config = {
    headers: {
      "Authorization": `Bearer ${INCH_API_KEY}`
    }
  };
  
  try {
    console.log(`🔍 Fetching gas price from 1inch API for network: ${network} (chainId: ${chainId})`);
    const response = await axios.get(url, config);
    
    // Log the raw response data
    console.log(`✅ Raw 1inch API response for ${network}:`, JSON.stringify(response.data, null, 2));
    
    return { 
      success: true, 
      data: response.data,
      network: network,
      chainId: chainId
    };
  } catch (error) {
    console.error(`❌ Error fetching gas price for ${network}:`, error.message);
    
    // Log more detailed error information if available
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
    }
    
    return { 
      error: `Failed to fetch gas price for ${network}: ${error.message}` 
    };
  }
}

// Function to format gas price response in character's style
export function formatGasPriceResponse(character, network, gasPriceResult) {
  // If there was an error fetching the gas price
  if (gasPriceResult.error) {
    // Create character-appropriate error responses based on personality traits
    if (character.personality && character.personality.toLowerCase().includes('technical')) {
      return `I attempted to query the gas price API for ${network}, but encountered an error: ${gasPriceResult.error}`;
    } else if (character.personality && character.personality.toLowerCase().includes('formal')) {
      return `I regret to inform you that I was unable to retrieve the current gas prices for ${network}. The system reported: ${gasPriceResult.error}`;
    } else {
      return `I tried to check the gas price for ${network}, but ran into a problem: ${gasPriceResult.error}`;
    }
  }
  
  // Format the gas price data based on the actual API response structure
  const gasData = gasPriceResult.data;
  
  // Base fee (convert from wei to gwei)
  const baseGasPrice = gasData.baseFee ? 
    `${(Number(gasData.baseFee) / 1e9).toFixed(2)} Gwei` : 
    'Not available';
  
  // Low priority transaction (if available)
  const lowGasPrice = gasData.low && gasData.low.maxFeePerGas ? 
    `${(Number(gasData.low.maxFeePerGas) / 1e9).toFixed(2)} Gwei` : 
    'Not available';
  
  // Medium priority transaction (if available)
  const mediumGasPrice = gasData.medium && gasData.medium.maxFeePerGas ? 
    `${(Number(gasData.medium.maxFeePerGas) / 1e9).toFixed(2)} Gwei` : 
    'Not available';
  
  // High priority transaction (if available)
  const highGasPrice = gasData.high && gasData.high.maxFeePerGas ? 
    `${(Number(gasData.high.maxFeePerGas) / 1e9).toFixed(2)} Gwei` : 
    'Not available';
  
  // Instant transaction (if available)
  const instantGasPrice = gasData.instant && gasData.instant.maxFeePerGas ? 
    `${(Number(gasData.instant.maxFeePerGas) / 1e9).toFixed(2)} Gwei` : 
    'Not available';
  
  // Create character-appropriate responses based on personality traits
  let response = '';
  
  // Check for personality traits to customize the response
  const personality = character.personality ? character.personality.toLowerCase() : '';
  
  if (personality.includes('technical') || personality.includes('scientist') || personality.includes('professor')) {
    response = `According to my analysis of the ${network.charAt(0).toUpperCase() + network.slice(1)} blockchain metrics, the current gas prices are:\n\n` +
      `Base fee: ${baseGasPrice}\n` +
      `Low priority: ${lowGasPrice}\n` +
      `Medium priority: ${mediumGasPrice}\n` +
      `High priority: ${highGasPrice}\n` +
      `Instant: ${instantGasPrice}\n\n` +
      `These values represent the cost of computational resources required for transaction processing on the ${network} network.`;
  } else if (personality.includes('formal') || personality.includes('business')) {
    response = `I've checked the current gas prices on the ${network.charAt(0).toUpperCase() + network.slice(1)} network for you:\n\n` +
      `Base fee: ${baseGasPrice}\n` +
      `Low priority: ${lowGasPrice}\n` +
      `Medium priority: ${mediumGasPrice}\n` +
      `High priority: ${highGasPrice}\n` +
      `Instant: ${instantGasPrice}\n\n` +
      `Please note that these prices may vary depending on network activity.`;
  } else if (personality.includes('friendly') || personality.includes('helpful')) {
    response = `I just looked up the gas prices on ${network.charAt(0).toUpperCase() + network.slice(1)} for you! Here's what I found:\n\n` +
      `Base fee: ${baseGasPrice}\n` +
      `Low priority: ${lowGasPrice}\n` +
      `Medium priority: ${mediumGasPrice}\n` +
      `High priority: ${highGasPrice}\n` +
      `Instant: ${instantGasPrice}\n\n` +
      `Keep in mind these prices can change pretty quickly depending on how busy the network is!`;
  } else if (personality.includes('eccentric') || personality.includes('quirky')) {
    response = `*fiddles with a blockchain calculator* Aha! The ethereal gas spirits of ${network.charAt(0).toUpperCase() + network.slice(1)} are demanding:\n\n` +
      `✨ Base tribute: ${baseGasPrice}\n` +
      `🐢 Slow offering: ${lowGasPrice}\n` +
      `🚶 Medium pace: ${mediumGasPrice}\n` +
      `🏃 Swift payment: ${highGasPrice}\n` +
      `⚡ Lightning speed: ${instantGasPrice}\n\n` +
      `These mystical numbers shift with the blockchain winds, you know!`;
  } else {
    // Default response for any other personality type
    response = `I checked the current gas prices on ${network.charAt(0).toUpperCase() + network.slice(1)}:\n\n` +
      `Base fee: ${baseGasPrice}\n` +
      `Low priority: ${lowGasPrice}\n` +
      `Medium priority: ${mediumGasPrice}\n` +
      `High priority: ${highGasPrice}\n` +
      `Instant: ${instantGasPrice}\n\n` +
      `These prices might fluctuate based on network activity.`;
  }
  
  return response;
}

// Function to prepare gas price data for the model
export function prepareGasPriceData(network, gasPriceResult) {
  if (gasPriceResult.error) {
    return {
      error: gasPriceResult.error,
      network: network
    };
  }
  
  // Format the gas price data in a clean, structured way for the model to use
  const gasData = gasPriceResult.data;
  
  // Convert wei values to gwei for readability
  const formattedData = {
    network: network,
    baseFee: gasData.baseFee ? `${(Number(gasData.baseFee) / 1e9).toFixed(2)} Gwei` : 'Not available'
  };
  
  // Add priority levels if they exist in the response
  if (gasData.low && gasData.low.maxFeePerGas) {
    formattedData.low = `${(Number(gasData.low.maxFeePerGas) / 1e9).toFixed(2)} Gwei`;
  }
  
  if (gasData.medium && gasData.medium.maxFeePerGas) {
    formattedData.medium = `${(Number(gasData.medium.maxFeePerGas) / 1e9).toFixed(2)} Gwei`;
  }
  
  if (gasData.high && gasData.high.maxFeePerGas) {
    formattedData.high = `${(Number(gasData.high.maxFeePerGas) / 1e9).toFixed(2)} Gwei`;
  }
  
  if (gasData.instant && gasData.instant.maxFeePerGas) {
    formattedData.instant = `${(Number(gasData.instant.maxFeePerGas) / 1e9).toFixed(2)} Gwei`;
  }
  
  return formattedData;
}

// Export the tool definition for use in the API
export const gasPriceTool = {
  type: "function",
  function: {
    name: "GetGasPrice",
    description: "Fetches the current gas price from a blockchain network. Use when the user asks about gas prices, transaction costs, or network fees for a specific blockchain.",
    parameters: {
      type: "object",
      properties: {
        network: {
          type: "string",
          description: "The blockchain network to check gas prices for (e.g., ethereum, polygon, avalanche, binance, arbitrum, optimism, base, fantom, aurora)"
        }
      },
      required: ["network"]
    }
  }
};

// Export regex patterns for detecting gas price queries
export const gasQueryPatterns = {
  primary: /(?:gas|transaction|tx)(?:\s+fee|\s+price|\s+cost).*(?:on|for|in)\s+([a-zA-Z]+)/i,
  alternative: /(?:what(?:'s| is) the|current|check|get|show).*(?:gas|transaction|tx).*(?:on|for|in)\s+([a-zA-Z]+)/i,
  intentInResponse: /(?:gas|transaction) (?:price|fee|cost).*(?:on|for|in) ([a-zA-Z]+)/i
}; 