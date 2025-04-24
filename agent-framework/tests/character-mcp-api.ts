import * as dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { logger, LogLevel } from "../src/utils/logger";
import { mightRequireTools, queryOllama, isOllamaAvailable } from "../src/utils/ollama-client";
import { loadCharacter, listCharacters, createCharacterPrompt, findCharacterById, listCharactersWithInfo } from "../src/characters";
import { Character } from "../src/types";
import { MCPServer } from "../src/utils/mcp-server";
import { MCPOpenAIClient } from "../src/utils/mcp-openai";
import HederaAgentKit from "../src/agent";
import { createHederaTools } from "../src";
import { PrivateKey, Client, AccountId } from "@hashgraph/sdk";
// Import Lit Protocol and ethers for wallet decryption
import { ethers } from "ethers";
import { decryptServerWallet } from "../../frontend/src/utils/lit";
// Import contract constants
import { FRANKY_ADDRESS, FRANKY_ABI } from "../../frontend/src/lib/constants";
// Import utilities
import { createPublicClient, http } from "viem";
import { hederaTestnet } from "viem/chains";
// Import HIP-991 agent functionality
import { 
  initializeAgent, 
  destroyAgent, 
  sendUserMessage, 
  getMessage, 
  getAgentByUserId, 
  hasActiveAgent,
  HIP991Agent,
  TopicMessage
} from "../src/utils/hip991-agent";
import { v4 as uuidv4 } from "uuid";
// Import node-fetch for making HTTP requests
import fetch from 'node-fetch';

dotenv.config();

// Store MCP and character state
interface AppState {
  mcpServer?: MCPServer;
  openAIClient?: MCPOpenAIClient;
  activeCharacter?: Character | null;
  ollamaAvailable: boolean;
  serverClient?: Client; // Hedera client for the server
}

// Interface for server wallet data
interface ServerWallet {
  owner: string;
  walletAddress: string;
  encryptedPrivateKey: string;
  privateKeyHash: string;
}

// Initialize client for contract interaction
const publicClient = createPublicClient({
  chain: hederaTestnet,
  transport: http()
});

const state: AppState = {
  ollamaAvailable: false
};

// Validate environment variables
function validateEnvironment(): void {
  const missingVars: string[] = [];
  const requiredVars = [
    "OPENAI_API_KEY", 
    "HEDERA_ACCOUNT_ID", 
    "HEDERA_PRIVATE_KEY",
    "OLLAMA_BASE_URL", 
    "OLLAMA_MODEL",
    "TEMP_AUTH_PRIVATE_KEY"
  ];

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    logger.error('Env Validation', 'Required environment variables are not set', { missingVars });
    missingVars.forEach((varName) => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }
  
  logger.info('Env Validation', 'All required environment variables are set');
  
  // Set log level from environment if provided
  if (process.env.LOG_LEVEL) {
    const logLevel = parseInt(process.env.LOG_LEVEL);
    logger.setLogLevel(logLevel);
    logger.info('Env Validation', `Log level set to ${LogLevel[logLevel]}`);
  }
}

