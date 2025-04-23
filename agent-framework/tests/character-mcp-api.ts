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
import { PrivateKey } from "@hashgraph/sdk";

dotenv.config();

// Store MCP and character state
interface AppState {
  mcpServer?: MCPServer;
  openAIClient?: MCPOpenAIClient;
  activeCharacter?: Character | null;
  ollamaAvailable: boolean;
}

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
    "OLLAMA_MODEL"
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

    return { mcpServer, openAIClient };
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

// Start the server
async function startServer() {
  try {
    // Validate environment
    validateEnvironment();
    
    // Initialize MCP
    const { mcpServer, openAIClient } = await initializeMCP();
    state.mcpServer = mcpServer;
    state.openAIClient = openAIClient;
    
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
    app.get('/status', function(req: Request, res: Response) {
      res.json({
        status: 'online',
        ollamaAvailable: state.ollamaAvailable,
        activeCharacter: state.activeCharacter ? state.activeCharacter.name : null,
        availableCharacters: listCharacters()
      });
    });
    
    // Character selection endpoint
    app.post('/character', function(req: Request, res: Response) {
      const { characterId, characterName } = req.body;
      const characterIdentifier = characterId || characterName;
      
      if (!characterIdentifier) {
        return res.status(400).json({ error: 'Character ID or name is required' });
      }
      
      initializeCharacter(characterIdentifier).then(character => {
        if (character) {
          state.activeCharacter = character;
          res.json({ 
            status: 'success', 
            character: {
              id: character.id,
              name: character.name
            },
            message: `Character "${character.name}" loaded successfully!`,
            greeting: character.first_mes
          });
        } else {
          res.status(404).json({ error: 'Character not found or could not be loaded' });
        }
      }).catch(error => {
        logger.error('API', 'Error initializing character', error);
        res.status(500).json({ error: 'Error initializing character' });
      });
    });
    
    // Chat endpoint
    app.post('/chat', function(req: Request, res: Response) {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      processInput(message).then(response => {
        res.json({ response });
      }).catch(error => {
        logger.error('API', 'Error processing chat request', error);
        res.status(500).json({ error: 'Error processing your request' });
      });
    });
    
    // List available characters
    app.get('/characters', function(req: Request, res: Response) {
      try {
        const characters = listCharactersWithInfo();
        res.json({ characters });
      } catch (error) {
        logger.error('API', 'Error listing characters', error);
        res.status(500).json({ error: 'Error listing characters' });
      }
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