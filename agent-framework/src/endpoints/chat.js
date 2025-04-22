import express from 'express';
import { isCallerOwner } from '../utils/api-key-verifier.js';
import { getAgentCharacter } from '../utils/agent-fetcher.js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { uploadJsonToAkave, getJsonFromAkave } from '../utils/akave-storage.js';
import { formatAddressForViem } from '../utils/address-utils.js';

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
import { FRANKY_ABI, TFIL_NATIVE_CHAIN } from '../constants.js';
import { createPublicClient } from 'viem';
import { base, filecoinCalibration } from 'viem/chains';
import { http } from 'viem';
import { ethers } from 'ethers';

// Load environment variables
dotenv.config();

export const router = express.Router();

// Default model to use if not specified
const DEFAULT_MODEL = 'qwen2.5:3b';

// Lilypad API configuration
const LILYPAD_ENDPOINT = "https://anura-testnet.lilypad.tech/api/v1/chat/completions";
const LILYPAD_TOKEN = process.env.LILYPAD_API_TOKEN || process.env.LILYPAD_API_KEY; // Try both environment variable names
const REQUEST_TIMEOUT = 60000; // 60 seconds (matching Python's 60)
const MAX_RETRIES = 3; // Match Python implementation
const REQUEST_DELAY = 2000; // 2 seconds (matching Python's 2)

// Session storage for streaming updates (similar to Python's active_sessions)
const activeLilypadSessions = {};

// Model configuration for Lilypad (matching Python MODELS dictionary)
const LILYPAD_MODELS = {
  explanation: "deepseek-r1:7b",
  critique: "phi4:14b",
  optimization: "mistral:7b",
  orchestrator: "llama3.1:8b",
  coding: "qwen2.5-coder:7b",
  math: "mistral:7b",
  creative: "openthinker:7b",
  default: "llama3.1:8b"
};

// Tools configuration for Lilypad (matching Python TOOLS)
const LILYPAD_TOOLS = [
  {
    type: "function",
    function: {
      name: "route_to_model",
      description: "Route a subtask to the appropriate specialized model",
      parameters: {
        type: "object",
        properties: {
          task_type: {
            type: "string",
            enum: Object.keys(LILYPAD_MODELS).filter(key => key !== "orchestrator" && key !== "default"),
            description: "Type of subtask"
          },
          query: {
            type: "string",
            description: "The specific subtask query"
          }
        },
        required: ["task_type", "query"]
      }
    }
  }
];

/**
 * StreamLogger equivalent for JavaScript
 */
class StreamLogger {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.buffer = [];
    
    // Initialize session if it doesn't exist
    if (!activeLilypadSessions[sessionId]) {
      activeLilypadSessions[sessionId] = {
        logs: [],
        status: "processing",
        startTime: Date.now()
      };
    }
  }
  
  /**
   * Log a message with timestamp
   * @param {string} step - The step description
   * @param {string|object} data - The data to log
   * @param {string} level - The log level (INFO, WARNING, ERROR)
   */
  log(step, data, level = "INFO") {
    const timestamp = new Date().toISOString();
    let message;
    
    if (typeof data === 'string') {
      message = `\n[${timestamp} ${level}] ${step}:\n${data}`;
    } else {
      message = `\n[${timestamp} ${level}] ${step}:\n${JSON.stringify(data, null, 2)}`;
    }
    
    this.buffer.push(message);
    
    // Update active session
    if (activeLilypadSessions[this.sessionId]) {
      activeLilypadSessions[this.sessionId].logs.push(message);
    }
    
    // Also log to console for server-side visibility
    if (level === "ERROR") {
      console.error(message);
    } else if (level === "WARNING") {
      console.warn(message);
    } else {
      console.log(message);
    }
  }
  
  /**
   * Get all logged updates as a single string
   * @returns {string} - The combined log messages
   */
  getUpdates() {
    return this.buffer.join("");
  }
}