// Initialize Hedera MCP server
async function initializeMCP() {
  try {
    logger.info('MCP Init', 'Initializing HederaAgentKit');
    
    // Get private key and ensure correct formatting
    const privateKeyString = process.env.HEDERA_PRIVATE_KEY!;
    
    // Format private key correctly - remove 0x prefix if present
    let formattedPrivateKey = privateKeyString;
    if (privateKeyString.startsWith('0x')) {
      formattedPrivateKey = privateKeyString.substring(2);
      logger.debug('MCP Init', 'Removed 0x prefix from private key');
    }
    
    // Convert to proper key type using SDK
    const privateKey = PrivateKey.fromStringECDSA(formattedPrivateKey);
    logger.debug('MCP Init', 'ECDSA private key created successfully');
    
    const hederaKit = new HederaAgentKit(
        process.env.HEDERA_ACCOUNT_ID!,
        privateKey.toString(),
        process.env.HEDERA_PUBLIC_KEY!,
        process.env.HEDERA_NETWORK_TYPE as "mainnet" | "testnet" | "previewnet" || "testnet"
    );
    logger.debug('MCP Init', 'HederaAgentKit initialized');

    // Initialize the server Hedera client
    const serverAccountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
    const serverClient = Client.forTestnet().setOperator(serverAccountId, privateKey);
    logger.debug('MCP Init', 'Hedera client initialized for server');

    // Create the LangChain-compatible tools
    logger.info('MCP Init', 'Creating Hedera tools');
    const tools = createHederaTools(hederaKit);
    logger.debug('MCP Init', `Created ${tools.length} tools`);

    // Start MCP server
    logger.info('MCP Init', 'Starting MCP server');
    const mcpServer = new MCPServer(tools, 3000);
    await mcpServer.start();
    logger.info('MCP Init', `MCP server started at ${mcpServer.getUrl()}`);

    // Create MCP OpenAI client
    logger.info('MCP Init', 'Creating MCP OpenAI client');
    const openAIClient = new MCPOpenAIClient(
      process.env.OPENAI_API_KEY!,
      mcpServer.getUrl(),
      process.env.OPENAI_MODEL || 'gpt-4.1'
    );
    logger.info('MCP Init', 'MCP OpenAI client created');

    return { mcpServer, openAIClient, serverClient };
  } catch (error) {
    logger.error('MCP Init', 'Failed to initialize MCP', error);
    throw error;
  }
}

// Initialize character
async function initializeCharacter(characterIdentifier?: string): Promise<Character | null> {
  try {
    const characters = listCharacters();
    
    if (characters.length === 0) {
      logger.error('Character Init', 'No character files found in the characters directory');
      return null;
    }
    
    // If characterIdentifier is provided, try to load it by ID first, then by name/filename
    if (characterIdentifier) {
      // First try to find by ID (UUID format)
      const characterById = findCharacterById(characterIdentifier);
      if (characterById) {
        logger.info('Character Init', `Loaded character by ID: ${characterById.name} (${characterIdentifier})`);
        return characterById;
      }
      
      // If not found by ID, try by filename
      const matchedCharacter = characters.find(file => 
        file === characterIdentifier || 
        file === `${characterIdentifier}.json`
      );
      
      if (matchedCharacter) {
        logger.info('Character Init', `Loading character by filename: ${matchedCharacter}`);
        const character = loadCharacter(matchedCharacter);
        logger.info('Character Init', `Character "${character.name}" loaded successfully!`);
        return character;
      } else {
        logger.warn('Character Init', `Character not found with ID or name: ${characterIdentifier}, defaulting to first character`);
      }
    }
    
    // Default to first character if identifier not provided or not found
    const defaultCharacter = characters[0];
    logger.info('Character Init', `Loading default character: ${defaultCharacter}`);
    const character = loadCharacter(defaultCharacter);
    logger.info('Character Init', `Character "${character.name}" loaded successfully!`);
    return character;
  } catch (error) {
    logger.error('Character Init', 'Error initializing character', error);
    return null;
  }
}

// Check if Ollama has the required model
async function checkOllamaModel(): Promise<{ available: boolean, fallbackModel?: string }> {
  try {
    logger.info('API', 'Checking Ollama model availability');
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    const configuredModel = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

    // First check if Ollama service is available
    const serviceResponse = await fetch(`${ollamaBaseUrl}/api/version`);
    if (!serviceResponse.ok) {
      logger.warn('API', 'Ollama service is not available');
      return { available: false };
    }

    // Get list of available models
    const modelsResponse = await fetch(`${ollamaBaseUrl}/api/tags`);
    if (!modelsResponse.ok) {
      logger.warn('API', 'Could not get Ollama models list');
      return { available: false };
    }

    const modelsData = await modelsResponse.json();
    const models = modelsData.models || [];
    const modelNames = models.map((model: any) => model.name);
    
    logger.info('API', 'Available Ollama models', { modelNames });

    // Check if our configured model is available
    if (modelNames.includes(configuredModel)) {
      logger.info('API', `Configured model ${configuredModel} is available`);
      return { available: true };
    }
    
    // Check if a model with the same family but different size is available
    // For example, if qwen2.5:14b is not available but qwen2.5:3b is
    const configuredModelFamily = configuredModel.split(':')[0];
    const familyMatches = modelNames.filter(name => name.startsWith(configuredModelFamily));
    
    if (familyMatches.length > 0) {
      logger.info('API', `Using model from the same family: ${familyMatches[0]}`);
      return { available: true, fallbackModel: familyMatches[0] };
    }
    
    // If not, check for fallbacks
    const fallbackModels = ['llama3', 'llama2', 'gemma', 'mistral'];
    for (const fallback of fallbackModels) {
      const matchingModels = modelNames.filter((name: string) => name.startsWith(fallback));
      if (matchingModels.length > 0) {
        logger.info('API', `Using fallback model: ${matchingModels[0]}`);
        return { available: true, fallbackModel: matchingModels[0] };
      }
    }

    // If there are any models available, use the first one
    if (modelNames.length > 0) {
      logger.info('API', `Using first available model: ${modelNames[0]}`);
      return { available: true, fallbackModel: modelNames[0] };
    }

    logger.warn('API', 'No Ollama models are available');
    return { available: false };
  } catch (error) {
    logger.error('API', 'Error checking Ollama model availability', error);
    return { available: false };
  }
}

