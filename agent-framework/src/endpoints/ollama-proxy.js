import express from 'express';
import { trimV1 } from '../util.js';
import axios from 'axios';
import { isCallerOwner } from '../utils/api-key-verifier.js';
import { getAgentCharacter } from '../utils/agent-fetcher.js';

// Import the gas price tool functions
import { 
  getGasPrice, 
  prepareGasPriceData, 
  gasPriceTool, 
  gasQueryPatterns 
} from '../tools/gas-price-tool.js';

// Import the transaction history tool functions
import {
  getTransactionHistory,
  prepareTransactionHistoryData,
  transactionHistoryTool,
  transactionHistoryQueryPatterns
} from '../tools/transaction-history-tool.js';

// Import prompt building functions
import { 
  buildRoleplayPrompt, 
  buildRoleplayPromptWithData, 
  buildSystemPrompt, 
  buildFullPrompt 
} from '../utils/prompt-builder.js';

// Import response cleaning function
import { cleanRoleplayResponse } from '../utils/response-cleaner.js';

// Import network IDs for regex fallback
import { NETWORK_IDS } from '../tools/gas-price-tool.js';

// Import the NFT ownership tool functions
import {
  getNFTOwnership,
  prepareNFTOwnershipData,
  nftOwnershipTool,
  nftOwnershipQueryPatterns
} from '../tools/nft-ownership-tool.js';

// Import the token price tool functions
import {
  getTokenPrices,
  prepareTokenPriceData,
  tokenPriceTool,
  tokenPriceQueryPatterns
} from '../tools/token-price-tool.js';
import { FRANKY_ABI, FRANKY_TOKEN_ADDRESS } from '../constants.js';
import { createPublicClient } from 'viem';
import { base } from 'viem/chains';
import { http } from 'viem';

export const router = express.Router();

// Default model to use
const DEFAULT_MODEL = 'qwen2.5:3b';

// This endpoint allows external access to Ollama through SillyTavern
router.post('/generate', async (request, response) => {
  try {
    console.log('⚡ Received generate request:', request.body);
    const ollamaUrl = 'http://127.0.0.1:11434';
    
    // Get API key and agent ID from headers
    const apiKey = request.headers['api-key'];
    const agentId = request.headers['agent-id'];

    // Check if API key and agent ID are provided
    if (!apiKey || !agentId) {
      console.error('❌ Missing API key or agent ID');
      return response.status(401).send({ error: 'API key and agent ID are required' });
    }

    // Get agent data first
    let ownerKeyHash = null;
    try {
      const return_data = await getAgentCharacter(agentId);
      console.log('✅ Successfully fetched agent data');
      
      // Only proceed with blockchain validation if we have a valid owner
      if (return_data.owner && typeof return_data.owner === 'string' && return_data.owner.startsWith('0x')) {
        try {
          console.log(`👤 Agent owner address: ${return_data.owner}`);
          
          const publicClient = createPublicClient({
            chain: base,
            transport: http()
          });
          
          ownerKeyHash = await publicClient.readContract({
            address: return_data.owner,
            abi: FRANKY_ABI,
            functionName: 'agentsKeyHash',
            args: [agentId, return_data.owner]
          });
          console.log(`🔑 Successfully retrieved owner key hash: ${ownerKeyHash}`);
        } catch (contractError) {
          console.error('❌ Contract read error:', contractError.message);
          // Continue without the key hash
        }
      } else {
        console.log('⚠️ No valid owner address found, skipping blockchain validation');
      }
    } catch (dataError) {
      console.error('❌ Error fetching agent data:', dataError.message);
      return response.status(500).send({ error: 'Failed to fetch agent data' });
    }

    // Verify API key with whatever data we have
    const {status, caller} = await isCallerOwner(agentId, apiKey, null);

    if (status == 0) {
      console.error('❌ Invalid API key or agent ID');
      return response.status(401).send({ error: 'Invalid API key or agent ID' });
    }

    // Get the prompt and chat history from request body
    const { prompt, chat_history = [] } = request.body;
    if (!prompt) {
      return response.status(400).send({ error: 'Prompt is required in request body' });
    }

    // Fetch character data from IPFS based on agent ID
    let character_data;
    try {
      character_data = await getAgentCharacter(agentId);

      console.log(`🎭 Using character "${character_data.character.name}" from IPFS`);
    } catch (error) {
      console.error('❌ Failed to fetch character data:', error);
      return response.status(500).send({ error: 'Failed to fetch character data from IPFS' });
    }

    // Rest of your existing code for handling the request...
    // Just replace any references to request.body.model with DEFAULT_MODEL
    // and remove any references to request.body.character_data
    // The character_data variable now comes from IPFS instead

    // Check if function calling is enabled in options
    if (request.body.options && request.body.options.function_calling) {
      console.log('🔧 Function calling is ENABLED in /generate endpoint');
      
      // If there are tool definitions available, log them
      if (request.body.options.tools && request.body.options.tools.length > 0) {
        console.log(`🧰 Found ${request.body.options.tools.length} tool definitions: ${request.body.options.tools.map(t => t.function?.name || 'unnamed').join(', ')}`);
      } else {
        console.log('🧰 No tool definitions found in the request');
      }
    } else {
      console.log('🔧 Function calling is DISABLED in /generate endpoint');
    }
    
    // Forward the request to Ollama
    const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('❌ Ollama proxy error:', ollamaResponse.status, errorText);
      return response.status(ollamaResponse.status).send(errorText);
    }
    
    // Return the Ollama response
    const data = await ollamaResponse.json();
    console.log('✅ Ollama generate response received');
    
    // Check if the response contains tool calls
    if (data.tool_calls && data.tool_calls.length > 0) {
      console.log(`🔧 Response contains ${data.tool_calls.length} tool calls:`);
      for (const toolCall of data.tool_calls) {
        console.log(`  - Tool name: ${toolCall.name || 'unnamed'}`);
        console.log(`  - Arguments: ${JSON.stringify(toolCall.arguments || {})}`);
      }
    } else {
      console.log('🔧 No tool calls found in the response');
    }
    
    return response.send(data);
  } catch (error) {
    console.error('❌ Ollama proxy error:', error);
    return response.status(500).send({ error: error.message });
  }
});