// Helper function to ensure an address is properly formatted as a hex string
function formatAsHexString(address) {
  if (!address || typeof address !== 'string') {
    console.error('❌ Invalid address:', address);
    return null;
  }
  
  // Remove any non-hex characters and ensure it starts with 0x
  let cleanAddress = address.toLowerCase().trim();
  if (!cleanAddress.startsWith('0x')) {
    cleanAddress = '0x' + cleanAddress;
  }
  
  // Validate that it's a 42-character Ethereum address (0x + 40 hex characters)
  if (/^0x[0-9a-f]{40}$/i.test(cleanAddress)) {
    return cleanAddress;
  } else {
    console.error('❌ Invalid address format:', address);
    return null;
  }
}

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
    const { status, caller } = await isCallerOwner(agentId, apiKey);

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
router.post('/', async (request, response) => {
  try {
    console.log('⚡ Received chat request');
    const ollamaUrl = 'http://127.0.0.1:11434';
    
    // Check if Lilypad should be used
    const isLilypad = request.headers['islilypad'] === 'true';
    console.log(`🔄 Request mode: ${isLilypad ? 'Lilypad' : 'Ollama'}`);

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
    const { status, caller } = await isCallerOwner(agentId, apiKey); // Pass null for ownerKeyHash

    if (status == 0) {
      console.error('❌ Invalid API key or agent ID');
      return response.status(401).send({ error: 'Invalid API key or agent ID' });
    }
    console.log(`✅ API key verification successful`);

    // Get the prompt and chat history name from request body
    const { prompt, history } = request.body;
    if (!prompt) {
      return response.status(400).send({ error: 'Prompt is required in request body' });
    }

    // Initialize chat history
    let chat_history = [];
    let historyFileName;

    // Check if a history ID was provided - if so, fetch it from Akave
    if (history) {
      console.log(`🔄 Fetching previous chat history with ID: ${history}`);
      const historyResult = await getJsonFromAkave(history);
      
      if (historyResult.success && historyResult.data) {
        chat_history = historyResult.data.chat_history || [];
        console.log(`✅ Retrieved chat history with ${chat_history.length} messages`);
      } else {
        console.error(`❌ Failed to retrieve chat history with ID: ${history}`);
        // Continue with empty chat history
      }
      } else {
      console.log(`ℹ️ No history ID provided, starting new conversation`);
    }

    // Continue with payment processing if needed
    try {
      if (status == 1 && perApiCallAmount > 0) {
        console.log(`💰 Processing payment: ${perApiCallAmount} TFIL`);

        // Create a public client for Filecoin Calibration testnet
        const filecoinClient = createPublicClient({
          chain: filecoinCalibration,
          transport: http()
        });

        // Get the caller's balance
        const formattedCallerAddress = formatAddressForViem(caller);
        const formattedAgentOwnerAddress = formatAddressForViem(agentOwner);
        
        if (!formattedCallerAddress) {
          console.error('❌ Invalid caller address format, cannot process payment');
          return response.status(400).send({ error: 'Invalid caller address format' });
        }
        
        if (!formattedAgentOwnerAddress) {
          console.error('❌ Invalid agent owner address format, cannot process payment');
          return response.status(400).send({ error: 'Invalid agent owner address format' });
        }

        try {
          // Convert the string to a properly formatted hex string for viem
          let validCallerAddress = formattedCallerAddress;
          let validOwnerAddress = formattedAgentOwnerAddress;
          
          // Check if addresses are in proper format for viem
          if (!/^0x[0-9a-f]{40}$/i.test(validCallerAddress)) {
            console.error(`❌ Caller address format not compatible with viem: ${validCallerAddress}`);
            return response.status(400).send({ error: 'Invalid caller address format' });
          }
          
          if (!/^0x[0-9a-f]{40}$/i.test(validOwnerAddress)) {
            console.error(`❌ Owner address format not compatible with viem: ${validOwnerAddress}`);
            return response.status(400).send({ error: 'Invalid owner address format' });
          }
          
          // Get caller balance
          const callerBalance = await filecoinClient.getBalance({
            address: validCallerAddress
          });
          
          // Convert perApiCallAmount to BigInt for comparison (assuming it's in TFIL)
          const paymentAmount = BigInt(Math.floor(perApiCallAmount * 1e18)); // Convert to attoFIL (10^18)

          console.log(`💰 Caller balance: ${callerBalance} attoFIL`);
          console.log(`💰 Required payment: ${paymentAmount} attoFIL`);

          // Check if the caller has enough balance
          if (callerBalance < paymentAmount) {
            console.error(`❌ Insufficient balance: ${callerBalance} < ${paymentAmount}`);
            return response.status(402).send({ 
              error: 'Insufficient balance', 
              balance: callerBalance.toString(),
              required: paymentAmount.toString() 
            });
          }
          
          // Construct transaction to send TFIL from caller to agent owner
          const privateKey = process.env.PRIVATE_KEY;
          if (!privateKey) {
            console.error('❌ No device private key available for transaction signing');
            return response.status(500).send({ error: 'Payment processing error' });
          }
          
          try {
            // Create wallet from private key
            console.log(`🔐 Creating wallet for transaction`);
            const wallet = new ethers.Wallet(privateKey, 
              new ethers.providers.JsonRpcProvider(filecoinCalibration.rpcUrls.default.http[0]));
            
            // Get current gas price
            const gasPrice = await wallet.provider.getGasPrice();
            console.log(`⛽ Current gas price: ${gasPrice.toString()}`);
            
            // Estimate gas for the transaction
            const gasLimit = ethers.BigNumber.from(21000); // Standard gas limit for transfer
            
            // Create and sign transaction
            console.log(`📝 Creating transaction from ${validCallerAddress} to ${validOwnerAddress}`);
            const tx = {
              from: validCallerAddress,
              to: validOwnerAddress,
              value: ethers.BigNumber.from(paymentAmount.toString()),
              gasPrice: gasPrice,
              gasLimit: gasLimit,
              nonce: await wallet.provider.getTransactionCount(validCallerAddress, "latest")
            };
            
            // Send transaction
            console.log(`🚀 Sending transaction`);
            const signedTx = await wallet.signTransaction(tx);
            const txResponse = await wallet.provider.sendTransaction(signedTx);
            
            // Wait for transaction to be mined
            console.log(`⏳ Waiting for transaction to be mined: ${txResponse.hash}`);
            const receipt = await txResponse.wait();
            
            if (receipt.status === 1) {
              console.log(`✅ Payment successful! Transaction hash: ${txResponse.hash}`);
              
              // Store transaction in a payment log or database if needed
              // This would be expanded in a production environment
              
      } else {
              console.error(`❌ Transaction failed with status: ${receipt.status}`);
              return response.status(500).send({ 
                error: 'Payment transaction failed',
                txHash: txResponse.hash
              });
            }
          } catch (txError) {
            console.error(`❌ Transaction error: ${txError.message}`);
            return response.status(500).send({ 
              error: 'Payment transaction error',
              message: txError.message
            });
          }
        } catch (balanceError) {
          console.error(`❌ Error getting balance: ${balanceError.message}`);
          return response.status(500).send({ error: 'Failed to verify balance' });
        }
      }

      console.log(`🎭 Using character "${character_data.name}" from agent data`);
    } catch (paymentError) {
      console.error(`❌ Payment processing error: ${paymentError.message}`);
      // Continue even if payment fails - log error but don't block the request
    }

    // Check if we should use Lilypad instead of Ollama
    if (isLilypad) {
      console.log(`🌸 Using Lilypad for processing request`);
      const userName = request.body.user_name || 'User';
      
      try {
        // Process the request using Lilypad
        const lilypadResponse = await processLilypadRequest(prompt, character_data, userName);
        
        console.log(`🌸 Lilypad processing complete`);
        
        // Add the user's message to chat history
        chat_history.push({ role: 'user', content: prompt });
        
        // Add the assistant's response to chat history
        chat_history.push({ role: 'assistant', content: lilypadResponse.response });
        
        // Save the updated chat history to Akave
        const { fileName, success } = await uploadJsonToAkave({ chat_history });
        if (success) {
          console.log(`✅ Chat history saved with ID: ${fileName}`);
          
          // Add the history ID to the response
          return response.send({
            ...lilypadResponse,
            history: fileName
          });
            } else {
          console.error(`❌ Failed to save chat history`);
          return response.send(lilypadResponse);
        }
      } catch (lilypadError) {
        console.error(`❌ Lilypad processing error: ${lilypadError.message}`);
        // Fall back to Ollama if Lilypad fails
        console.log(`⚠️ Falling back to Ollama due to Lilypad error`);
        // Continue with Ollama processing
      }
    }
    
    // If not using Lilypad, continue with Ollama processing
    console.log(`🔄 Processing with Ollama`);
    
    // Build a roleplay prompt with the chat history
    const roleplayPrompt = buildRoleplayPrompt(
                character_data,
      request.body.user_name || 'User',
                prompt,
      chat_history
    );
    
    // Process the request using Ollama
    const model = request.body.model || DEFAULT_MODEL;
    const ollamaResponse = await processOllamaRequest(
                ollamaUrl,
      model,
      roleplayPrompt,
      false,
      { temperature: 0.7 },
      character_data.name
    );
    
    // Check if the response contains a JSON tool call in the text
    const jsonInTextResult = await handleJsonInTextResponse(
      ollamaResponse.response,
              ollamaUrl,
      model,
              character_data,
      request.body.user_name || 'User',
              prompt,
      chat_history
    );
    
    let finalResponse;
    if (jsonInTextResult.processed) {
      finalResponse = jsonInTextResult.response;
            } else {
      finalResponse = ollamaResponse;
    }
    
    // Add the user's message to chat history
    chat_history.push({ role: 'user', content: prompt });
    
    // Add the assistant's response to chat history
    chat_history.push({ 
      role: 'assistant', 
      content: finalResponse.response
    });
    
    // Save the updated chat history to Akave
    const { fileName, success } = await uploadJsonToAkave({ chat_history });
    if (success) {
      console.log(`✅ Chat history saved with ID: ${fileName}`);
      
      // Add the history ID to the response
      return response.send({
        ...finalResponse,
        history: fileName
      });
          } else {
      console.error(`❌ Failed to save chat history`);
      return response.send(finalResponse);
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

// Lilypad integration functions

/**
 * Call a model through the Lilypad API
 * @param {string} model - The model to use
 * @param {Array} messages - The messages to send to the model
 * @param {Array} tools - Optional tools to use
 * @param {number} temperature - The temperature for generation
 * @param {StreamLogger|null} logger - Optional logger
 * @returns {Promise<Object>} - The model response
 */
async function callLilypadModel(model, messages, tools = [], temperature = 0.2, logger = null) {
  // Note: There are TypeScript errors in the codebase related to string vs `0x${string}` types
  // These are inherited from the existing codebase and would require more significant refactoring to fix
  
  // Validate parameters
  if (!model || !messages || !Array.isArray(messages)) {
    console.error("❌ Invalid parameters for callLilypadModel");
    return null;
  }
  
  const headers = {
    "Authorization": `Bearer ${LILYPAD_TOKEN}`,
    "Content-Type": "application/json"
  };
  
  const payload = {
    model: model,
    messages: messages,
    stream: false,
    temperature: temperature
  };
  
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  
  if (logger && typeof logger.log === 'function') {
    logger.log(`Calling ${model}`, { input: messages });
  } else {
    console.log(`🌸 Calling Lilypad model ${model}`);
  }
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY * attempt));
        if (logger) {
          logger.log(`Retry attempt ${attempt + 1}`, "", "INFO");
        }
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const response = await fetch(LILYPAD_ENDPOINT, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        if (logger) {
          logger.log(`Response from ${model}`, result);
        } else {
          console.log(`✅ Response received from Lilypad model ${model}`);
        }
        return result.choices[0].message;
      } else {
        const errorText = await response.text();
        if (logger) {
          logger.log(`API Error from ${model}`, `Status ${response.status}: ${errorText}`, "ERROR");
        } else {
          console.error(`❌ Lilypad API Error (${response.status}): ${errorText}`);
        }
      }
    } catch (error) {
      const errorMessage = error.name === 'AbortError' 
        ? `Timeout after ${REQUEST_TIMEOUT/1000} seconds` 
        : error.message;
      
      if (logger) {
        logger.log(`Error with ${model}`, errorMessage, "ERROR");
      } else {
        console.error(`❌ Lilypad request error (attempt ${attempt + 1}):`, errorMessage);
      }
    }
  }
  
  if (logger) {
    logger.log(`Failed all ${MAX_RETRIES} attempts with ${model}`, "", "ERROR");
  } else {
    console.error(`❌ Failed all ${MAX_RETRIES} attempts with Lilypad model ${model}`);
  }
  return null;
}