// Modify the mightRequireTools function to be more aggressive
function enhancedToolDetection(userInput: string): boolean {
  // First run the original detection
  const originalDetection = mightRequireTools(userInput);
  
  // If the original detector already thinks it needs tools, return true
  if (originalDetection) {
    return true;
  }
  
  // Additional checks to be more aggressive
  const lowercaseInput = userInput.toLowerCase();
  
  // More comprehensive list of blockchain and Hedera related terms
  const hederaTerms = [
    'hedera', 'hbar', 'token', 'nft', 'blockchain', 'crypto', 'balance', 'wallet',
    'transaction', 'transfer', 'account', 'hash', 'topic', 'message', 'contract',
    'consensus', 'network', 'ledger', 'asset', 'decentralized', 'defi', 'finance',
    'exchange', 'crypto', 'cryptocurrency', 'digital currency', 'staking', 'validator',
    'fee', 'gas', 'testnet', 'mainnet', 'node', 'hashgraph', 'public key', 'private key',
    'fungible', 'non-fungible', 'proof', 'mint', 'burn', 'treasury', 'memo', 'signature',
    'threshold', 'schedule', 'freeze', 'kyc', 'supply', 'owner'
  ];
  
  // Check if any of these terms are present
  for (const term of hederaTerms) {
    if (lowercaseInput.includes(term)) {
      logger.debug('API', `Enhanced detection found term: ${term}`);
      return true;
    }
  }
  
  // Check for any question that might be blockchain-related
  const questionPatterns = [
    'how (can|do) i', 'how (to|would|could|should)', 'what (is|are|if|would)',
    'can (i|you|we|it)', 'how much', 'tell me about', 'explain', 'show me',
    'check', 'help me', 'could you', 'would you', 'do you know'
  ];
  
  for (const pattern of questionPatterns) {
    if (new RegExp(pattern).test(lowercaseInput)) {
      // If it's a question and has any complexity at all, route to OpenAI
      if (userInput.length > 20 || userInput.split(' ').length > 5) {
        logger.debug('API', `Enhanced detection found complex question pattern: ${pattern}`);
        return true;
      }
    }
  }
  
  // If the message is more than a simple greeting, route to OpenAI
  const simpleGreetings = [
    'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 
    'good evening', 'how are you', 'nice to meet you'
  ];
  
  let isSimpleGreeting = false;
  for (const greeting of simpleGreetings) {
    if (lowercaseInput.includes(greeting) && userInput.length < 30) {
      isSimpleGreeting = true;
      break;
    }
  }
  
  // If it's not a simple greeting, route to OpenAI
  if (!isSimpleGreeting) {
    return true;
  }
  
  return false;
}

// Wrapper for queryOllama to use our fallback model and limit response length
async function queryOllamaWithFallback(prompt: string, character?: Character): Promise<string> {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const modelToUse = process.env.OLLAMA_FALLBACK_MODEL || process.env.OLLAMA_MODEL || 'qwen2.5:3b';
  
  // Log which model we're using
  logger.info('API', `Using Ollama model: ${modelToUse}`);
  
  // Apply character formatting if a character is provided
  const formattedPrompt = character 
    ? createCharacterPrompt(character, prompt)
    : prompt;
  
  try {
    const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelToUse,
        prompt: formattedPrompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('API', `HTTP error ${response.status}`, {
        errorText,
        status: response.status
      });
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let ollamaResponse = data.response;
    
    // Limit the response to 512 characters
    if (ollamaResponse.length > 512) {
      logger.info('API', `Limiting Ollama response from ${ollamaResponse.length} to 512 characters`);
      ollamaResponse = ollamaResponse.substring(0, 509) + '...';
    }
    
    return ollamaResponse;
  } catch (error) {
    logger.error('API', 'Error querying Ollama', error);
    throw error;
  }
}