// Specialized roleplay character generation endpoint
router.post('/roleplay-character', async (request, response) => {
  try {
    console.log('⚡ Received roleplay-character request');
    const ollamaUrl = 'http://127.0.0.1:11434';
    
    // Get API key and agent ID from headers
    const apiKey = request.headers['api-key'];
    const agentId = request.headers['agent-id'];

    // Check if API key and agent ID are provided
    if (!apiKey || !agentId) {
      console.error('❌ Missing API key or agent ID');
      return response.status(401).send({ error: 'API key and agent ID are required' });
    }

    console.log(`🔑 Starting auth flow for agent: ${agentId} with API key: ${apiKey}`);
    
    // Step 1: Fetch agent data and ENSURE we have it before proceeding
    let agentData;
    let ownerKeyHash = null;
    let character_data;
    let perApiCallAmount;
    let agentOwner;
    
    try {
      console.log(`🔄 Fetching agent data for ID: ${agentId}`);
      agentData = await getAgentCharacter(agentId);
      console.log(`✅ Agent data fetched successfully`);
      
      // Store these values for later use
      character_data = agentData.character;
      perApiCallAmount = agentData.perApiCallAmount;
      agentOwner = agentData.owner;
      
      console.log(`📊 Agent data summary:
        - Name: ${agentData.name}
        - Owner: ${agentData.owner}
        - API Fee: ${agentData.perApiCallAmount}
      `);
      
      // Step 2: Check if owner address is valid before attempting to use it
      if (agentData.owner && typeof agentData.owner === 'string' && agentData.owner.startsWith('0x')) {
        console.log(`👤 Owner address is valid: ${agentData.owner}`);
        
        try {
          console.log(`🔄 Initializing blockchain client`);
          const publicClient = createPublicClient({
            chain: base,
            transport: http()
          });
          
          // NOTE: We're no longer trying to call agentsKeyHash on the owner address
          // Instead, we'll get the key hash from the agent verification flow
          console.log(`⚠️ Skipping direct blockchain verification - relying on API key verification`);
        } catch (contractError) {
          console.error(`❌ Contract read error: ${contractError.message}`);
          console.log(`⚠️ Continuing auth flow without blockchain verification`);
          // Continue auth flow without key hash
        }
      } else {
        console.log(`⚠️ Owner address is invalid or undefined: "${agentData.owner}"`);
        console.log(`⚠️ Skipping blockchain verification`);
      }
    } catch (fetchError) {
      console.error(`❌ Failed to fetch agent data: ${fetchError.message}`);
      return response.status(500).send({ error: 'Failed to fetch agent data' });
    }
    
    // Step 3: Verify API key with whatever data we have
    console.log(`🔄 Verifying API key`);
    console.log(`🔑 Agent ID: ${agentId}, Owner: ${agentOwner}`);
    const {status, caller} = await isCallerOwner(agentId, apiKey, null); // Pass null for ownerKeyHash

    if (status == 0) {
      console.error('❌ Invalid API key or agent ID');
      return response.status(401).send({ error: 'Invalid API key or agent ID' });
    }
    console.log(`✅ API key verification successful`);
    
    // Get the prompt and chat history from request body
    const { prompt, chat_history = [] } = request.body;
    if (!prompt) {
      return response.status(400).send({ error: 'Prompt is required in request body' });
    }

    // Continue with payment processing if needed
    try {
      if (status == 1 && perApiCallAmount > 0) {
        console.log(`💰 Processing payment: ${perApiCallAmount} tokens`);
        
        const withdrawResponse = await fetch(
          `https://api.metal.build/holder/${caller}/withdraw`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': 'YOUR-API-KEY',
            },
            body: JSON.stringify({
              tokenAddress: FRANKY_TOKEN_ADDRESS,
              amount: perApiCallAmount * 0.90,
              toAddress: agentOwner,
            }),
          }
        );
        
        const {success: withdrawSuccess} = await withdrawResponse.json();
        console.log(`💰 Withdraw status: ${withdrawSuccess ? 'success' : 'failed'}`);

        const spendResponse = await fetch(
          `https://api.metal.build/holder/${caller}/spend`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': 'YOUR-API-KEY',
            },
            body: JSON.stringify({
              tokenAddress: FRANKY_TOKEN_ADDRESS,
              amount: perApiCallAmount * 0.10,
            }),
          }
        );
        
        const {success: spendSuccess} = await spendResponse.json();
        console.log(`💰 Spend status: ${spendSuccess ? 'success' : 'failed'}`);
      }
      
      console.log(`🎭 Using character "${character_data.name}" from agent data`);
    } catch (paymentError) {
      console.error(`❌ Payment processing error: ${paymentError.message}`);
      // Continue even if payment fails - log error but don't block the request
    }
    
    // Initialize toolCallsFound variable
    let toolCallsFound = false;
    
    // Log the full request body for debugging
    console.log('📝 Full request body:', JSON.stringify(request.body, null, 2));
    
    console.log(`🎭 Processing roleplay character request for "${character_data.name}"`);
    
    // First, check for NFT ownership queries (highest priority)
    const nftOwnershipMatch = prompt.match(nftOwnershipQueryPatterns.primary);
    const altNftOwnershipMatch = !nftOwnershipMatch ? prompt.match(nftOwnershipQueryPatterns.alternative) : null;
    const nftAddressMatch = !nftOwnershipMatch && !altNftOwnershipMatch ? prompt.match(nftOwnershipQueryPatterns.addressWithNFT) : null;

    // Then check for transaction history queries
    const txHistoryMatch = !nftOwnershipMatch && !altNftOwnershipMatch && !nftAddressMatch ? prompt.match(transactionHistoryQueryPatterns.primary) : null;
    const altTxHistoryMatch = !nftOwnershipMatch && !altNftOwnershipMatch && !nftAddressMatch && !txHistoryMatch ? prompt.match(transactionHistoryQueryPatterns.alternative) : null;

    // Finally check for gas price queries
    const gasMatch = !nftOwnershipMatch && !altNftOwnershipMatch && !nftAddressMatch && !txHistoryMatch && !altTxHistoryMatch ? prompt.match(gasQueryPatterns.primary) : null;
    const altGasMatch = !nftOwnershipMatch && !altNftOwnershipMatch && !nftAddressMatch && !txHistoryMatch && !altTxHistoryMatch && !gasMatch ? prompt.match(gasQueryPatterns.alternative) : null;

    // Check for token price queries
    const tokenPriceMatch = !nftOwnershipMatch && !altNftOwnershipMatch && !nftAddressMatch && 
                            !txHistoryMatch && !altTxHistoryMatch && !gasMatch && !altGasMatch ? prompt.match(tokenPriceQueryPatterns.primary) : null;
                            
    const altTokenPriceMatch = !nftOwnershipMatch && !altNftOwnershipMatch && !nftAddressMatch && 
                              !txHistoryMatch && !altTxHistoryMatch && !gasMatch && !altGasMatch && !tokenPriceMatch ? 
                              prompt.match(tokenPriceQueryPatterns.alternative) : null;

    const userName = request.body.user_name || 'User';
    
    // Handle NFT ownership query (highest priority)
    if (nftOwnershipMatch || altNftOwnershipMatch || nftAddressMatch) {
      let address, network;
      
      if (nftAddressMatch) {
        // If we found an address with NFT keywords
        address = nftAddressMatch[1] || nftAddressMatch[2]; // Check both capture groups
        network = 'ethereum'; // Default to ethereum
        console.log(`🔍 Detected Ethereum address with NFT keywords: ${address}, assuming NFT ownership query`);
      } else {
        // Regular NFT ownership query match
        const match = nftOwnershipMatch || altNftOwnershipMatch;
        address = match[1];
        network = match[2]?.toLowerCase() || 'ethereum';
        console.log(`🔍 Detected NFT ownership query for address: ${address} on network: ${network}`);
      }
      
      // Get the NFT ownership data
      const nftOwnershipResult = await getNFTOwnership(address, network);
      
      // Prepare the data in a clean format
      const nftOwnershipData = prepareNFTOwnershipData(address, network, nftOwnershipResult);
      
      // Create a special prompt that includes the NFT ownership data
      let roleplayPrompt;
      
      if (nftOwnershipData.error) {
        roleplayPrompt = buildRoleplayPromptWithData(
          character_data, 
          userName, 
          prompt, 
          chat_history,
          `You tried to check NFT ownership for address ${address} on ${network} but encountered an error: ${nftOwnershipData.error}. Respond to the user's request by explaining this issue in your character's style.`
        );
      } else if (nftOwnershipData.message) {
        roleplayPrompt = buildRoleplayPromptWithData(
          character_data, 
          userName, 
          prompt, 
          chat_history,
          `You checked NFT ownership for address ${address} on ${network} and found: ${nftOwnershipData.message}. Respond to the user's request by explaining this in your character's style.`
        );
      } else {
        // Create a data description for the model
        let dataDescription = `NFT ownership for address ${address} on ${network.charAt(0).toUpperCase() + network.slice(1)}:\n\n`;
        dataDescription += `Total NFTs found: ${nftOwnershipData.nftCount}\n\n`;
        dataDescription += `NFTs (showing ${nftOwnershipData.nfts.length}):\n\n`;
        
        nftOwnershipData.nfts.forEach((nft, index) => {
          dataDescription += `NFT ${index + 1}:\n`;
          dataDescription += `- Name: ${nft.name}\n`;
          dataDescription += `- Token ID: ${nft.tokenId}\n`;
          dataDescription += `- Collection: ${nft.collection}\n`;
          dataDescription += `- Type: ${nft.schema}\n`;
          dataDescription += `- Chain ID: ${nft.chainId}\n`;
          if (nft.imageUrl && nft.imageUrl !== 'No image available') {
            dataDescription += `- Image: ${nft.imageUrl}\n`;
          }
          dataDescription += `- Provider: ${nft.provider}\n`;
          dataDescription += '\n';
        });
        
        dataDescription += `Respond to the user's request about NFT ownership by conveying this information in your character's style. Summarize the NFT collection in a way that's easy to understand.`;
        
        roleplayPrompt = buildRoleplayPromptWithData(
          character_data, 
          userName, 
          prompt, 
          chat_history,
          dataDescription
        );
      }
      
      console.log('📝 Built specialized roleplay prompt with NFT ownership data');
      
      // Create enhanced response object
      const enhancedResponse = {
        character_name: character_data.name,
        tool_used: "GetNFTOwnership",
        tool_args: { address, network },
        tool_response: nftOwnershipResult
      };
      
      // Send a request to generate a response with the data
      const dataOllamaRequest = {
        model: DEFAULT_MODEL,
        prompt: roleplayPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          function_calling: false // Disable function calling for the follow-up request
        }
      };
      
      console.log('🚀 Sending request with NFT ownership data to Ollama');
      
      const dataOllamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
        body: JSON.stringify(dataOllamaRequest),
      });
      
      if (!dataOllamaResponse.ok) {
        console.error('❌ Failed to generate response with NFT ownership data');
        return response.status(500).send({ error: 'Failed to generate response with NFT ownership data' });
      }
      
      // Use the new response
      const dataResponseJson = await dataOllamaResponse.json();
      const cleanedDataResponse = cleanRoleplayResponse(dataResponseJson.response, character_data.name);
      
      // Add the response to the enhanced response object
      enhancedResponse.response = cleanedDataResponse;
      
      return response.send(enhancedResponse);
    }
    // Handle transaction history query (prioritize this over gas price)
    else if (txHistoryMatch || altTxHistoryMatch) {
      let address, network;
      
      if (txHistoryMatch) {
        // If we only found an address without explicit transaction history keywords
        address = txHistoryMatch[1];
        network = 'ethereum'; // Default to ethereum
        console.log(`🔍 Detected Ethereum address: ${address}, assuming transaction history query`);
      } else {
        // Regular transaction history query match
        const match = txHistoryMatch || altTxHistoryMatch;
        address = match[1];
        network = match[2]?.toLowerCase() || 'ethereum';
        console.log(`🔍 Detected transaction history query for address: ${address} on network: ${network}`);
      }
      
      // Get the transaction history
      const txHistoryResult = await getTransactionHistory(address, network);
      
      // Prepare the data in a clean format
      const txHistoryData = prepareTransactionHistoryData(address, network, txHistoryResult);
      
      // Create a special prompt that includes the transaction history data
      let roleplayPrompt;
      
      if (txHistoryData.error) {
        roleplayPrompt = buildRoleplayPromptWithData(
          character_data, 
          userName, 
          prompt, 
          chat_history,
          `You tried to check transaction history for address ${address} on ${network} but encountered an error: ${txHistoryData.error}. Respond to the user's request by explaining this issue in your character's style.`
        );
      } else if (txHistoryData.message) {
        roleplayPrompt = buildRoleplayPromptWithData(
          character_data, 
          userName, 
          prompt, 
          chat_history,
          `You checked transaction history for address ${address} on ${network} and found: ${txHistoryData.message}. Respond to the user's request by explaining this in your character's style.`
        );
      } else {
        // Create a data description for the model
        let dataDescription = `Transaction history for address ${address} on ${network.charAt(0).toUpperCase() + network.slice(1)}:\n\n`;
        dataDescription += `Total transactions found: ${txHistoryData.transactionCount}\n\n`;
        dataDescription += `Recent transactions (showing ${txHistoryData.recentTransactions.length}):\n\n`;
        
        txHistoryData.recentTransactions.forEach((tx, index) => {
          dataDescription += `Transaction ${index + 1}:\n`;
          dataDescription += `- Date: ${tx.date} ${tx.time}\n`;
          dataDescription += `- Type: ${tx.type}\n`;
          dataDescription += `- Status: ${tx.status}\n`;
          dataDescription += `- From: ${tx.from}\n`;
          dataDescription += `- To: ${tx.to}\n`;
          dataDescription += `- Transaction Hash: ${tx.txHash}\n`;
          
          if (tx.token) {
            dataDescription += `- Token: ${tx.token.type}\n`;
            dataDescription += `- Amount: ${tx.token.amount}\n`;
            dataDescription += `- Direction: ${tx.token.direction}\n`;
          }
          
          dataDescription += '\n';
        });
        
        dataDescription += `Respond to the user's request about transaction history by conveying this information in your character's style. Summarize the recent transactions in a way that's easy to understand.`;
        
        roleplayPrompt = buildRoleplayPromptWithData(
          character_data, 
          userName, 
          prompt, 
          chat_history,
          dataDescription
        );
      }
      
      console.log('📝 Built specialized roleplay prompt with transaction history data');
      
      // Create enhanced response object
    const enhancedResponse = {
        character_name: character_data.name,
        tool_used: "GetTransactionHistory",
        tool_args: { address, network },
        tool_response: txHistoryResult
      };
      
      // Send a request to generate a response with the data
      const dataOllamaRequest = {
      model: DEFAULT_MODEL,
      prompt: roleplayPrompt,
        stream: false,
      options: {
          temperature: 0.7,
          top_p: 0.9
        }
      };
      
      console.log('🚀 Sending request with transaction history data to Ollama');
      
      const dataOllamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataOllamaRequest),
      });
      
      if (!dataOllamaResponse.ok) {
        console.error('❌ Failed to generate response with transaction history data');
        return response.status(500).send({ error: 'Failed to generate response with transaction history data' });
      }
      
      // Use the new response
      const dataResponseJson = await dataOllamaResponse.json();
      const cleanedDataResponse = cleanRoleplayResponse(dataResponseJson.response, character_data.name);
      
      // Add the response to the enhanced response object
      enhancedResponse.response = cleanedDataResponse;
      
      return response.send(enhancedResponse);
    }
    // Handle gas price query (only if no transaction history match was found)
    else if (gasMatch || altGasMatch) {
      const match = gasMatch || altGasMatch;
      const network = match[1].toLowerCase();
      console.log(`🔍 Detected gas price query for network: ${network}`);
      
      // Get the gas price
      const gasPriceResult = await getGasPrice(network);
      
      // Prepare the data in a clean format
      const gasPriceData = prepareGasPriceData(network, gasPriceResult);
      
      // Create a special prompt that includes the gas price data
      let roleplayPrompt;
      
      if (gasPriceData.error) {
        roleplayPrompt = buildRoleplayPromptWithData(
          character_data, 
          userName, 
          prompt, 
          chat_history,
          `You tried to check gas prices for ${network} but encountered an error: ${gasPriceData.error}. Respond to the user's request about gas prices by explaining this issue in your character's style.`
        );
      } else {
        // Create a data description for the model
        const dataDescription = `Current gas prices for ${network.charAt(0).toUpperCase() + network.slice(1)}:\n` +
          `- Base fee: ${gasPriceData.baseFee}\n` +
          (gasPriceData.low ? `- Low priority: ${gasPriceData.low}\n` : '') +
          (gasPriceData.medium ? `- Medium priority: ${gasPriceData.medium}\n` : '') +
          (gasPriceData.high ? `- High priority: ${gasPriceData.high}\n` : '') +
          (gasPriceData.instant ? `- Instant: ${gasPriceData.instant}\n` : '') +
          `\nRespond to the user's request about gas prices by conveying this information in your character's style. Include all the price levels shown above.`;
        
        roleplayPrompt = buildRoleplayPromptWithData(
          character_data, 
          userName, 
          prompt, 
          chat_history,
          dataDescription
        );
      }
      
      console.log('📝 Built specialized roleplay prompt with gas price data');
      
      // Process with Ollama and return response
      const enhancedResponse = await processOllamaRequest(
        ollamaUrl,
        DEFAULT_MODEL,
        roleplayPrompt,
        false,
        request.body.options || {},
        character_data.name,
        "GetGasPrice",
        { network },
        gasPriceResult
      );
      
      return response.send(enhancedResponse);
    }
    // Handle token price query
    else if (tokenPriceMatch || altTokenPriceMatch) {
      const match = tokenPriceMatch || altTokenPriceMatch;
      const network = match[1]?.toLowerCase() || 'ethereum';
      const currency = match[2]?.toUpperCase() || 'USD';
      console.log(`🔍 Detected token price query for network: ${network} in currency: ${currency}`);
      
      // Get the token prices
      const tokenPriceResult = await getTokenPrices(network, currency);
      
      // Prepare the data in a clean format
      const tokenPriceData = prepareTokenPriceData(network, currency, tokenPriceResult);
      
      // Create a special prompt that includes the token price data
      let roleplayPrompt;
      
      if (tokenPriceData.error) {
        roleplayPrompt = buildRoleplayPromptWithData(
          character_data, 
          userName, 
          prompt, 
          chat_history,
          `You tried to check token prices on ${network} in ${currency} but encountered an error: ${tokenPriceData.error}. Respond to the user's request by explaining this issue in your character's style.`
        );
      } else if (tokenPriceData.message) {
        roleplayPrompt = buildRoleplayPromptWithData(
          character_data, 
          userName, 
          prompt, 
          chat_history,
          `You checked token prices on ${network} in ${currency} and found: ${tokenPriceData.message}. Respond to the user's request by explaining this in your character's style.`
        );
      } else {
        // Create a data description for the model
        let dataDescription = `Token prices on ${network.charAt(0).toUpperCase() + network.slice(1)} in ${currency}:\n\n`;
        dataDescription += `Total tokens available: ${tokenPriceData.tokenCount}\n\n`;
        dataDescription += `Top tokens (showing ${tokenPriceData.tokens.length}):\n\n`;
        
        tokenPriceData.tokens.forEach((token, index) => {
          dataDescription += `${index + 1}. ${token.symbol} (${token.address.substring(0, 6)}...${token.address.substring(38)}): ${token.price}\n`;
        });
        
        dataDescription += `\nRespond to the user's request about token prices by conveying this information in your character's style. Summarize the token prices in a way that's easy to understand.`;
        
        roleplayPrompt = buildRoleplayPromptWithData(
          character_data, 
          userName, 
          prompt, 
          chat_history,
          dataDescription
        );
      }
      
      console.log('📝 Built specialized roleplay prompt with token price data');
      
      // Create enhanced response object
      const enhancedResponse = {
        character_name: character_data.name,
        tool_used: "GetTokenPrices",
        tool_args: { network, currency },
        tool_response: tokenPriceResult
      };
      
      // Send a request to generate a response with the data
      const dataOllamaRequest = {
      model: DEFAULT_MODEL,
      prompt: roleplayPrompt,
        stream: false,
      options: {
          temperature: 0.7,
        top_p: 0.9,
          function_calling: false // Disable function calling for the follow-up request
        }
      };
      
      console.log('🚀 Sending request with token price data to Ollama');
      
      const dataOllamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataOllamaRequest),
      });
      
      if (!dataOllamaResponse.ok) {
        console.error('❌ Failed to generate response with token price data');
        return response.status(500).send({ error: 'Failed to generate response with token price data' });
      }
      
      // Use the new response
      const dataResponseJson = await dataOllamaResponse.json();
      const cleanedDataResponse = cleanRoleplayResponse(dataResponseJson.response, character_data.name);
      
      // Add the response to the enhanced response object
      enhancedResponse.response = cleanedDataResponse;
      
      return response.send(enhancedResponse);
    }
    // Handle regular roleplay request
    else {
      // Build a roleplay prompt
      const roleplayPrompt = buildRoleplayPrompt(character_data, userName, prompt, chat_history);
      
      console.log('📝 Built standard roleplay prompt');
      
      // Create a properly typed options object with tools
      const enhancedOptions = {
        ...request.body.options,
        function_calling: true,
        tools: Array.isArray(request.body.options?.tools) ? [...request.body.options.tools] : []
      };
      
      // Add gas price tool if not already present
      if (!enhancedOptions.tools.some(tool => tool.function?.name === 'GetGasPrice')) {
        enhancedOptions.tools.push(gasPriceTool);
      }
      
      // Add transaction history tool if not already present
      if (!enhancedOptions.tools.some(tool => tool.function?.name === 'GetTransactionHistory')) {
        enhancedOptions.tools.push(transactionHistoryTool);
      }
      
      // Add NFT ownership tool if not already present
      if (!enhancedOptions.tools.some(tool => tool.function?.name === 'GetNFTOwnership')) {
        enhancedOptions.tools.push(nftOwnershipTool);
      }
      
      // Add token price tool if not already present
      if (!enhancedOptions.tools.some(tool => tool.function?.name === 'GetTokenPrices')) {
        enhancedOptions.tools.push(tokenPriceTool);
      }
      
      console.log(`🧰 Added tools to request: ${enhancedOptions.tools.map(t => t.function?.name).join(', ')}`);
      
      // Forward the request to Ollama
      const ollamaRequest = {
        model: DEFAULT_MODEL,
        prompt: roleplayPrompt,
        stream: request.body.stream || false,
        options: enhancedOptions
      };
    
    console.log('🚀 Sending roleplay request to Ollama with model:', DEFAULT_MODEL);
    
    const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ollamaRequest),
    });
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('❌ Ollama roleplay error:', ollamaResponse.status, errorText);
      return response.status(ollamaResponse.status).send(errorText);
    }
    
      // Parse the response
    const data = await ollamaResponse.json();
    console.log('✅ Ollama roleplay response received');
    
      // Create enhanced response object
      const enhancedResponse = {
        character_name: character_data.name,
        ...data
      };
      
      // Flag to track if any tool calls were found and processed
    // Check if the response contains tool calls
    if (data.tool_calls && data.tool_calls.length > 0) {
      console.log(`🔧 Response contains ${data.tool_calls.length} tool calls:`);
        toolCallsFound = true;
        
        // Process each tool call
      for (const toolCall of data.tool_calls) {
        console.log(`  - Tool name: ${toolCall.name || 'unnamed'}`);
        console.log(`  - Arguments: ${JSON.stringify(toolCall.arguments || {})}`);
          
          // Handle GetTransactionHistory tool call - check this BEFORE GetGasPrice
          if (toolCall.name === 'GetTransactionHistory') {
            const args = toolCall.arguments || {};
            const address = args.address;
            const network = args.network?.toLowerCase() || 'ethereum';
            
            if (!address) {
              console.error('❌ Missing address parameter in GetTransactionHistory tool call');
              continue;
            }
            
            console.log(`🔧 Executing GetTransactionHistory tool for address: ${address} on network: ${network}`);
            
            // Get the transaction history
            const txHistoryResult = await getTransactionHistory(address, network);
            
            // Prepare the data in a clean format
            const txHistoryData = prepareTransactionHistoryData(address, network, txHistoryResult);
            
            // Build a new prompt with the transaction history data
            let dataPrompt;
            
            if (txHistoryData.error) {
              dataPrompt = `You tried to check transaction history for address ${address} on ${network} but encountered an error: ${txHistoryData.error}. Respond to the user's request by explaining this issue in your character's style.`;
            } else if (txHistoryData.message) {
              dataPrompt = `You checked transaction history for address ${address} on ${network} and found: ${txHistoryData.message}. Respond to the user's request by explaining this in your character's style.`;
    } else {
              // Create a data description for the model
              dataPrompt = `Transaction history for address ${address} on ${network.charAt(0).toUpperCase() + network.slice(1)}:\n\n`;
              dataPrompt += `Total transactions found: ${txHistoryData.transactionCount}\n\n`;
              dataPrompt += `Recent transactions (showing ${txHistoryData.recentTransactions.length}):\n\n`;
              
              txHistoryData.recentTransactions.forEach((tx, index) => {
                dataPrompt += `Transaction ${index + 1}:\n`;
                dataPrompt += `- Date: ${tx.date} ${tx.time}\n`;
                dataPrompt += `- Type: ${tx.type}\n`;
                dataPrompt += `- Status: ${tx.status}\n`;
                dataPrompt += `- From: ${tx.from}\n`;
                dataPrompt += `- To: ${tx.to}\n`;
                dataPrompt += `- Transaction Hash: ${tx.txHash}\n`;
                
                if (tx.token) {
                  dataPrompt += `- Token: ${tx.token.type}\n`;
                  dataPrompt += `- Amount: ${tx.token.amount}\n`;
                  dataPrompt += `- Direction: ${tx.token.direction}\n`;
                }
                
                dataPrompt += '\n';
              });
              
              dataPrompt += `Respond to the user's request about transaction history by conveying this information in your character's style. Summarize the recent transactions in a way that's easy to understand.`;
            }
            
            // Process the tool response
            await processToolResponse(
              ollamaUrl,
              DEFAULT_MODEL,
              dataPrompt,
              character_data,
              userName,
              prompt,
              chat_history,
              enhancedResponse,
              "GetTransactionHistory",
              { address, network },
              txHistoryResult
            );
          }
          // Handle GetGasPrice tool call
          else if (toolCall.name === 'GetGasPrice') {
            const args = toolCall.arguments || {};
            
            // Check if this is actually a token price request misidentified as gas price
            if (args.currency) {
              console.log(`🔄 Detected token price request misidentified as gas price request`);
              const network = args.network?.toLowerCase() || 'ethereum';
              const currency = args.currency?.toUpperCase() || 'USD';
              
              console.log(`🔧 Redirecting to GetTokenPrices tool for network: ${network} in currency: ${currency}`);
              
              // Call the token price tool instead
              const tokenPriceResult = await getTokenPrices(network, currency);
              const tokenPriceData = prepareTokenPriceData(
                typeof tokenPriceResult.network === 'string' ? tokenPriceResult.network : 'unknown',
                tokenPriceResult.currency || currency,
                tokenPriceResult
              );
              
              // Build a new prompt with the token price data
              let dataPrompt;
              
              if (tokenPriceData.error) {
                dataPrompt = `You tried to check token prices on ${network} in ${currency} but encountered an error: ${tokenPriceData.error}. Respond to the user's request by explaining this issue in your character's style.`;
              } else if (tokenPriceData.message) {
                dataPrompt = `You checked token prices on ${network} in ${currency} and found: ${tokenPriceData.message}. Respond to the user's request by explaining this in your character's style.`;
              } else {
                // Create a data description for the model
                dataPrompt = `Token prices on ${tokenPriceData.network.charAt(0).toUpperCase() + tokenPriceData.network.slice(1)} in ${tokenPriceData.currency}:\n\n`;
                dataPrompt += `Total tokens available: ${tokenPriceData.tokenCount}\n\n`;
                dataPrompt += `Top tokens (showing ${tokenPriceData.tokens.length}):\n\n`;
                
                tokenPriceData.tokens.forEach((token, index) => {
                  dataPrompt += `${index + 1}. ${token.symbol} (${token.address.substring(0, 6)}...${token.address.substring(38)}): ${token.price}\n`;
                });
                
                dataPrompt += `\nRespond to the user's request about token prices by conveying this information in your character's style. Summarize the token prices in a way that's easy to understand.`;
              }
              
              // Process the tool response
              await processToolResponse(
                ollamaUrl,
                DEFAULT_MODEL,
                dataPrompt,
                character_data,
                userName,
                prompt,
                chat_history,
                enhancedResponse,
                "GetTokenPrices",
                { network, currency },
                tokenPriceResult
              );
            } else {
              // Process as normal gas price request
              const network = args.network?.toLowerCase();
              
              if (!network) {
                console.error('❌ Missing network parameter in GetGasPrice tool call');
                continue;
              }
              
              console.log(`🔧 Executing GetGasPrice tool for network: ${network}`);
              
              // Get the gas price
              const gasPriceResult = await getGasPrice(network);
              
              // Prepare the data in a clean format
              const gasPriceData = prepareGasPriceData(network, gasPriceResult);
              
              // Build a new prompt with the gas price data
              let dataPrompt;
              
              if (gasPriceData.error) {
                dataPrompt = `You tried to check gas prices for ${network} but encountered an error: ${gasPriceData.error}. Respond to the user's request about gas prices by explaining this issue in your character's style.`;
              } else {
                // Create a data description for the model
                dataPrompt = `Current gas prices for ${network.charAt(0).toUpperCase() + network.slice(1)}:\n` +
                  `- Base fee: ${gasPriceData.baseFee}\n` +
                  (gasPriceData.low ? `- Low priority: ${gasPriceData.low}\n` : '') +
                  (gasPriceData.medium ? `- Medium priority: ${gasPriceData.medium}\n` : '') +
                  (gasPriceData.high ? `- High priority: ${gasPriceData.high}\n` : '') +
                  (gasPriceData.instant ? `- Instant: ${gasPriceData.instant}\n` : '') +
                  `\nRespond to the user's request about gas prices by conveying this information in your character's style. Include all the price levels shown above.`;
              }
              
              // Process the tool response
              await processToolResponse(
                ollamaUrl,
                DEFAULT_MODEL,
                dataPrompt,
                character_data,
                userName,
                prompt,
                chat_history,
                enhancedResponse,
                "GetGasPrice",
                { network },
                gasPriceResult
              );
            }
          }
          // Handle GetNFTOwnership tool call (check this first)
          else if (toolCall.name === 'GetNFTOwnership') {
            const args = toolCall.arguments || {};
            const address = args.address;
            const network = args.network?.toLowerCase() || 'ethereum';
            
            if (!address) {
              console.error('❌ Missing address parameter in GetNFTOwnership tool call');
              continue;
            }
            
            console.log(`🔧 Executing GetNFTOwnership tool for address: ${address} on network: ${network}`);
            
            // Get the NFT ownership data
            const nftOwnershipResult = await getNFTOwnership(address, network);
            
            // Prepare the data in a clean format
            const nftOwnershipData = prepareNFTOwnershipData(address, network, nftOwnershipResult);
            
            // Build a new prompt with the NFT ownership data
            let dataPrompt;
            
            if (nftOwnershipData.error) {
              dataPrompt = `You tried to check NFT ownership for address ${address} on ${network} but encountered an error: ${nftOwnershipData.error}. Respond to the user's request by explaining this issue in your character's style.`;
            } else if (nftOwnershipData.message) {
              dataPrompt = `You checked NFT ownership for address ${address} on ${network} and found: ${nftOwnershipData.message}. Respond to the user's request by explaining this in your character's style.`;
            } else {
              // Create a data description for the model
              dataPrompt = `NFT ownership for address ${address} on ${network.charAt(0).toUpperCase() + network.slice(1)}:\n\n`;
              dataPrompt += `Total NFTs found: ${nftOwnershipData.nftCount}\n\n`;
              dataPrompt += `NFTs (showing ${nftOwnershipData.nfts.length}):\n\n`;
              
              nftOwnershipData.nfts.forEach((nft, index) => {
                dataPrompt += `NFT ${index + 1}:\n`;
                dataPrompt += `- Name: ${nft.name}\n`;
                dataPrompt += `- Token ID: ${nft.tokenId}\n`;
                dataPrompt += `- Collection: ${nft.collection}\n`;
                dataPrompt += `- Type: ${nft.schema}\n`;
                dataPrompt += `- Chain ID: ${nft.chainId}\n`;
                if (nft.imageUrl && nft.imageUrl !== 'No image available') {
                  dataPrompt += `- Image: ${nft.imageUrl}\n`;
                }
                dataPrompt += `- Provider: ${nft.provider}\n`;
                dataPrompt += '\n';
              });
              
              dataPrompt += `Respond to the user's request about NFT ownership by conveying this information in your character's style. Summarize the NFT collection in a way that's easy to understand.`;
            }
            
            // Process the tool response
            await processToolResponse(
              ollamaUrl,
              DEFAULT_MODEL,
              dataPrompt,
              character_data,
              userName,
              prompt,
              chat_history,
              enhancedResponse,
              "GetNFTOwnership",
              { address, network },
              nftOwnershipResult
            );
          }
          // Handle GetTokenPrices tool call
          else if (toolCall.name === 'GetTokenPrices') {
            const args = toolCall.arguments || {};
            
            // Handle different parameter formats
            let network, currency;
            
            // Check if chainId is provided instead of network
            if (args.chainId) {
              network = args.chainId;
            } else {
              network = args.network?.toLowerCase() || 'ethereum';
            }
            
            // Check if fromCurrency is provided instead of currency
            if (args.fromCurrency) {
              currency = args.fromCurrency;
            } else {
              currency = args.currency?.toUpperCase() || 'USD';
            }
            
            console.log(`🔧 Executing GetTokenPrices tool for network/chainId: ${network} in currency: ${currency}`);
            
            // Get the token prices
            const tokenPriceResult = await getTokenPrices(network, currency);
            
            // Prepare the data in a clean format
            const tokenPriceData = prepareTokenPriceData(
              typeof tokenPriceResult.network === 'string' ? tokenPriceResult.network : 'unknown', 
              tokenPriceResult.currency || currency, 
              tokenPriceResult
            );
            
            // Build a new prompt with the token price data
            let dataPrompt;
            
            if (tokenPriceData.error) {
              dataPrompt = `You tried to check token prices on ${network} in ${currency} but encountered an error: ${tokenPriceData.error}. Respond to the user's request by explaining this issue in your character's style.`;
            } else if (tokenPriceData.message) {
              dataPrompt = `You checked token prices on ${network} in ${currency} and found: ${tokenPriceData.message}. Respond to the user's request by explaining this in your character's style.`;
            } else {
              // Create a data description for the model
              dataPrompt = `Token prices on ${tokenPriceData.network.charAt(0).toUpperCase() + tokenPriceData.network.slice(1)} in ${tokenPriceData.currency}:\n\n`;
              dataPrompt += `Total tokens available: ${tokenPriceData.tokenCount}\n\n`;
              dataPrompt += `Top tokens (showing ${tokenPriceData.tokens.length}):\n\n`;
              
              tokenPriceData.tokens.forEach((token, index) => {
                dataPrompt += `${index + 1}. ${token.symbol} (${token.address.substring(0, 6)}...${token.address.substring(38)}): ${token.price}\n`;
              });
              
              dataPrompt += `\nRespond to the user's request about token prices by conveying this information in your character's style. Summarize the token prices in a way that's easy to understand.`;
            }
            
            // Process the tool response
            await processToolResponse(
              ollamaUrl,
              DEFAULT_MODEL,
              dataPrompt,
              character_data,
              userName,
              prompt,
              chat_history,
              enhancedResponse,
              "GetTokenPrices",
              { network, currency },
              tokenPriceResult
            );
          }
      }
    } else {
      console.log('🔧 No tool calls found in the response');
        
        // Check if the response text contains a gas price query intent
        const responseText = data.response || '';
        const gasPriceMatch = responseText.match(gasQueryPatterns.intentInResponse);
        const txHistoryMatch = responseText.match(transactionHistoryQueryPatterns.intentInResponse);
        
        // Check if the response text contains an NFT ownership query intent
        const nftOwnershipIntentMatch = responseText.match(nftOwnershipQueryPatterns.intentInResponse);
        
        // Check if the response text contains a token price query intent
        const tokenPriceIntentMatch = responseText.match(tokenPriceQueryPatterns.intentInResponse);
        
        // Handle gas price regex fallback
        if (gasPriceMatch) {
          const network = gasPriceMatch[1].toLowerCase();
          console.log(`🔍 Detected gas price intent in response for network: ${network}`);
          
          // Check if the network is valid
          if (NETWORK_IDS[network]) {
            console.log(`🔧 Using regex fallback to execute GetGasPrice tool for: ${network}`);
            toolCallsFound = true;
            
            // Execute the tool
            const gasPriceResult = await getGasPrice(network);
            
            // Prepare the data in a clean format
            const gasPriceData = prepareGasPriceData(network, gasPriceResult);
            
            // Build a new prompt with the gas price data
            let dataPrompt;
            
            if (gasPriceData.error) {
              dataPrompt = `You tried to check gas prices for ${network} but encountered an error: ${gasPriceData.error}. Respond to the user's request about gas prices by explaining this issue in your character's style.`;
            } else {
              // Create a data description for the model
              dataPrompt = `Current gas prices for ${network.charAt(0).toUpperCase() + network.slice(1)}:\n` +
                `- Base fee: ${gasPriceData.baseFee}\n` +
                (gasPriceData.low ? `- Low priority: ${gasPriceData.low}\n` : '') +
                (gasPriceData.medium ? `- Medium priority: ${gasPriceData.medium}\n` : '') +
                (gasPriceData.high ? `- High priority: ${gasPriceData.high}\n` : '') +
                (gasPriceData.instant ? `- Instant: ${gasPriceData.instant}\n` : '') +
                `\nRespond to the user's request about gas prices by conveying this information in your character's style. Include all the price levels shown above.`;
            }
            
            // Process the tool response
            await processToolResponse(
              ollamaUrl,
              DEFAULT_MODEL,
              dataPrompt,
              character_data,
              userName,
              prompt,
              chat_history,
              enhancedResponse,
              "GetGasPrice",
              { network },
              gasPriceResult
            );
          }
        }
        // Handle transaction history regex fallback
        else if (txHistoryMatch) {
          const address = txHistoryMatch[1];
          const network = txHistoryMatch[2]?.toLowerCase() || 'ethereum';
          console.log(`🔍 Detected transaction history intent in response for address: ${address} on network: ${network}`);
          
          // Execute the tool
          console.log(`🔧 Using regex fallback to execute GetTransactionHistory tool for: ${address} on ${network}`);
          toolCallsFound = true;
          
          const txHistoryResult = await getTransactionHistory(address, network);
          
          // Prepare the data in a clean format
          const txHistoryData = prepareTransactionHistoryData(address, network, txHistoryResult);
          
          // Build a new prompt with the transaction history data
          let dataPrompt;
          
          if (txHistoryData.error) {
            dataPrompt = `You tried to check transaction history for address ${address} on ${network} but encountered an error: ${txHistoryData.error}. Respond to the user's request by explaining this issue in your character's style.`;
          } else if (txHistoryData.message) {
            dataPrompt = `You checked transaction history for address ${address} on ${network} and found: ${txHistoryData.message}. Respond to the user's request by explaining this in your character's style.`;
          } else {
            // Create a data description for the model
            dataPrompt = `Transaction history for address ${address} on ${network.charAt(0).toUpperCase() + network.slice(1)}:\n\n`;
            dataPrompt += `Total transactions found: ${txHistoryData.transactionCount}\n\n`;
            dataPrompt += `Recent transactions (showing ${txHistoryData.recentTransactions.length}):\n\n`;
            
            txHistoryData.recentTransactions.forEach((tx, index) => {
              dataPrompt += `Transaction ${index + 1}:\n`;
              dataPrompt += `- Date: ${tx.date} ${tx.time}\n`;
              dataPrompt += `- Type: ${tx.type}\n`;
              dataPrompt += `- Status: ${tx.status}\n`;
              dataPrompt += `- From: ${tx.from}\n`;
              dataPrompt += `- To: ${tx.to}\n`;
              dataPrompt += `- Transaction Hash: ${tx.txHash}\n`;
              
              if (tx.token) {
                dataPrompt += `- Token: ${tx.token.type}\n`;
                dataPrompt += `- Amount: ${tx.token.amount}\n`;
                dataPrompt += `- Direction: ${tx.token.direction}\n`;
              }
              
              dataPrompt += '\n';
            });
            
            dataPrompt += `Respond to the user's request about transaction history by conveying this information in your character's style. Summarize the recent transactions in a way that's easy to understand.`;
          }
          
          // Process the tool response
          await processToolResponse(
            ollamaUrl,
            DEFAULT_MODEL,
            dataPrompt,
            character_data,
            userName,
            prompt,
            chat_history,
            enhancedResponse,
            "GetTransactionHistory",
            { address, network },
            txHistoryResult
          );
        }
        // Handle NFT ownership regex fallback
        if (nftOwnershipIntentMatch) {
          const address = nftOwnershipIntentMatch[1];
          const network = nftOwnershipIntentMatch[2]?.toLowerCase() || 'ethereum';
          console.log(`🔍 Detected NFT ownership intent in response for address: ${address} on network: ${network}`);
          
          // Execute the tool
          console.log(`🔧 Using regex fallback to execute GetNFTOwnership tool for: ${address} on ${network}`);
          toolCallsFound = true;
          
          const nftOwnershipResult = await getNFTOwnership(address, network);
          
          // Prepare the data in a clean format
          const nftOwnershipData = prepareNFTOwnershipData(address, network, nftOwnershipResult);
          
          // Build a new prompt with the NFT ownership data
          let dataPrompt;
          
          if (nftOwnershipData.error) {
            dataPrompt = `You tried to check NFT ownership for address ${address} on ${network} but encountered an error: ${nftOwnershipData.error}. Respond to the user's request by explaining this issue in your character's style.`;
          } else if (nftOwnershipData.message) {
            dataPrompt = `You checked NFT ownership for address ${address} on ${network} and found: ${nftOwnershipData.message}. Respond to the user's request by explaining this in your character's style.`;
          } else {
            // Create a data description for the model
            dataPrompt = `NFT ownership for address ${address} on ${network.charAt(0).toUpperCase() + network.slice(1)}:\n\n`;
            dataPrompt += `Total NFTs found: ${nftOwnershipData.nftCount}\n\n`;
            dataPrompt += `NFTs (showing ${nftOwnershipData.nfts.length}):\n\n`;
            
            nftOwnershipData.nfts.forEach((nft, index) => {
              dataPrompt += `NFT ${index + 1}:\n`;
              dataPrompt += `- Name: ${nft.name}\n`;
              dataPrompt += `- Token ID: ${nft.tokenId}\n`;
              dataPrompt += `- Collection: ${nft.collection}\n`;
              dataPrompt += `- Type: ${nft.schema}\n`;
              dataPrompt += `- Chain ID: ${nft.chainId}\n`;
              if (nft.imageUrl && nft.imageUrl !== 'No image available') {
                dataPrompt += `- Image: ${nft.imageUrl}\n`;
              }
              dataPrompt += `- Provider: ${nft.provider}\n`;
              dataPrompt += '\n';
            });
            
            dataPrompt += `Respond to the user's request about NFT ownership by conveying this information in your character's style. Summarize the NFT collection in a way that's easy to understand.`;
          }
          
          // Process the tool response
          await processToolResponse(
            ollamaUrl,
            DEFAULT_MODEL,
            dataPrompt,
            character_data,
            userName,
            prompt,
            chat_history,
            enhancedResponse,
            "GetNFTOwnership",
            { address, network },
            nftOwnershipResult
          );
        }
        // Handle token price regex fallback
        if (tokenPriceIntentMatch) {
          const network = tokenPriceIntentMatch[1]?.toLowerCase() || 'ethereum';
          const currency = tokenPriceIntentMatch[2]?.toUpperCase() || 'USD';
          console.log(`🔍 Detected token price intent in response for network: ${network} in currency: ${currency}`);
          
          // Execute the tool
          console.log(`🔧 Using regex fallback to execute GetTokenPrices tool for: ${network} in ${currency}`);
          toolCallsFound = true;
          
          const tokenPriceResult = await getTokenPrices(network, currency);
          
          // Prepare the data in a clean format
          const tokenPriceData = prepareTokenPriceData(network, currency, tokenPriceResult);
          
          // Build a new prompt with the token price data
          let dataPrompt;
          
          if (tokenPriceData.error) {
            dataPrompt = `You tried to check token prices on ${network} in ${currency} but encountered an error: ${tokenPriceData.error}. Respond to the user's request by explaining this issue in your character's style.`;
          } else if (tokenPriceData.message) {
            dataPrompt = `You checked token prices on ${network} in ${currency} and found: ${tokenPriceData.message}. Respond to the user's request by explaining this in your character's style.`;
          } else {
            // Create a data description for the model
            dataPrompt = `Token prices on ${network.charAt(0).toUpperCase() + network.slice(1)} in ${currency}:\n\n`;
            dataPrompt += `Total tokens available: ${tokenPriceData.tokenCount}\n\n`;
            dataPrompt += `Top tokens (showing ${tokenPriceData.tokens.length}):\n\n`;
            
            tokenPriceData.tokens.forEach((token, index) => {
              dataPrompt += `${index + 1}. ${token.symbol} (${token.address.substring(0, 6)}...${token.address.substring(38)}): ${token.price}\n`;
            });
            
            dataPrompt += `\nRespond to the user's request about token prices by conveying this information in your character's style. Summarize the token prices in a way that's easy to understand.`;
          }
          
          // Process the tool response
          await processToolResponse(
            ollamaUrl,
            DEFAULT_MODEL,
            dataPrompt,
            character_data,
            userName,
            prompt,
            chat_history,
            enhancedResponse,
            "GetTokenPrices",
            { network, currency },
            tokenPriceResult
          );
        }
      }
      
      // Process the response to clean up any AI framing language if no tool was used
      if (!toolCallsFound) {
    let cleanedResponse = cleanRoleplayResponse(data.response, character_data.name);
    
    // Log a preview of the response for debugging
    const responsePreview = cleanedResponse.length > 100 
      ? cleanedResponse.substring(0, 100) + '...'
      : cleanedResponse;
    console.log('👤 Cleaned roleplay response preview:', responsePreview);
    
        enhancedResponse.response = cleanedResponse;
      }
    
    // Check if the response contains a JSON tool call in the text
    if (!toolCallsFound) {
      const jsonResult = await handleJsonInTextResponse(
        enhancedResponse.response,
        ollamaUrl,
        DEFAULT_MODEL,
        character_data,
        userName,
        prompt,
        chat_history
      );
      
      if (jsonResult.processed) {
        console.log('✅ Successfully processed JSON tool call in text response');
        Object.assign(enhancedResponse, jsonResult.response);
        toolCallsFound = true;
      }
    }
    
    return response.send(enhancedResponse);
    }
  } catch (error) {
    console.error('❌ Ollama roleplay error:', error);
    return response.status(500).send({ error: error.message });
  }
});