/**
 * Extract JSON from a response text - matches Python implementation with same fallbacks
 * @param {string} content - The text content
 * @returns {Object|null} - The extracted JSON or null if extraction failed
 */
function extractJsonFromResponse(content) {
  if (!content) return null;
  
  try {
    return JSON.parse(content);
  } catch (error) {
    // Try to extract JSON from code blocks (same as Python)
    const jsonMatch = content.match(/```(?:json)?\n({.*?})\n```/s);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (error) {
        // Ignore and try next method
      }
    }
    
    // Try to find a JSON object in the text (same as Python)
    const objectMatch = content.match(/{(?:[^{}]|{[^{}]*})*}/s);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (error) {
        // Ignore and return null
      }
    }
  }
  
  return null;
}

/**
 * Detect the task type based on the query (same patterns as Python implementation)
 * @param {string} query - The user query
 * @returns {string} - The detected task type
 */
function detectTaskType(query) {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes("story") || queryLower.includes("narrative") || 
      queryLower.includes("poem") || queryLower.includes("creative")) {
    return "creative";
  }
  if (queryLower.includes("code") || queryLower.includes("implement")) {
    return "coding";
  }
  if (queryLower.includes("math") || queryLower.includes("equation") || 
      queryLower.includes("formula")) {
    return "math";
  }
  if (queryLower.includes("explain") || queryLower.includes("how to")) {
    return "explanation";
  }
  if (queryLower.includes("critique") || queryLower.includes("analyze") || 
      queryLower.includes("issues")) {
    return "critique";
  }
  if (queryLower.includes("optimize") || queryLower.includes("improve")) {
    return "optimization";
  }
  if (queryLower.includes("calculate") || queryLower.includes("solve")) {
    return "math";
  }
  if (queryLower.includes("wrong") || queryLower.includes("problem")) {
    return "critique";
  }
  
  return "default";
}