// Process user input and generate a response
async function processInput(userInput: string): Promise<string> {
  logger.info('API', 'Processing user input', {
    inputLength: userInput.length,
    firstWords: userInput.split(' ').slice(0, 3).join(' ') + '...'
  });

  // Ensure we have a character and MCP client
  if (!state.activeCharacter) {
    return "Error: No character is active. Please initialize the service.";
  }
  
  if (!state.openAIClient) {
    return "Error: MCP client is not initialized. Please initialize the service.";
  }

  // Use enhanced tool detection to be more aggressive in routing to OpenAI
  const requiresTools = enhancedToolDetection(userInput);
  
  if (requiresTools) {
    // Use MCP for blockchain operations and complex queries
    logger.info('API', 'Detected complex query or blockchain operation, using OpenAI');
    
    try {
      // Generate response with MCP
      const { response, toolCalls } = await state.openAIClient.generateResponse(userInput);
      
      // Only process tool calls if there are any
      if (toolCalls.length > 0) {
        logger.info('API', `Executing tools: ${toolCalls.map(tc => tc.name).join(', ')}`);
        const toolResults = await state.openAIClient.executeTools(toolCalls);
        
        // Generate follow-up response with character context
        const followUpResponse = await state.openAIClient.generateFollowUp(
          userInput, 
          toolResults, 
          undefined, 
          state.activeCharacter.name
        );
        
        return `Blockchain Result: ${followUpResponse}`;
      } else {
        // If there are no tool calls, return the regular response with character voice
        return `${state.activeCharacter.name}: ${response}`;
      }
    } catch (error) {
      logger.error('API', 'Error using MCP', error);
      return `Sorry, I encountered an error processing your query: ${error instanceof Error ? error.message : String(error)}`;
    }
  } else if (state.ollamaAvailable) {
    // Only use Ollama for very simple conversation (like greetings)
    logger.info('API', 'Using character mode with Ollama for simple query');
    
    try {
      // Pass the character to our modified Ollama function
      const ollamaResponse = await queryOllamaWithFallback(userInput, state.activeCharacter);
      return `${state.activeCharacter.name}: ${ollamaResponse}`;
    } catch (error) {
      logger.error('API', 'Error with Ollama character response', error);
      
      // Fall back to OpenAI if Ollama fails
      logger.info('API', 'Falling back to OpenAI after Ollama error');
      try {
        const { response } = await state.openAIClient.generateResponse(
          userInput,
          `You are roleplaying as ${state.activeCharacter.name}. ${state.activeCharacter.description}`
        );
        return `${state.activeCharacter.name}: ${response}`;
      } catch (fallbackError) {
        logger.error('API', 'Error with OpenAI fallback', fallbackError);
        return `Sorry, I encountered an error generating a response: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  } else {
    // Fallback if Ollama is not available
    logger.warn('API', 'Ollama is not available, using OpenAI for character response');
    try {
      const { response } = await state.openAIClient.generateResponse(
        userInput,
        `You are roleplaying as ${state.activeCharacter.name}. ${state.activeCharacter.description}`
      );
      return `${state.activeCharacter.name}: ${response}`;
    } catch (error) {
      logger.error('API', 'Error with OpenAI fallback', error);
      return `Sorry, I encountered an error generating a response: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

// Retrieves and decrypts the server wallet private key
async function getServerWalletPrivateKey(accountId: string): Promise<{ privateKey: string | null; error: string | null }> {
  try {
    logger.info('Server Wallet', `Fetching server wallet for account: ${accountId}`);
    
    // 1. Retrieve the encrypted server wallet data from the blockchain
    const serverWalletData = await publicClient.readContract({
      address: FRANKY_ADDRESS as `0x${string}`,
      abi: FRANKY_ABI,
      functionName: "serverWalletsMapping",
      args: [accountId]
    });
    
    // Cast the result to match our ServerWallet interface
    const serverWallet = serverWalletData as unknown as {
      owner: string;
      walletAddress: string;
      encryptedPrivateKey: string;
      privateKeyHash: string;
    };
    
    logger.debug('Server Wallet', 'Server wallet data retrieved', {
      walletAddress: serverWallet.walletAddress
    });
    
    // Check if the wallet exists
    if (!serverWallet.walletAddress || serverWallet.walletAddress === '0x0000000000000000000000000000000000000000') {
      logger.warn('Server Wallet', 'No server wallet configured for this account');
      return { privateKey: null, error: "No server wallet configured for this account" };
    }
    
    // 2. Create an ethers wallet for authentication
    // Note: In a real implementation, you would need to get this private key securely
    // For this demo, we're assuming it's available in the environment
    if (!process.env.TEMP_AUTH_PRIVATE_KEY) {
      logger.error('Server Wallet', 'Missing TEMP_AUTH_PRIVATE_KEY environment variable');
      return { privateKey: null, error: "Auth key not available" };
    }
    
    const ethersWallet = new ethers.Wallet(process.env.TEMP_AUTH_PRIVATE_KEY);
    logger.debug('Server Wallet', 'Created authentication wallet', {
      address: ethersWallet.address
    });
    
    // 3. Decrypt the server wallet private key using Lit Protocol
    const decryptionResult = await decryptServerWallet(
      ethersWallet,
      serverWallet.walletAddress,
      serverWallet.encryptedPrivateKey,
      serverWallet.privateKeyHash
    );
    
    if (decryptionResult.error) {
      logger.error('Server Wallet', 'Failed to decrypt server wallet', {
        error: decryptionResult.error
      });
      return { privateKey: null, error: `Decryption failed: ${decryptionResult.error}` };
    }
    
    logger.info('Server Wallet', 'Successfully decrypted server wallet private key');
    return { privateKey: decryptionResult.decryptedData, error: null };
  } catch (error) {
    logger.error('Server Wallet', 'Error retrieving or decrypting server wallet', error);
    return { 
      privateKey: null, 
      error: `Error retrieving or decrypting server wallet: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// Create a Hedera client for the user with the given private key
function createUserClient(accountId: string, privateKey: string): Client {
  try {
    const userAccountId = AccountId.fromString(accountId);
    const userPrivateKey = PrivateKey.fromStringECDSA(privateKey);
    return Client.forTestnet().setOperator(userAccountId, userPrivateKey);
  } catch (error) {
    logger.error('HIP991', 'Error creating user client', error);
    throw new Error(`Error creating user client: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Add a helper function to fetch agent details and character data
async function fetchAgentAndCharacterData(agentAddress: string): Promise<{ 
  agent: any; 
  character: Character | null;
  feeInHbar: number;
  error?: string;
}> {
  try {
    logger.info('Agent Init', `Fetching agent details for address: ${agentAddress}`);
    
    // Fetch agent details from the API
    const agentResponse = await fetch(`https://frankyagent.xyz/api/graph/agent?address=${agentAddress}`);
    
    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      logger.error('Agent Init', `Failed to fetch agent details: ${errorText}`);
      return { 
        agent: null, 
        character: null, 
        feeInHbar: 0.5,
        error: `Failed to fetch agent details: ${agentResponse.status} ${errorText}` 
      };
    }
    
    const agentData = await agentResponse.json();
    logger.info('Agent Init', 'Agent details fetched successfully');
    
    // Extract the character config URL from the agent data
    // characterConfig is an array where the first element is expected to be the URL in bytes format
    const characterConfigBytes = agentData.characterConfig ? agentData.characterConfig[0] : null;
    
    if (!characterConfigBytes) {
      logger.error('Agent Init', 'No character config found in agent data');
      return { 
        agent: agentData, 
        character: null, 
        feeInHbar: 0.5,
        error: 'No character config found in agent data' 
      };
    }
    
    // Convert bytes to string URL (if it's already a string, this won't harm)
    let characterConfigUrl = '';
    if (typeof characterConfigBytes === 'string') {
      // If it's a hex string starting with 0x, convert it to text
      if (characterConfigBytes.startsWith('0x')) {
        // Convert hex string to buffer and then to UTF-8 string
        const buffer = Buffer.from(characterConfigBytes.slice(2), 'hex');
        characterConfigUrl = buffer.toString('utf8');
      } else {
        characterConfigUrl = characterConfigBytes;
      }
    } else {
      logger.error('Agent Init', 'Character config is not in expected format');
      return { 
        agent: agentData, 
        character: null, 
        feeInHbar: 0.5,
        error: 'Character config is not in expected format' 
      };
    }
    
    logger.info('Agent Init', `Fetching character data from: ${characterConfigUrl}`);
    
    // Fetch character data from Pinata URL
    const characterResponse = await fetch(characterConfigUrl);
    
    if (!characterResponse.ok) {
      const errorText = await characterResponse.text();
      logger.error('Agent Init', `Failed to fetch character data: ${errorText}`);
      return { 
        agent: agentData, 
        character: null, 
        feeInHbar: 0.5,
        error: `Failed to fetch character data: ${characterResponse.status} ${errorText}` 
      };
    }
    
    const characterData = await characterResponse.json();
    logger.info('Agent Init', 'Character data fetched successfully');
    
    // Extract the character from the characterData
    const character = characterData.character || characterData;
    
    // Convert the perApiCallFee from wei to HBAR
    // Assuming the fee is stored in wei and 1 HBAR = 100,000,000 wei
    const feeInWei = agentData.perApiCallFee ? Number(agentData.perApiCallFee) : 50000000; // Default to 0.5 HBAR in wei
    const feeInHbar = feeInWei / 100000000; // Convert wei to HBAR
    
    logger.info('Agent Init', `Agent fee set to ${feeInHbar} HBAR`);
    
    return { agent: agentData, character, feeInHbar };
  } catch (error) {
    logger.error('Agent Init', 'Error fetching agent or character data', error);
    return { 
      agent: null, 
      character: null, 
      feeInHbar: 0.5,
      error: `Error fetching agent or character data: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// Start the server
async function startServer() {
  try {
    // Validate environment
    validateEnvironment();
    
    // Initialize MCP
    const { mcpServer, openAIClient, serverClient } = await initializeMCP();
    state.mcpServer = mcpServer;
    state.openAIClient = openAIClient;
    state.serverClient = serverClient;
    
    // Check Ollama and model availability
    logger.info('API', 'Checking Ollama model availability');
    const { available, fallbackModel } = await checkOllamaModel();
    state.ollamaAvailable = available;
    
    if (available) {
      logger.info('API', 'Ollama is available and will be used for character responses');
      if (fallbackModel) {
        logger.info('API', `Using fallback model: ${fallbackModel}`);
        process.env.OLLAMA_FALLBACK_MODEL = fallbackModel;
      }
    } else {
      logger.warn('API', 'Ollama is not available. Character mode will fall back to OpenAI.');
    }
    
    // Initialize a default character
    state.activeCharacter = await initializeCharacter();
    
    // Create Express app
    const app = express();
    app.use(cors());
    app.use(bodyParser.json());
    
    // Status endpoint
    app.get('/status', (req: Request, res: Response) => {
      res.json({
        status: 'online',
        ollamaAvailable: state.ollamaAvailable,
        activeCharacter: state.activeCharacter ? state.activeCharacter.name : null,
        availableCharacters: listCharacters()
      });
    });
    
    // Initialize agent with character endpoint
    app.post('/initialize', (req: Request, res: Response) => {
      // Get the account ID from headers
      const accountId = req.headers['account-id'] as string;
      
      if (!accountId) {
        return res.status(400).json({ error: 'account-id header is required' });
      }
      
      // Get the agent address from headers instead of character ID from body
      const agentAddress = req.headers['agent-address'] as string;
      
      if (!agentAddress) {
        return res.status(400).json({ error: 'agent-address header is required' });
      }
      
      // First get the server wallet private key to authenticate the user
      getServerWalletPrivateKey(accountId).then(async ({ privateKey, error: walletError }) => {
        if (walletError) {
          logger.error('API', 'Error getting server wallet', { accountId, error: walletError });
          return res.status(401).json({ error: `Server wallet access error: ${walletError}` });
        }
        
        if (!privateKey) {
          logger.error('API', 'No private key returned', { accountId });
          return res.status(404).json({ error: 'Server wallet not found or not accessible' });
        }
        
        logger.info('API', 'Successfully retrieved server wallet private key', { accountId });
        
        try {
          // Fetch agent details and character data
          const { agent, character, feeInHbar, error: fetchError } = await fetchAgentAndCharacterData(agentAddress);
          
          if (fetchError || !character) {
            return res.status(404).json({ error: fetchError || 'Failed to retrieve character data' });
          }
          
          // Create user client using the decrypted private key
          const userClient = createUserClient(accountId, privateKey);
          const userAccountId = AccountId.fromString(accountId);
          
          // Create the HIP-991 agent for this user and character
          const hip991Agent = await initializeAgent(
            state.serverClient!,                   // Server client
            AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!), // Server account ID
            PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY!), // Server key
            userAccountId,                         // User account ID
            userClient.operatorPublicKey,          // User public key
            character,                             // Character
            feeInHbar                              // Dynamic fee from agent configuration
          );
          
          res.json({
            status: 'success',
            message: `Agent initialized with character ${character.name}`,
            agent: {
              agentAddress,
              characterName: character.name,
              inboundTopicId: hip991Agent.inboundTopicId,
              outboundTopicId: hip991Agent.outboundTopicId,
              greeting: character.first_mes,
              feePerMessage: feeInHbar
            }
          });
        } catch (error) {
          logger.error('API', 'Error initializing agent', error);
          res.status(500).json({ 
            error: `Error initializing agent: ${error instanceof Error ? error.message : String(error)}` 
          });
        }
      }).catch(error => {
        logger.error('API', 'Unexpected error in server wallet retrieval', error);
        res.status(500).json({ 
          error: `Unexpected error retrieving server wallet: ${error instanceof Error ? error.message : String(error)}` 
        });
      });
    });
    
    // Chat endpoint using HIP-991 topics
    app.post('/chat', (req: Request, res: Response) => {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      // Get the account ID from headers
      const accountId = req.headers['account-id'] as string;
      
      if (!accountId) {
        return res.status(400).json({ error: 'account-id header is required' });
      }
      
      // Check if this user has an active agent
      if (!hasActiveAgent(accountId)) {
        return res.status(400).json({ 
          error: 'No active agent initialized. Please initialize an agent first using the /initialize endpoint.' 
        });
      }
      
      // First get the server wallet private key
      getServerWalletPrivateKey(accountId).then(async ({ privateKey, error }) => {
        if (error) {
          logger.error('API', 'Error getting server wallet', { accountId, error });
          return res.status(401).json({ error: `Server wallet access error: ${error}` });
        }
        
        if (!privateKey) {
          logger.error('API', 'No private key returned', { accountId });
          return res.status(404).json({ error: 'Server wallet not found or not accessible' });
        }
        
        logger.info('API', 'Successfully retrieved server wallet private key', { accountId });
        
        try {
          // Create user client using the decrypted private key
          const userClient = createUserClient(accountId, privateKey);
          
          // Get the agent for this user
          const agent = getAgentByUserId(accountId);
          if (!agent) {
            return res.status(400).json({ 
              error: 'No active agent found. Please initialize an agent first using the /initialize endpoint.' 
            });
          }
          
          // Send the message to the agent's inbound topic
          const { messageId, responseId, responsePromise } = await sendUserMessage(
            userClient,
            agent,
            message
          );
          
          // Return immediately with the message IDs
          res.json({
            status: 'success',
            message: 'Message sent successfully',
            messageId,
            responseId,
            outboundTopicId: agent.outboundTopicId,
            characterName: agent.character.name
          });
          
          // The response will be processed asynchronously by the agent
          // The user can retrieve it with the /viewresponse endpoint
        } catch (error) {
          logger.error('API', 'Error sending message', error);
          res.status(500).json({ 
            error: `Error sending message: ${error instanceof Error ? error.message : String(error)}` 
          });
        }
      }).catch(error => {
        logger.error('API', 'Unexpected error in server wallet retrieval', error);
        res.status(500).json({ 
          error: `Unexpected error retrieving server wallet: ${error instanceof Error ? error.message : String(error)}` 
        });
      });
    });
    
    // Get response endpoint
    app.get('/viewresponse/:messageId', (req: Request, res: Response) => {
      const { messageId } = req.params;
      
      if (!messageId) {
        return res.status(400).json({ error: 'Message ID is required' });
      }
      
      // Get the account ID from headers
      const accountId = req.headers['account-id'] as string;
      
      if (!accountId) {
        return res.status(400).json({ error: 'account-id header is required' });
      }
      
      // Check if this user has an active agent
      if (!hasActiveAgent(accountId)) {
        return res.status(400).json({ 
          error: 'No active agent initialized. Please initialize an agent first.' 
        });
      }
      
      // Get the message from the cache
      const message = getMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      res.json({
        status: 'success',
        message
      });
    });
    
    // Destruct/cleanup agent endpoint
    app.post('/destruct', (req: Request, res: Response) => {
      // Get the account ID from headers
      const accountId = req.headers['account-id'] as string;
      
      if (!accountId) {
        return res.status(400).json({ error: 'account-id header is required' });
      }
      
      // Check if this user has an active agent
      if (!hasActiveAgent(accountId)) {
        return res.status(400).json({ 
          error: 'No active agent to destruct.' 
        });
      }
      
      // Destroy the agent
      destroyAgent(state.serverClient!, accountId).then(success => {
        if (success) {
          res.json({
            status: 'success',
            message: 'Agent destroyed successfully'
          });
        } else {
          res.status(500).json({ error: 'Failed to destroy agent' });
        }
      }).catch(error => {
        logger.error('API', 'Error destroying agent', error);
        res.status(500).json({ 
          error: `Error destroying agent: ${error instanceof Error ? error.message : String(error)}` 
        });
      });
    });
    
    // List available characters
    app.get('/characters', (req: Request, res: Response) => {
      try {
        const characters = listCharactersWithInfo();
        res.json({ characters });
      } catch (error) {
        logger.error('API', 'Error listing characters', error);
        res.status(500).json({ error: 'Error listing characters' });
      }
    });
    
    // Check server wallet status
    app.get('/wallet-status', (req: Request, res: Response) => {
      // Get the account ID from headers
      const accountId = req.headers['account-id'] as string;
      
      if (!accountId) {
        return res.status(400).json({ error: 'account-id header is required' });
      }
      
      // Check the server wallet status
      publicClient.readContract({
        address: FRANKY_ADDRESS as `0x${string}`,
        abi: FRANKY_ABI,
        functionName: "serverWalletsMapping",
        args: [accountId]
      }).then((serverWalletData) => {
        // Cast the result to match our ServerWallet interface
        const serverWallet = serverWalletData as unknown as {
          owner: string;
          walletAddress: string;
          encryptedPrivateKey: string;
          privateKeyHash: string;
        };
        
        const isConfigured = serverWallet.walletAddress && 
                             serverWallet.walletAddress !== '0x0000000000000000000000000000000000000000';
        
        // Check if user has an active agent
        const hasAgent = hasActiveAgent(accountId);
        const agent = getAgentByUserId(accountId);
        
        res.json({
          accountId,
          serverWalletConfigured: isConfigured,
          serverWalletAddress: isConfigured ? serverWallet.walletAddress : null,
          hasEncryptedKey: isConfigured && serverWallet.encryptedPrivateKey ? true : false,
          hasActiveAgent: hasAgent,
          agentInfo: hasAgent && agent ? {
            characterName: agent.character.name,
            characterId: agent.character.id,
            inboundTopicId: agent.inboundTopicId,
            outboundTopicId: agent.outboundTopicId
          } : null
        });
      }).catch((error) => {
        logger.error('API', 'Error checking server wallet status', error);
        res.status(500).json({ 
          error: `Error checking server wallet status: ${error instanceof Error ? error.message : String(error)}`
        });
      });
    });
    
    // Start the server
    const port = process.env.API_PORT || 8080;
    app.listen(port, () => {
      logger.info('API', `Character MCP API server started on port ${port}`);
      console.log(`Character MCP API server is running on http://localhost:${port}`);
    });
  } catch (error) {
    logger.error('API', 'Error starting server', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('API', 'Fatal error', error);
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { startServer, processInput }; 