// Helper function to process Ollama requests
async function processOllamaRequest(ollamaUrl, model, prompt, stream = false, options = {}, characterName = null, toolName = "", toolArgs = {}, toolResult = null) {
  // Add temperature if not provided to help with creative roleplay responses
  if (!options.temperature) {
    options.temperature = 0.7;
  }
  
  // Add tools to the options if not already present
  // Create a properly typed options object
  let updatedOptions = { 
    ...options,
    function_calling: options.function_calling !== false ? true : false,
    tools: Array.isArray(options.tools) ? [...options.tools] : []
  };
  
  // Only add tools if function calling is enabled
  if (updatedOptions.function_calling) {
    // Add gas price tool if not already present
    if (!updatedOptions.tools.some(tool => tool.function?.name === 'GetGasPrice')) {
      updatedOptions.tools.push(gasPriceTool);
    }
    
    // Add transaction history tool if not already present
    if (!updatedOptions.tools.some(tool => tool.function?.name === 'GetTransactionHistory')) {
      updatedOptions.tools.push(transactionHistoryTool);
    }
    
    // Add NFT ownership tool if not already present
    if (!updatedOptions.tools.some(tool => tool.function?.name === 'GetNFTOwnership')) {
      updatedOptions.tools.push(nftOwnershipTool);
    }
    
    // Add token price tool if not already present
    if (!updatedOptions.tools.some(tool => tool.function?.name === 'GetTokenPrices')) {
      updatedOptions.tools.push(tokenPriceTool);
    }
  }
  
  // Create the request
  const ollamaRequest = {
    model: model,
    prompt: prompt,
    stream: stream,
    options: updatedOptions
  };
  
  console.log('🚀 Sending request to Ollama with model:', model);
  
  // Send the request to Ollama
  const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ollamaRequest),
  });
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
    console.error('❌ Ollama request error:', ollamaResponse.status, errorText);
    throw new Error(`Ollama request failed: ${errorText}`);
    }
    
  // Parse the response
    const data = await ollamaResponse.json();
  console.log('✅ Ollama response received');
  
  // Create the enhanced response
  const enhancedResponse = {
    ...data,
    character_name: characterName
  };
  
  // Add tool information if provided
  if (toolName) {
    enhancedResponse.tool_used = toolName;
    enhancedResponse.tool_args = toolArgs;
    enhancedResponse.tool_response = toolResult;
  }
  
  // Clean the response if a character name is provided
  if (characterName) {
    enhancedResponse.response = cleanRoleplayResponse(data.response, characterName);
  }
  
  return enhancedResponse;
}

