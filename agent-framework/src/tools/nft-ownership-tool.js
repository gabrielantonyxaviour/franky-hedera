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
 * Fetches NFTs owned by a specific address across various chains
 * @param {string} address - The blockchain address to check
 * @param {string} network - The blockchain network name (optional, defaults to ethereum)
 * @returns {Promise<Object>} NFT ownership data or error
 */
export async function getNFTOwnership(address, network = 'ethereum') {
  // Validate the address format (basic check)
  if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return {
      error: `Invalid Ethereum address format: ${address}. Address should be a 42-character hexadecimal string starting with 0x.`
    };
  }
  
  // Get the chain ID from the network name
  const networkLower = network.toLowerCase();
  const chainId = NETWORK_IDS[networkLower];
  
  if (!chainId) {
    return { 
      error: `Unsupported network: ${network}. Supported networks are: ${Object.keys(NETWORK_IDS).join(', ')}` 
    };
  }
  
  const url = "https://api.1inch.dev/nft/v2/byaddress";
  
  const config = {
    headers: {
      "Authorization": `Bearer ${INCH_API_KEY}`
    },
    params: {
      "address": address,
      "chainIds": [parseInt(chainId)]
    },
    paramsSerializer: {
      indexes: null
    }
  };
  
  try {
    console.log(`🔍 Fetching NFT ownership from 1inch API for address: ${address} on network: ${network} (chainId: ${chainId})`);
    console.log(`🔧 Request config:`, JSON.stringify(config, null, 2));
    
    const response = await axios.get(url, config);
    
    // Log the raw response data
    console.log(`✅ Raw 1inch API NFT ownership response for ${address} on ${network}:`, JSON.stringify(response.data, null, 2));
    
    return { 
      success: true, 
      data: response.data,
      address: address,
      network: network,
      chainId: chainId
    };
  } catch (error) {
    console.error(`❌ Error fetching NFT ownership for ${address} on ${network}:`, error.message);
    
    // Log more detailed error information if available
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
    }
    
    return { 
      error: `Failed to fetch NFT ownership for ${address} on ${network}: ${error.message}` 
    };
  }
}

/**
 * Prepares NFT ownership data in a clean format for the model
 * @param {string} address - The blockchain address
 * @param {string} network - The blockchain network
 * @param {Object} result - The raw API result
 * @returns {Object} Formatted NFT ownership data
 */
export function prepareNFTOwnershipData(address, network, result) {
  // Handle error case
  if (result.error) {
    return { error: result.error };
  }
  
  // Check if there's valid data
  if (!result.data || !result.data.assets || !Array.isArray(result.data.assets)) {
    return {
      address: address,
      network: network,
      message: "No NFT data found or invalid response format."
    };
  }
  
  // Check if there are any NFTs
  if (result.data.assets.length === 0) {
    return {
      address: address,
      network: network,
      message: "No NFTs found for this address on this network."
    };
  }
  
  // Format the NFTs (limit to 10 to avoid overwhelming the model)
  const nfts = result.data.assets.slice(0, 10).map(nft => {
    return {
      name: nft.name || 'Unnamed NFT',
      tokenId: nft.token_id || 'Unknown ID',
      collection: nft.asset_contract?.address || 'Unknown Collection',
      schema: nft.asset_contract?.schema_name || 'Unknown Schema',
      chainId: nft.chainId || result.chainId,
      imageUrl: nft.image_url || 'No image available',
      provider: nft.provider || 'Unknown Provider'
    };
  });
  
  return {
    address: address,
    network: network,
    nftCount: result.data.assets.length,
    nfts: nfts
  };
}

// Export the tool definition for use in the API
export const nftOwnershipTool = {
  type: "function",
  function: {
    name: "GetNFTOwnership",
    description: "Fetches the NFTs owned by a specific address on a blockchain network. Use when the user asks about NFT ownership, digital collectibles, or tokens owned by a blockchain address.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "The blockchain address to check (e.g., 0x1234...)"
        },
        network: {
          type: "string",
          description: "The blockchain network to check (e.g., ethereum, polygon, avalanche, binance, arbitrum, optimism, base, fantom, aurora)",
          default: "ethereum"
        }
      },
      required: ["address"]
    }
  }
};

// Export regex patterns for detecting NFT ownership queries
export const nftOwnershipQueryPatterns = {
  primary: /(?:nft|collectible|token|digital asset)s?(?:\s+owned|\s+holding|\s+collection|\s+ownership|\s+portfolio|\s+holdings).*?(?:for|of|by|from|at|in|on)\s+([0-9a-fA-Fx]{42})(?:.*?(?:on|in)\s+([a-zA-Z]+))?/i,
  alternative: /(?:what|which|show|list|get|check|find)(?:'s| is| are)?\s+(?:the\s+)?(?:nft|collectible|token|digital asset)s?.*?(?:for|of|by|from|at|in|on)\s+([0-9a-fA-Fx]{42})(?:.*?(?:on|in)\s+([a-zA-Z]+))?/i,
  intentInResponse: /(?:nft|collectible|token|digital asset)s? (?:owned|holding|collection|ownership|portfolio|holdings).*?(?:for|of|by|from|at|in|on) ([0-9a-fA-Fx]{42})(?:.*?(?:on|in) ([a-zA-Z]+))?/i,
  addressWithNFT: /\b(0x[a-fA-F0-9]{40})\b.*?\b(?:nft|collectible|token|digital asset)s?\b|\b(?:nft|collectible|token|digital asset)s?\b.*?\b(0x[a-fA-F0-9]{40})\b/i
}; 