/**
 * Orchestrate a query using Lilypad (matches Python orchestrate_query function)
 * @param {string} query - The user query
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} - The orchestration result
 */
async function orchestrateQuery(query, sessionId) {
  const logger = new StreamLogger(sessionId);
  logger.log("Starting orchestration", { query });
  
  if (query.split(" ").length < 3) {
    return { direct_response: true };
  }
  
  const systemPrompt = `You are an AI task router. Analyze the user query and return JSON specifying which specialized models to use. The JSON should have this structure:
{
  "subtasks": [
    {
      "task_type": "task_category",
      "query": "specific_question",
      "recommended_model": "model_name"
    }
  ]
}

Available task categories: coding, math, explanation, critique, optimization, creative

IMPORTANT: 
1. Return ONLY valid JSON
2. Use double quotes
3. Break down complex queries into separate subtasks
4. Match each subtask to the most specialized model

MOST IMPORTANT: You need to SIMPLY grab the ENTIRE response returned from Multiple models in the end and display them while summarising the results`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: query }
  ];
  
  const response = await callLilypadModel(LILYPAD_MODELS.orchestrator, messages, [], 0.2, logger);
  
  if (!response) {
    return { error: "Orchestration failed" };
  }
  
  const jsonData = extractJsonFromResponse(response.content);
  if (jsonData) {
    logger.log("Parsed subtasks", jsonData);
    return jsonData;
  }
  
  logger.log("JSON extraction failed, using task detection", "", "WARNING");
  const detectedType = detectTaskType(query);
  
  return {
    subtasks: [{
      task_type: detectedType,
      query: query,
      recommended_model: LILYPAD_MODELS[detectedType] || LILYPAD_MODELS.default
    }]
  };
}