// Helper function to process tool responses
async function processToolResponse(ollamaUrl, model, dataPrompt, character_data, userName, prompt, chat_history, enhancedResponse, toolName, toolArgs, toolResult) {
  // Create a new prompt for the model to generate a response with the data
  const dataRoleplayPrompt = buildRoleplayPromptWithData(
    character_data, 
    userName, 
    prompt, 
    chat_history,
    dataPrompt
  );
  
  // Send a new request to generate a response with the data
  const dataOllamaRequest = {
    model: model,
    prompt: dataRoleplayPrompt,
    stream: false,
    options: {
      temperature: 0.7,
      top_p: 0.9,
      function_calling: false // Disable function calling for the follow-up request
    }
  };
  
  console.log(`🚀 Sending follow-up request with ${toolName} data to Ollama`);
  
  const dataOllamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dataOllamaRequest),
  });
  
  if (!dataOllamaResponse.ok) {
    console.error(`❌ Failed to generate response with ${toolName} data`);
    // Continue with the original response
  } else {
    // Use the new response
    const dataResponseJson = await dataOllamaResponse.json();
    const cleanedDataResponse = cleanRoleplayResponse(dataResponseJson.response, character_data.name);
    
    // Replace the model's response with the new one
    enhancedResponse.response = cleanedDataResponse;
    enhancedResponse.tool_used = toolName;
    enhancedResponse.tool_args = toolArgs;
    enhancedResponse.tool_response = toolResult;
  }
}

// Get available models
router.get('/models', async (request, response) => {
  try {
    console.log('⚡ Received models request');
    const ollamaUrl = 'http://127.0.0.1:11434';
    
    // Forward the request to Ollama
    const ollamaResponse = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('❌ Ollama models error:', ollamaResponse.status, errorText);
      return response.status(ollamaResponse.status).send(errorText);
    }
    
    // Return the Ollama response
    const data = await ollamaResponse.json();
    console.log('✅ Ollama models response received');
    
    return response.send(data);
  } catch (error) {
    console.error('❌ Ollama models error:', error);
    return response.status(500).send({ error: error.message });
  }
});

// Update the handleJsonInTextResponse function to handle more parameter variations
async function handleJsonInTextResponse(response, ollamaUrl, model, character_data, userName, prompt, chat_history) {
  // Check if the response looks like a JSON tool call
  const jsonRegex = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^}]+\})\s*\}/;
  const match = response.match(jsonRegex);
  
  if (match) {
    console.log('🔍 Detected JSON tool call in text response:', match[0]);
    const toolName = match[1];
    let toolArgs;
    
    try {
      toolArgs = JSON.parse(match[2]);
    } catch (error) {
      console.error('❌ Failed to parse tool arguments:', error);
      return { processed: false };
    }
    
    console.log(`🔧 Extracted tool call: ${toolName} with args:`, toolArgs);
    
    // Create an enhanced response object
    const enhancedResponse = {
      character_name: character_data.name
    };
    
    // Handle token price requests (regardless of what the model calls them)
    if ((toolName === 'GetTokenPrice' || toolName === 'GetTokenPrices' || 
         (toolName === 'GetGasPrice' && (toolArgs.currency || toolArgs.fromCurrency))) ||
         toolName === 'GetTokenPrice') {
      
      // Extract network parameter (handle different parameter names)
      let network = 'ethereum'; // Default
      if (toolArgs.network) network = toolArgs.network;
      else if (toolArgs.tokenName) network = toolArgs.tokenName;
      else if (toolArgs.chain) network = toolArgs.chain;
      else if (toolArgs.chainId) network = toolArgs.chainId;
      
      // Extract currency parameter (handle different parameter names)
      let currency = 'USD'; // Default
      if (toolArgs.currency) currency = toolArgs.currency;
      else if (toolArgs.fromCurrency) currency = toolArgs.fromCurrency;
      
      console.log(`🔧 Processing token price request for network: ${network} in currency: ${currency}`);
      
      // Get the token prices
      const tokenPriceResult = await getTokenPrices(network, currency);
      
      // Prepare the data in a clean format
      const tokenPriceData = prepareTokenPriceData(
        typeof tokenPriceResult.network === 'string' ? tokenPriceResult.network : 'unknown',
        tokenPriceResult.currency || currency,
        tokenPriceResult
      );
      
      // Build a new prompt with the token price data
      let dataPrompt;
      
      if (tokenPriceData.error) {
        dataPrompt = `You tried to check token prices on ${network} in ${currency} but encountered an error: ${tokenPriceData.error}. Respond to the user's request by explaining this issue in your character's style.`;
      } else if (tokenPriceData.message) {
        dataPrompt = `You checked token prices on ${network} in ${currency} and found: ${tokenPriceData.message}. Respond to the user's request by explaining this in your character's style.`;
      } else {
        // Create a data description for the model
        dataPrompt = `Token prices on ${tokenPriceData.network.charAt(0).toUpperCase() + tokenPriceData.network.slice(1)} in ${tokenPriceData.currency}:\n\n`;
        dataPrompt += `Total tokens available: ${tokenPriceData.tokenCount}\n\n`;
        dataPrompt += `Top tokens (showing ${tokenPriceData.tokens.length}):\n\n`;
        
        tokenPriceData.tokens.forEach((token, index) => {
          dataPrompt += `${index + 1}. ${token.symbol} (${token.address.substring(0, 6)}...${token.address.substring(38)}): ${token.price}\n`;
        });
        
        dataPrompt += `\nRespond to the user's request about token prices by conveying this information in your character's style. Summarize the token prices in a way that's easy to understand.`;
      }
      
      // Process the tool response
      await processToolResponse(
        ollamaUrl,
        model,
        dataPrompt,
        character_data,
        userName,
        prompt,
        chat_history,
        enhancedResponse,
        "GetTokenPrices",
        { network, currency },
        tokenPriceResult
      );
      
      return { processed: true, response: enhancedResponse };
    }
    
    // Add handlers for other tool types if needed
  }
  
  return { processed: false };
}

export default router;