/**
 * Execute a model task using Lilypad (matches Python execute_model_task function)
 * @param {string} taskType - The type of task
 * @param {string} query - The query to process
 * @param {string} sessionId - The session ID
 * @returns {Promise<string|null>} - The model response content
 */
async function executeModelTask(taskType, query, sessionId) {
  const logger = new StreamLogger(sessionId);
  logger.log(`Executing ${taskType.toUpperCase()} task`, { query });
  
  const model = LILYPAD_MODELS[taskType] || LILYPAD_MODELS.default;
  const messages = [{ role: "user", content: query }];
  
  const response = await callLilypadModel(model, messages, [], 0.2, logger);
  return response ? response.content : null;
}

/**
 * Execute a function with a timeout
 * @param {Function} fn - The function to execute
 * @param {number} timeoutMs - The timeout in milliseconds
 * @returns {Promise<any>} - The result of the function
 */
async function executeWithTimeout(fn, timeoutMs = 120000) {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs/1000} seconds`));
    }, timeoutMs);
    
    try {
      const result = await fn();
      clearTimeout(timeoutId);
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Process a query using Lilypad's multi-model approach (matches Python process_query_stream function)
 * @param {string} userQuery - The user query
 * @param {object} characterData - Character data for roleplay
 * @param {string} userName - The user's name
 * @returns {Promise<object>} - The processed response
 */
async function processLilypadRequest(userQuery, characterData, userName) {
  const sessionId = uuidv4();
  console.log(`🌸 Processing Lilypad request: ${userQuery} (Session ID: ${sessionId})`);
  
  const logger = new StreamLogger(sessionId);
  const usedModels = new Set();
  const results = [];
  
  // Record start time separately to avoid session data issues
  const startTime = Date.now();
  
  try {
    // Initialize session data
    activeLilypadSessions[sessionId] = {
      logs: [],
      status: "processing",
      startTime: startTime
    };
    
    // Step 1: Orchestration
    logger.log("==== PROCESSING STARTED ====", `Query: ${userQuery}`);
    const orchestration = await executeWithTimeout(() => orchestrateQuery(userQuery, sessionId));
    usedModels.add(LILYPAD_MODELS.orchestrator);
    
    if ("direct_response" in orchestration) {
      // Simple queries get a direct response - no changes needed here
      logger.log("Using direct response for simple query", "");
      
      // Create a character-tailored system prompt for simple queries
      const systemPrompt = `You are ${characterData.name}, a character with the following personality: ${characterData.personality}. 
      You're in a scenario where: ${characterData.scenario || "You're having a conversation."}
      Respond to the user (${userName}) in your character's voice.`;
      
      const response = await callLilypadModel(
        LILYPAD_MODELS.default,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery }
        ],
        [],
        0.7,
        logger
      );
      
      usedModels.add(LILYPAD_MODELS.default);
      
      if (!response) {
        throw new Error("Failed to generate direct response");
      }
      
      // Clean and return the response
      const cleanedResponse = cleanRoleplayResponse(response.content, characterData.name);
      
      return {
        response: cleanedResponse,
        character_name: characterData.name,
        models_used: Array.from(usedModels),
        processing_time: `${(Date.now() - startTime) / 1000} seconds`
      };
    }
    
    if ("error" in orchestration) {
      logger.log("Orchestration error", orchestration.error, "ERROR");
      throw new Error(orchestration.error);
    }
    
    if (!orchestration.subtasks || !orchestration.subtasks.length) {
      logger.log("No subtasks generated", "", "ERROR");
      throw new Error("Failed to generate subtasks");
    }
    
    // Step 2: Execute subtasks with better timeout handling
    // Process subtasks in parallel to improve performance
    const subtaskPromises = orchestration.subtasks.map(async (subtask) => {
      const taskType = subtask.task_type || "default";
      const taskQuery = subtask.query;
      
      logger.log(`SCHEDULING ${taskType.toUpperCase()}`, { query: taskQuery });
      
      try {
        const messages = [
          { role: "system", content: `Route this ${taskType} task` },
          { role: "user", content: taskQuery }
        ];
        
        // Use a shorter timeout for routing to keep things moving
        const routingResponse = await executeWithTimeout(() => 
          callLilypadModel(
            LILYPAD_MODELS.orchestrator,
            messages,
            LILYPAD_TOOLS,
            0.2,
            logger
          ), 
          45000 // 45 seconds timeout for routing
        );
        
        usedModels.add(LILYPAD_MODELS.orchestrator);
        
        if (routingResponse && routingResponse.tool_calls) {
          for (const toolCall of routingResponse.tool_calls) {
            if (toolCall.function?.name === "route_to_model") {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                logger.log(`EXECUTING ${args.task_type.toUpperCase()}`, { query: args.query });
                
                // Execute the actual task with a model-specific timeout
                const result = await executeWithTimeout(() =>
                  executeModelTask(
                    args.task_type,
                    args.query,
                    sessionId
                  ),
                  90000 // 90 seconds timeout for model execution
                );
                
                if (result) {
                  logger.log(`COMPLETED ${args.task_type.toUpperCase()}`, { result: result.substring(0, 100) + "..." });
                  usedModels.add(LILYPAD_MODELS[args.task_type] || LILYPAD_MODELS.default);
                  return {
                    task_type: args.task_type,
                    query: args.query,
                    result: result
                  };
                }
              } catch (error) {
                logger.log(`Failed ${taskType} task`, error.message, "ERROR");
              }
            }
          }
        }
      } catch (error) {
        logger.log(`Subtask error for ${taskType}`, error.message, "ERROR");
      }
      return null;
    });
    
    // Wait for all subtasks to complete or timeout
    const subtaskResults = await Promise.allSettled(subtaskPromises);
    subtaskResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    });
    
    // Step 3: Combine results - even if only some subtasks succeeded
    if (results.length === 0) {
      logger.log("No results from subtasks", "", "ERROR");
      throw new Error("No results from subtasks");
    }
    
    // Create a character-aware combine prompt
    const combinePrompt = "Combine these results into one coherent response, in the voice of " + 
      `${characterData.name}, a character with the personality: ${characterData.personality}:\n\n` + 
      results.map(res => `### ${res.task_type}\n${res.result}`).join("\n\n");
    
    // Use a timeout for the final combination
    const finalResponse = await executeWithTimeout(() =>
      callLilypadModel(
        LILYPAD_MODELS.orchestrator,
        [
          { 
            role: "system", 
            content: `You are ${characterData.name}, a character with the following personality: ${characterData.personality}. 
            Synthesize these inputs into one polished response that sounds like you.` 
          },
          { role: "user", content: combinePrompt }
        ],
        [],
        0.7,
        logger
      ),
      90000 // 90 seconds timeout for final response
    );
    
    usedModels.add(LILYPAD_MODELS.orchestrator);
    
    if (!finalResponse || !finalResponse.content) {
      logger.log("Failed to generate final response", "", "ERROR");
      // Fallback to concatenating results
      const fallbackResponse = results.map(res => `## ${res.task_type}\n${res.result}`).join("\n\n");
      
      return {
        response: cleanRoleplayResponse(fallbackResponse, characterData.name),
        character_name: characterData.name,
        models_used: Array.from(usedModels),
        processing_time: `${(Date.now() - startTime) / 1000} seconds`,
        fallback: true
      };
    }
    
    // Clean up session data
    delete activeLilypadSessions[sessionId];
    
    // Clean and return the response
    const cleanedResponse = cleanRoleplayResponse(finalResponse.content, characterData.name);
    
    return {
      response: cleanedResponse,
      character_name: characterData.name,
      models_used: Array.from(usedModels),
      processing_time: `${(Date.now() - startTime) / 1000} seconds`
    };
    
  } catch (error) {
    console.error(`❌ Lilypad processing error: ${error.message}`);
    
    // Clean up session data (if it exists)
    if (activeLilypadSessions[sessionId]) {
      delete activeLilypadSessions[sessionId];
    }
    
    return {
      response: `I'm sorry, I encountered an error while processing your request: ${error.message}`,
      character_name: characterData.name,
      models_used: Array.from(usedModels),
      processing_time: `${(Date.now() - startTime) / 1000} seconds`,
      error: error.message
    };
  }
}

// Health check endpoint to verify character config retrieval
router.post('/health', async (request, response) => {
  try {
    const { agentAddress } = request.body;
    
    if (!agentAddress) {
      return response.status(400).json({
        success: false,
        error: 'Agent address is required'
      });
    }

    // Get agent character data using existing utility
    const agentData = await getAgentCharacter(agentAddress);
    
    if (!agentData || !agentData.characterConfig) {
      return response.status(404).json({
        success: false,
        error: 'Character configuration not found for agent'
      });
    }

    // Fetch the character data from the characterConfig URL
    try {
      const characterResponse = await fetch(agentData.characterConfig);
      if (!characterResponse.ok) {
        throw new Error(`Failed to fetch character data: ${characterResponse.statusText}`);
      }

      const characterData = await characterResponse.json();
      
      // Return the character data for verification
      return response.status(200).json({
        success: true,
        agentAddress,
        characterData,
        timestamp: new Date().toISOString()
      });
      
    } catch (fetchError) {
      return response.status(502).json({
        success: false,
        error: `Failed to fetch character data: ${fetchError.message}`
      });
    }
    
  } catch (error) {
    console.error('Health check error:', error);
    return response.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

export default router;