import { webcrypto } from 'node:crypto';
import Long from 'long';
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from 'uuid';
import { logger, LogLevel } from "../src/utils/logger.js";
import {
  mightRequireTools,
  queryOllama,
  isOllamaAvailable,
} from "../src/utils/ollama-client.js";
import {
  loadCharacter,
  listCharacters,
  createCharacterPrompt,
  findCharacterById,
  listCharactersWithInfo,
} from "../src/characters/index.js";
import { Character } from "../src/types/index.js";
import { MCPServer } from "../src/utils/mcp-server.js";
import { MCPOpenAIClient } from "../src/utils/mcp-openai.js";
import HederaAgentKit from "../src/agent/index.js";
import { createHederaTools } from "../src/index.js";
import { PrivateKey, Client, AccountId, TransactionReceipt } from "@hashgraph/sdk";
import { decodeBase58 } from "../src/utils/base58.js";
// Import Lit Protocol and ethers for wallet decryption
import { ethers } from "ethers";
// Import local implementations
import { decryptServerWallet } from "./lit-helpers.js";
// Import contract constants
import { FRANKY_ADDRESS, FRANKY_ABI } from "./constants.js";
// Import utilities
import { createPublicClient, formatEther, http } from "viem";
import { hederaTestnet } from "./hedera-chain.js";
// Import HIP-991 agent functionality
import {
  initializeAgent,
  destroyAgent,
  sendUserMessage,
  getMessage,
  getAgentByUserId,
  hasActiveAgent,
  HIP991Agent,
  TopicMessage,
} from "../src/utils/hip991-agent.js";
// Import node-fetch for making HTTP requests
import fetch from "node-fetch";
import {
  generateResponse,
  initializeMCPState as initializeResponseGenerator,
  checkOllamaModel,
  enhancedToolDetection,
  queryOllamaWithFallback,
} from "../src/utils/response-generator.js";
import { HCS10Client, NetworkType } from "@hashgraphonline/standards-sdk";
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { MonitorService, registerFeeGatedConnection } from "../src/services/monitorService.js";
import { generateCharacterResponse } from "../src/services/aiService.js";
import { FeeConfig } from "../src/utils/feeUtils.js";
import { HCS11Client } from "@hashgraphonline/standards-sdk";
import * as storageService from "../src/services/storageService.js";
import { getConnectionService } from '../src/services/connectionService.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Add declaration for cors module to fix linter error

// Define CONNECTION_DIR locally since it's not exported from storageService
const CONNECTION_DIR = process.env.STATE_DIR ? path.join(process.env.STATE_DIR, 'connections') : './data/connections';
const USER_MAPPINGS_DIR = process.env.STATE_DIR ? path.join(process.env.STATE_DIR, 'user_mappings') : './data/user_mappings';
const CHARACTER_DATA_DIR = process.env.STATE_DIR ? path.join(process.env.STATE_DIR, 'characters') : './data/characters';

// Ensure directories exist
if (!fs.existsSync(CONNECTION_DIR)) {
  fs.mkdirSync(CONNECTION_DIR, { recursive: true });
}
if (!fs.existsSync(USER_MAPPINGS_DIR)) {
  fs.mkdirSync(USER_MAPPINGS_DIR, { recursive: true });
}
if (!fs.existsSync(CHARACTER_DATA_DIR)) {
  fs.mkdirSync(CHARACTER_DATA_DIR, { recursive: true });
}

// Define the user-agent mapping interface
interface UserAgentMapping {
  agentAddress: string;
  connectionTopicId: string;
  characterId: string;
  inboundTopicId: string;
  outboundTopicId: string;
  lastActive: string;
}

// In-memory cache of user-agent mappings
const userAgentMappings = new Map<string, UserAgentMapping>();

/**
 * Save a user-agent mapping to both memory and persistent storage
 */
function saveUserAgentMapping(userId: string, agentData: UserAgentMapping): void {
  // Save in memory cache
  userAgentMappings.set(userId, agentData);
  
  try {
    // Save to persistent storage
    if (!fs.existsSync(USER_MAPPINGS_DIR)) {
      fs.mkdirSync(USER_MAPPINGS_DIR, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(USER_MAPPINGS_DIR, `${userId.replace(/\./g, '_')}.json`),
      JSON.stringify(agentData, null, 2)
    );
    
    logger.info("MAPPING", `Saved agent mapping for user ${userId}`);
  } catch (error) {
    logger.error("MAPPING", `Error saving agent mapping for user ${userId}`, error);
  }
}

/**
 * Get a user's agent mapping from memory cache or persistent storage
 */
async function getUserAgentMapping(userId: string): Promise<UserAgentMapping | null> {
  try {
    // Check memory cache first
    if (userAgentMappings.has(userId)) {
      const mapping = userAgentMappings.get(userId);
      // Update the last active timestamp
      mapping!.lastActive = new Date().toISOString();
      // Save the updated mapping
      saveUserAgentMapping(userId, mapping!);
      return mapping!;
    }
    
    // Try to load from persistent storage
    const mappingFile = path.join(USER_MAPPINGS_DIR, `${userId.replace(/\./g, '_')}.json`);
    
    if (fs.existsSync(mappingFile)) {
      const mappingData = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
      
      // Update the last active timestamp
      mappingData.lastActive = new Date().toISOString();
      
      // Cache in memory and save updated timestamp
      userAgentMappings.set(userId, mappingData);
      fs.writeFileSync(mappingFile, JSON.stringify(mappingData, null, 2));
      
      logger.info("MAPPING", `Loaded agent mapping for user ${userId}`);
      return mappingData;
    }
    
    return null;
  } catch (error) {
    logger.error("MAPPING", `Error getting agent mapping for user ${userId}`, error);
    return null;
  }
}

/**
 * Save character data for future use
 */
function saveCharacterData(characterId: string, characterData: any): void {
  try {
    if (!fs.existsSync(CHARACTER_DATA_DIR)) {
      fs.mkdirSync(CHARACTER_DATA_DIR, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(CHARACTER_DATA_DIR, `${characterId.replace(/\./g, '_')}.json`),
      JSON.stringify(characterData, null, 2)
    );
    
    logger.info("CHARACTER", `Saved character data for ${characterId}`);
  } catch (error) {
    logger.error("CHARACTER", `Error saving character data for ${characterId}`, error);
  }
}

/**
 * Get character data from storage
 */
function getCharacterData(characterId: string): any | null {
  try {
    const characterFile = path.join(CHARACTER_DATA_DIR, `${characterId.replace(/\./g, '_')}.json`);
    
    if (fs.existsSync(characterFile)) {
      const characterData = JSON.parse(fs.readFileSync(characterFile, 'utf8'));
      logger.info("CHARACTER", `Loaded character data for ${characterId}`);
      return characterData;
    }
    
    return null;
  } catch (error) {
    logger.error("CHARACTER", `Error loading character data for ${characterId}`, error);
    return null;
  }
}

/**
 * Save connection information
 */
function saveConnection(connectionInfo: any): void {
  try {
    const characterId = connectionInfo.characterId || 'default';
    const characterConnectionDir = path.join(CONNECTION_DIR, characterId);
    
    // Ensure character connection directory exists
    if (!fs.existsSync(characterConnectionDir)) {
      fs.mkdirSync(characterConnectionDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(characterConnectionDir, `${connectionInfo.connectionTopicId}.json`),
      JSON.stringify(connectionInfo, null, 2)
    );
    
    logger.info("CONNECTION", `Saved connection information for ${connectionInfo.connectionTopicId}`);
  } catch (error) {
    logger.error("CONNECTION", `Error saving connection information`, error);
  }
}

dotenv.config();

// Define extended Character interface with all properties from franky.json
interface ExtendedCharacter {
  id?: string;
  characterId?: string;
  name: string;
  description: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  creatorcomment?: string;
  tags?: string[];
  talkativeness?: number;
  fav?: boolean;
  traits?: Record<string, any>;
  imageUrl?: string;
  inboundTopicId?: string;
  outboundTopicId?: string;
  [key: string]: any; // Allow any other character properties
}

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
  transport: http(),
});

const state: AppState = {
  ollamaAvailable: false,
};

// Global monitor service instances mapped by topic ID
const monitorServices = new Map<string, MonitorService>();

// Validate environment variables
function validateEnvironment(): void {
  const missingVars: string[] = [];
  const requiredVars = [
    "OPENAI_API_KEY",
    "HEDERA_ACCOUNT_ID",
    "HEDERA_PRIVATE_KEY",
    "OLLAMA_BASE_URL",
    "OLLAMA_MODEL",
  ];

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    logger.error(
      "Env Validation",
      "Required environment variables are not set",
      { missingVars }
    );
    missingVars.forEach((varName) => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  logger.info("Env Validation", "All required environment variables are set");

  // Set log level from environment if provided
  if (process.env.LOG_LEVEL) {
    const logLevel = parseInt(process.env.LOG_LEVEL);
    logger.setLogLevel(logLevel);
    logger.info("Env Validation", `Log level set to ${LogLevel[logLevel]}`);
  }
}

// Initialize Hedera MCP server
async function initializeMCP() {
  try {
    logger.info("MCP Init", "Initializing HederaAgentKit");

    // Get private key and ensure correct formatting
    const privateKeyString = process.env.HEDERA_PRIVATE_KEY!;

    // Format private key correctly - remove 0x prefix if present
    let formattedPrivateKey = privateKeyString;
    if (privateKeyString.startsWith("0x")) {
      formattedPrivateKey = privateKeyString.substring(2);
      logger.debug("MCP Init", "Removed 0x prefix from private key");
    }

    // Convert to proper key type using SDK
    const privateKey = PrivateKey.fromStringECDSA(formattedPrivateKey);
    logger.debug("MCP Init", "ECDSA private key created successfully");

    const hederaKit = new HederaAgentKit(
      process.env.HEDERA_ACCOUNT_ID!,
      privateKey.toString(),
      process.env.HEDERA_PUBLIC_KEY!,
      (process.env.HEDERA_NETWORK_TYPE as
        | "mainnet"
        | "testnet"
        | "previewnet") || "testnet"
    );
    logger.debug("MCP Init", "HederaAgentKit initialized");

    // Initialize the server Hedera client
    const serverAccountId = AccountId.fromString(
      process.env.HEDERA_ACCOUNT_ID!
    );
    const serverClient = Client.forTestnet().setOperator(
      serverAccountId,
      privateKey
    );
    logger.debug("MCP Init", "Hedera client initialized for server");

    // Create the LangChain-compatible tools
    logger.info("MCP Init", "Creating Hedera tools");
    const tools = createHederaTools(hederaKit);
    logger.debug("MCP Init", `Created ${tools.length} tools`);

    // Start MCP server
    logger.info("MCP Init", "Starting MCP server");
    const mcpServer = new MCPServer(tools, 3001);
    await mcpServer.start();
    logger.info("MCP Init", `MCP server started at ${mcpServer.getUrl()}`);

    // Create MCP OpenAI client
    logger.info("MCP Init", "Creating MCP OpenAI client");
    const openAIClient = new MCPOpenAIClient(
      process.env.OPENAI_API_KEY!,
      mcpServer.getUrl(),
      process.env.OPENAI_MODEL || "gpt-4.1"
    );
    logger.info("MCP Init", "MCP OpenAI client created");

    // Initialize the response generator
    await initializeResponseGenerator(
      openAIClient,
      state.ollamaAvailable,
      state.activeCharacter
    );

    return { mcpServer, openAIClient, serverClient };
  } catch (error) {
    logger.error("MCP Init", "Failed to initialize MCP", error);
    throw error;
  }
}

// Initialize character
async function initializeCharacter(
  characterIdentifier?: string
): Promise<Character | null> {
  try {
    const characters = listCharacters();

    if (characters.length === 0) {
      logger.error(
        "Character Init",
        "No character files found in the characters directory"
      );
      return null;
    }

    // If characterIdentifier is provided, try to load it by ID first, then by name/filename
    if (characterIdentifier) {
      // First try to find by ID (UUID format)
      const characterById = findCharacterById(characterIdentifier);
      if (characterById) {
        logger.info(
          "Character Init",
          `Loaded character by ID: ${characterById.name} (${characterIdentifier})`
        );
        return characterById;
      }

      // If not found by ID, try by filename
      const matchedCharacter = characters.find(
        (file) =>
          file === characterIdentifier || file === `${characterIdentifier}.json`
      );

      if (matchedCharacter) {
        logger.info(
          "Character Init",
          `Loading character by filename: ${matchedCharacter}`
        );
        const character = loadCharacter(matchedCharacter);
        logger.info(
          "Character Init",
          `Character "${character.name}" loaded successfully!`
        );
        return character;
      } else {
        logger.warn(
          "Character Init",
          `Character not found with ID or name: ${characterIdentifier}, defaulting to Franky character`
        );
      }
    }

    // Default to Franky character if identifier not provided or not found
    const frankyCharacter = characters.find((file) => file === "franky.json");

    if (frankyCharacter) {
      logger.info("Character Init", `Loading Franky character as default`);
      const character = loadCharacter(frankyCharacter);
      logger.info(
        "Character Init",
        `Character "${character.name}" loaded successfully!`
      );
      return character;
    } else {
      // If Franky character is not found, default to first character
      const defaultCharacter = characters[0];
      logger.warn(
        "Character Init",
        `Franky character not found, loading default character: ${defaultCharacter}`
      );
      const character = loadCharacter(defaultCharacter);
      logger.info(
        "Character Init",
        `Character "${character.name}" loaded successfully!`
      );
      return character;
    }
  } catch (error) {
    logger.error("Character Init", "Error initializing character", error);
    return null;
  }
}

// Process user input and generate a response
async function processInput(userInput: string): Promise<string> {
  return generateResponse(userInput);
}

// Retrieves and decrypts the server wallet private key
async function getServerWalletPrivateKey(
  accountId: string
): Promise<{ privateKey: string | null; error: string | null }> {
  // Return hardcoded private key
  return {
    privateKey: "92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    error: null
  };
  
  /* Original implementation commented out
  try {
    logger.info(
      "Server Wallet",
      `Fetching server wallet for account: ${accountId}`
    );

    // 1. Retrieve the encrypted server wallet data from the blockchain
    const serverWallet: any = await publicClient.readContract({
      address: FRANKY_ADDRESS,
      abi: FRANKY_ABI,
      functionName: "serverWalletsMapping",
      args: [accountId.toLowerCase()],
    });
    console.log("Server Wallets return value");
    console.log(serverWallet);
    const walletAddress = serverWallet[0];
    const serverWalletAddress = serverWallet[1];
    const encryptedPrivateKey = serverWallet[2];
    const privateKeyHash = serverWallet[3];

    // Cast the result to match our ServerWallet interface

    logger.debug("Server Wallet", "Server wallet data retrieved", {
      walletAddress: walletAddress,
      serverWalletAddress: serverWalletAddress,
      encryptedPrivateKey: encryptedPrivateKey,
      privateKeyHash: privateKeyHash,
    });

    // Check if the wallet exists
    if (walletAddress == "0x0000000000000000000000000000000000000000") {
      logger.warn(
        "Server Wallet",
        "No server wallet configured for this account"
      );
      return {
        privateKey: null,
        error: "No server wallet configured for this account",
      };
    }

    // Use the device's private key from .env to create an authentication wallet
    // This key should belong to a registered device in the Franky contract
    if (!process.env.HEDERA_PRIVATE_KEY) {
      logger.error(
        "Server Wallet",
        "Missing HEDERA_PRIVATE_KEY environment variable"
      );
      return { privateKey: null, error: "Device private key not available" };
    }

    try {
      // Remove 0x prefix if present in the private key
      let devicePrivateKey = process.env.HEDERA_PRIVATE_KEY;
      if (devicePrivateKey.startsWith("0x")) {
        devicePrivateKey = devicePrivateKey.substring(2);
      }

      // Create the authentication wallet using the device's private key
      const ethersWallet = new ethers.Wallet(devicePrivateKey);
      logger.debug(
        "Server Wallet",
        "Created authentication wallet using device key",
        {
          address: ethersWallet.address,
        }
      );

      // 3. Decrypt the server wallet private key using Lit Protocol
      const decryptionResult = await decryptServerWallet(
        ethersWallet,
        walletAddress.toLowerCase(),
        encryptedPrivateKey,
        privateKeyHash
      );

      if (decryptionResult.error) {
        logger.error("Server Wallet", "Failed to decrypt server wallet", {
          error: decryptionResult.error,
        });
        return {
          privateKey: null,
          error: `Decryption failed: ${decryptionResult.error}`,
        };
      }

      logger.info(
        "Server Wallet",
        "Successfully decrypted server wallet private key"
      );
      return { privateKey: decryptionResult.decryptedData, error: null };
    } catch (walletError) {
      logger.error(
        "Server Wallet",
        "Failed to create authentication wallet using device key",
        walletError
      );
      return {
        privateKey: null,
        error: `Failed to create authentication wallet: ${
          walletError instanceof Error
            ? walletError.message
            : String(walletError)
        }`,
      };
    }
  } catch (error) {
    logger.error(
      "Server Wallet",
      "Error retrieving or decrypting server wallet",
      error
    );
    return {
      privateKey: null,
      error: `Error retrieving or decrypting server wallet: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  */
}

// Create a Hedera client for the user with the given private key
async function createCustomClient(
  accountIdOrEvmAddress: string,
  privateKey: string
): Promise<Client> {
  try {
    // Check if the input looks like an EVM address
    if (accountIdOrEvmAddress.startsWith("0x")) {
      // Handle EVM address by getting the account ID from the mirror node
      const evmAddress = accountIdOrEvmAddress;

      try {
        // Use the mirror node API to get the account ID
        const response = await fetch(
          `https://testnet.mirrornode.hedera.com/api/v1/accounts/${evmAddress}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to get account ID for EVM address: ${response.statusText}`
          );
        }

        const data = await response.json();
        const hederaAccountId = data.account;

        logger.debug(
          "HIP991",
          `Resolved EVM address ${evmAddress} to Hedera account ID ${hederaAccountId}`
        );

        // Now create the client with the resolved account ID
        const userAccountId = AccountId.fromString(hederaAccountId);
        const userPrivateKey = PrivateKey.fromStringECDSA(privateKey);
        return Client.forTestnet().setOperator(userAccountId, userPrivateKey);
      } catch (error) {
        logger.error(
          "HIP991",
          `Error resolving EVM address ${evmAddress}`,
          error
        );
        throw new Error(
          `Error resolving EVM address: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else {
      // Handle regular Hedera account ID (no changes to this path)
      const userAccountId = AccountId.fromString(accountIdOrEvmAddress);
      const userPrivateKey = PrivateKey.fromStringECDSA(privateKey);
      return Client.forTestnet().setOperator(userAccountId, userPrivateKey);
    }
  } catch (error) {
    logger.error("HIP991", "Error creating user client", error);
    throw new Error(
      `Error creating user client: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

interface AgentData {
  id: string;
  device_address: string;
  owner_address: string;
  perApiCallFee: string;
  metadata_url: string;
  inboundTopicId: string;
  outboundTopicId: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  account_id: string | null;
  profile_topic_id: string | null;
  encryptedPrivateKey: string | null;
}

// Add a helper function to fetch agent details and character data
async function fetchAgentAndCharacterData(agentAddress: string): Promise<{
  agent: AgentData | null;
  character: ExtendedCharacter | null;
  feeInHbar: number;
  error?: string;
}> {
  try {
    logger.info(
      "Agent Init",
      `Fetching agent details for address: ${agentAddress}`
    );

    // Fetch agent details from Supabase instead of graph API
    const agentResponse = await fetch(
      `https://franky-hedera.vercel.app/api/db/agents?address=${agentAddress}`
    );

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      logger.error("Agent Init", `Failed to fetch agent details: ${errorText}`);
      return {
        agent: null,
        character: null,
        feeInHbar: 0.5,
        error: `Failed to fetch agent details: ${agentResponse.status} ${errorText}`,
      };
    }

    const [agentData] = await agentResponse.json(); // Get first agent since response is an array
    logger.info("Agent Init", "Agent details fetched successfully");

    // Extract the character config URL from the agent data
    const metadataUrl = agentData.metadataUrl;

    if (!metadataUrl) {
      logger.error("Agent Init", "No character config found in agent data");
      return {
        agent: {
          ...agentData,
          inboundTopicId: agentData.inboundTopicId,
          outboundTopicId: agentData.outboundTopicId,
          perApiCallFee: agentData.perApiCallFee,
          profile_topic_id: agentData.profileTopicId,
          account_id: agentData.accountId
        },
        character: null,
        feeInHbar: agentData.perApiCallFee,
        error: "No character config found in agent data",
      };
    }

    logger.info(
      "Agent Init",
      `Fetching character data from: ${metadataUrl}`
    );

    // Fetch character data from metadata URL
    const characterResponse = await fetch(metadataUrl);

    if (!characterResponse.ok) {
      const errorText = await characterResponse.text();
      logger.error(
        "Agent Init",
        `Failed to fetch character data: ${errorText}`
      );
      return {
        agent: {
          ...agentData,
          inboundTopicId: agentData.inboundTopicId,
          outboundTopicId: agentData.outboundTopicId,
          perApiCallFee: agentData.perApiCallFee,
          profile_topic_id: agentData.profileTopicId,
          account_id: agentData.accountId
        },
        character: null,
        feeInHbar: agentData.perApiCallFee,
        error: `Failed to fetch character data: ${characterResponse.status} ${errorText}`,
      };
    }

    const characterData = await characterResponse.json();
    logger.info("Agent Init", "Character data fetched successfully");

    // Extract the character from the characterData
    const baseCharacter = characterData.character || characterData;
    
    // Try to load additional character details from local file if available
    let enhancedCharacter = { ...baseCharacter };
    
    try {
      // Try to load the franky.json file for additional character details
      const charactersDir = path.join(process.cwd(), 'characters');
      const frankyFilePath = path.join(charactersDir, 'franky.json');
      
      if (fs.existsSync(frankyFilePath)) {
        logger.info("Agent Init", `Loading additional character details from: ${frankyFilePath}`);
        const frankyFileContent = fs.readFileSync(frankyFilePath, 'utf8');
        const frankyData = JSON.parse(frankyFileContent);
        
        // Merge franky character data with base character data
        enhancedCharacter = {
          ...enhancedCharacter,
          ...frankyData,
          // Ensure we preserve any existing character ID
          id: enhancedCharacter.id || frankyData.id,
          characterId: enhancedCharacter.characterId || frankyData.id,
          // Add inbound/outbound topic IDs for the client reference
          inboundTopicId: agentData.inboundTopicId,
          outboundTopicId: agentData.outboundTopicId,
          profileTopicId: agentData.profileTopicId,
          accountId: agentData.accountId
        };
        
        logger.info("Agent Init", `Enhanced character data with Franky details`);
      }
    } catch (characterError) {
      // Just log the error but continue - this is an enhancement, not required
      logger.warn("Agent Init", `Error enhancing character data, continuing with base data: ${characterError}`);
    }

    // Convert the perApiCallFee from wei to HBAR
    // Assuming the fee is stored in wei and 1 HBAR = 100,000,000 wei
    const feeInWei = agentData.per_api_call_fee
      ? Number(agentData.per_api_call_fee)
      : 50000000; // Default to 0.5 HBAR in wei
    const feeInHbar = Number(formatEther(BigInt(feeInWei))); // Convert wei to HBAR

    logger.info("Agent Init", `Agent fee set to ${feeInHbar} HBAR`);

    return { 
      agent: {
        ...agentData,
        inboundTopicId: agentData.inboundTopicId,
        outboundTopicId: agentData.outboundTopicId,
        perApiCallFee: agentData.perApiCallFee,
        profile_topic_id: agentData.profileTopicId,
        account_id: agentData.accountId
      }, 
      character: enhancedCharacter, 
      feeInHbar 
    };
  } catch (error) {
    logger.error("Agent Init", "Error fetching agent or character data", error);
    return {
      agent: null,
      character: null,
      feeInHbar: 0.5,
      error: `Error fetching agent or character data: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

// Start the server
async function startServer() {
  try {
    // Validate environment
    validateEnvironment();

    // Initialize MCP (Blockchain Agent Tools)
    logger.info("Server", "Initializing MCP server");
    const { mcpServer, openAIClient, serverClient } = await initializeMCP();

    // Store initialized services in state
    state.mcpServer = mcpServer;
    state.openAIClient = openAIClient;
    state.serverClient = serverClient;

    // Initialize character
    logger.info("Server", "Loading character");
    state.activeCharacter = await initializeCharacter();
    if (!state.activeCharacter) {
      logger.warn("Server", "No character loaded");
    } else {
      logger.info("Server", `Character loaded: ${state.activeCharacter.name}`);
    }

    // Check Ollama availability
    logger.info("Server", "Checking Ollama model availability");
    const ollamaCheckResult = await checkOllamaModel();
    state.ollamaAvailable = ollamaCheckResult.available;

    if (ollamaCheckResult.available) {
      logger.info("Server", "Ollama model is available");
      if (ollamaCheckResult.fallbackModel) {
        logger.info(
          "Server",
          `Using fallback model: ${ollamaCheckResult.fallbackModel}`
        );
        process.env.OLLAMA_FALLBACK_MODEL = ollamaCheckResult.fallbackModel;
      }
    } else {
      logger.warn(
        "Server",
        "Ollama model is not available, will fallback to OpenAI"
      );
    }

    // Create Express app
    const app = express();
    app.use(cors());
    app.use(bodyParser.json());

    // Status endpoint - support both GET and POST methods
    const statusHandler = (req: Request, res: Response) => {
      res.json({
        status: "online",
        ollamaAvailable: state.ollamaAvailable,
        activeCharacter: state.activeCharacter
          ? state.activeCharacter.name
          : null,
        availableCharacters: listCharacters(),
      });
    };
    
    // Register the handler for both GET and POST methods
    app.get("/status", statusHandler);
    app.post("/status", statusHandler);

    // Create a simplified ConnectionInfo interface
    interface ConnectionInfo {
      connectionTopicId: string;
      userAccountId: string;
      agentAccountId: string;
      characterId: string;
      createdAt: string;
      lastMessageAt?: string;
    }

    // Define the initialize endpoint
    app.post("/initialize", (req: Request, res: Response) => {
      // Get the account ID and agent address from headers
      const accountIdHeader = req.headers["x-account-id"];
      const agentAddressHeader = req.headers["x-agent-address"];

      // Extract first value if array, or use the string value, defaulting to empty string if null
      const accountId = Array.isArray(accountIdHeader) ? accountIdHeader[0] : (accountIdHeader || "");
      const agentAddress = Array.isArray(agentAddressHeader) ? agentAddressHeader[0] : (agentAddressHeader || "");

      if (!accountId) {
        return res.status(400).json({
          error: "Missing x-account-id header",
        });
      }

      if (!agentAddress) {
        return res.status(400).json({
          error: "Missing x-agent-address header",
        });
      }

      // Convert EVM address to Hedera account ID if needed
      const convertToHederaId = async (address: string): Promise<string> => {
        if (address.startsWith("0x")) {
          try {
                const response = await fetch(
              `https://testnet.mirrornode.hedera.com/api/v1/accounts/${address}`
                );
                if (!response.ok) {
              throw new Error(`Failed to get account ID for EVM address: ${response.statusText}`);
                }
                const data = await response.json();
            logger.debug("API", `Resolved EVM address ${address} to Hedera account ID ${data.account}`);
            return data.account;
              } catch (error) {
            logger.error("API", `Error resolving EVM address ${address}`, error);
            throw new Error(`Error resolving EVM address: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        return address;
      };

      // Convert only the user's account ID to Hedera format
      convertToHederaId(accountId)
        .then((hederaAccountId) => {
          // Check if user already has a mapping for this agent
          getUserAgentMapping(hederaAccountId).then(existingMapping => {
            if (existingMapping && existingMapping.agentAddress === agentAddress) {
              // User already has a connection to this agent
              logger.info("API", `User ${hederaAccountId} already has connection to agent ${agentAddress}`);
              
              // Return the existing connection details
              return res.status(200).json({
                success: true,
                agent: {
                  address: agentAddress,
                  inboundTopicId: existingMapping.inboundTopicId,
                  outboundTopicId: existingMapping.outboundTopicId,
                  connectionTopicId: existingMapping.connectionTopicId,
                },
                character: getCharacterData(existingMapping.characterId) || {
                  id: existingMapping.characterId,
                  name: "Agent",
                  description: "An AI assistant",
                  inboundTopicId: existingMapping.inboundTopicId,
                  outboundTopicId: existingMapping.outboundTopicId,
                  connectionTopicId: existingMapping.connectionTopicId,
                },
                message: "Using existing connection"
              });
            } else {
              // No existing connection or different agent, proceed with initialization
              initializeNewConnection(hederaAccountId);
            }
          }).catch(err => {
            // Error checking mapping, proceed with initialization
            logger.error("API", `Error checking user mapping: ${err}`);
            initializeNewConnection(hederaAccountId);
          });
        }).catch(error => {
          return res.status(500).json({
            error: `Error converting account ID to Hedera format: ${error.message}`,
          });
        });

      // Function to initialize a new connection
      function initializeNewConnection(hederaAccountId: string) {
        // First get the server wallet private key
        getServerWalletPrivateKey(accountId)
          .then(async ({ privateKey, error: walletError }) => {
            if (walletError) {
              return res.status(500).json({
                error: `Error retrieving server wallet: ${walletError}`,
              });
            }

            if (!privateKey) {
              return res.status(500).json({
                error: "Failed to retrieve private key for server wallet",
              });
            }

            try {
              // Fetch agent details and character data first
              const {
                agent,
                character: agentCharacter,
                feeInHbar: agentFee,
                error: fetchError,
              } = await fetchAgentAndCharacterData(agentAddress);

              if (fetchError || !agent || !agent.inboundTopicId || !agent.outboundTopicId) {
                return res.status(500).json({
                  error: fetchError || "Failed to retrieve agent data or topic IDs",
                });
              }

              // Create HCS11Client to update account memo with profile topic ID
              if (agent.profile_topic_id && agent.account_id) {
                const hcs11Client = new HCS11Client({
                  network: "testnet",
                  auth: {
                    operatorId: agent.account_id,
                    privateKey: PrivateKey.fromStringDer(agent.encryptedPrivateKey || '').toString()
                  },
                  logLevel: "info"
                });

                try {
                  await hcs11Client.updateAccountMemoWithProfile(agent.account_id, agent.profile_topic_id);
                  logger.info("API", `Updated account memo with profile topic ID ${agent.profile_topic_id} for agent account ${agent.account_id}`);
                } catch (memoError) {
                  logger.error("API", `Failed to update account memo for agent ${agent.account_id}: ${memoError}`);
                  // Continue anyway as this is not critical
                }
              }

              // Create agent HCS10Client using the decrypted private key
              const agentClient = new HCS10Client({
                network: "testnet",
                operatorId: agent.account_id || '',
                operatorPrivateKey: PrivateKey.fromStringDer(agent.encryptedPrivateKey || '').toString(),  // Already in ECDSA format
                logLevel: "debug"
              });
              
              // IMPORTANT: Set up monitoring for the agent's inbound topic before sending any requests
              // This ensures the agent is listening for connection requests
              logger.info("API", `Setting up monitoring for agent's inbound topic: ${agent.inboundTopicId}`);
              
              // Create a monitor service for the agent
              const agentMonitorService = new MonitorService(agentClient);
              
              // Set the character for this topic
              if (agentCharacter) {
                agentMonitorService.setCharacterForTopic(agent.inboundTopicId, agentCharacter);
              }
              
              // Start monitoring the inbound topic
              await agentMonitorService.startMonitoringTopic(agent.inboundTopicId);
              
              // Register the topic type
              agentMonitorService.registerTopicType(agent.inboundTopicId, 'inbound', { 
                characterId: agentCharacter?.id || agentCharacter?.characterId || '' 
              });
              
              // Store the monitor service instance for future use
              monitorServices.set(agent.inboundTopicId, agentMonitorService);
              
              // Also monitor outbound topic
              await agentMonitorService.startMonitoringTopic(agent.outboundTopicId);
              agentMonitorService.registerTopicType(agent.outboundTopicId, 'outbound', { 
                characterId: agentCharacter?.id || agentCharacter?.characterId || '' 
              });
              monitorServices.set(agent.outboundTopicId, agentMonitorService);
              
              logger.info("API", `Successfully set up monitoring for agent's topics`);
              
              // Store agent info with the private key in ECDSA format
              await storageService.saveAgentInfo({
                characterId: agentCharacter?.id || agentCharacter?.characterId || '',
                accountId: agent.account_id || '',
                privateKey: agent.encryptedPrivateKey || '',  // Store ECDSA key directly
                inboundTopicId: agent.inboundTopicId,
                outboundTopicId: agent.outboundTopicId
              });
              
              logger.info("API", `Saved agent info`);

              // Create user client for sending the connection request
              const userClient = new HCS10Client({
                network: "testnet",
                operatorId: hederaAccountId,
                operatorPrivateKey: PrivateKey.fromStringECDSA(privateKey).toString(),  // Already in ECDSA format
                logLevel: "debug"
              });

              // Send connection request in HCS-10 format
              const result = await userClient.submitPayload(
                agent.inboundTopicId,
                {
                  p: 'hcs-10',
                  op: 'connection_request',
                  operator_id: `${agent.outboundTopicId}@${hederaAccountId}`,
                  m: 'Connection request',
                  data: JSON.stringify({
                    timestamp: Date.now(),
                    userId: hederaAccountId
                  })
                },
                undefined, // No submit key needed
                false // No fee required for connection request
              );

              if (!result || !result.topicSequenceNumber) {
                throw new Error("Failed to submit connection request");
              }

              // Get connection request ID
              const requestId = result.topicSequenceNumber.toNumber();
              
              logger.debug("API", `Connection request submitted with sequence number: ${requestId}`);

              // Wait for connection confirmation
              logger.info("API", "Waiting for connection topic creation...");
              
              // Poll for connection confirmation
              let connectionTopicId: string | null = null;
              let attempts = 0;
              const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max wait
              
              while (!connectionTopicId && attempts < maxAttempts) {
                attempts++;
                
                try {
                  logger.debug("API", `Polling attempt ${attempts}/${maxAttempts} for connection confirmation`);
                  const { messages } = await userClient.getMessages(agent.outboundTopicId);
                  
                  if (messages && messages.length > 0) {
                    for (const message of messages) {
                      // Check for standard HCS-10 connection_created message
                      if (
                        message.p === 'hcs-10' && 
                        message.op === 'connection_created' && 
                        message.connection_id === requestId &&
                        message.connection_topic_id
                      ) {
                        connectionTopicId = message.connection_topic_id;
                        logger.info("API", `Found connection confirmation with topic ID: ${connectionTopicId}`);
                        break;
                      }
                    }
                  }
                  
                  if (!connectionTopicId) {
                    logger.debug("API", `No connection confirmation found yet, waiting 2 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  }
                } catch (error) {
                  logger.error("API", "Error polling for connection confirmation", error);
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              }
              
              if (!connectionTopicId) {
                throw new Error("Connection request timed out");
              }

              logger.info("API", `Connection topic created: ${connectionTopicId}`);

              // Make sure we have agent character data
              if (!agentCharacter) {
                return res.status(500).json({
                  error: "Agent character data not available"
                });
              }

              // Set up fee gating for the connection topic if needed
              if (agentFee > 0) {
                logger.info("API", `Setting up fee gating for connection topic ${connectionTopicId} with fee ${agentFee} HBAR`);
                
                const feeConfig: FeeConfig = {
                  feeAmount: agentFee,
                  feeCollector: agent.owner_address,
                  useHip991: true,
                  exemptAccounts: [agent.owner_address, agent.account_id || ''] // Exempt the agent owner and user for initial setup
                };
                
                // Register the fee configuration
                registerFeeGatedConnection(connectionTopicId, feeConfig);
                
                logger.info("API", `Fee gating configured for connection topic ${connectionTopicId}`);
              }

              // Store connection information
              try {
                // Define directories
                const characterId = agentCharacter.id || agentCharacter.characterId || "default";
                
                // Save connection information
                const connectionInfo: ConnectionInfo = {
                  connectionTopicId,
                  userAccountId: hederaAccountId,
                  agentAccountId: agent.account_id || '',
                  characterId: characterId,
                  createdAt: new Date().toISOString()
                };
                
                // Save the connection details
                saveConnection(connectionInfo);
                
                // Save the character data for future use
                saveCharacterData(characterId, agentCharacter);
                
                // Save user-agent mapping
                const mappingData: UserAgentMapping = {
                  agentAddress: agentAddress,
                  connectionTopicId,
                  characterId,
                  inboundTopicId: agent.inboundTopicId,
                  outboundTopicId: agent.outboundTopicId,
                  lastActive: new Date().toISOString()
                };
                
                saveUserAgentMapping(hederaAccountId, mappingData);
                
                logger.info("API", `Saved all connection and mapping information for ${connectionTopicId}`);
              } catch (storageError) {
                logger.error("API", "Error saving connection information", storageError);
                // Continue even if storage fails
              }

              // Set up monitoring for messages on the connection topic
              try {
                // Create a new monitor service if not already created
                if (!monitorServices.has(connectionTopicId)) {
                  logger.info("API", `Setting up message monitoring for topic ${connectionTopicId}`);
                  
                  const monitorService = new MonitorService(userClient);
                  
                  // Set the character for this topic
                  monitorService.setCharacterForTopic(connectionTopicId, agentCharacter);
                  
                  // Start monitoring for messages
                  await monitorService.startMonitoringTopic(connectionTopicId);
                  
                  // Register the topic type
                  monitorService.registerTopicType(connectionTopicId, 'connection', {
                    characterId: agentCharacter.id || agentCharacter.characterId,
                    userId: hederaAccountId
                  });
                  
                  // Store the monitor service instance for future use
                  monitorServices.set(connectionTopicId, monitorService);
                  
                  logger.info("API", `Started monitoring topic ${connectionTopicId} for responses`);
                }
              } catch (monitorError) {
                logger.error("API", `Error setting up monitoring for topic: ${monitorError}`);
                // Continue even if monitoring setup fails
              }

              // Return success with connection details
              return res.status(200).json({
                success: true,
              agent: {
                  address: agentAddress,
                  inboundTopicId: agent.inboundTopicId,
                  outboundTopicId: agent.outboundTopicId,
                  connectionTopicId: connectionTopicId,
                  feePerMessage: agentFee,
                },
                character: {
                  ...agentCharacter,
                  // Make sure topic IDs are also available in the character object
                  inboundTopicId: agent.inboundTopicId,
                  outboundTopicId: agent.outboundTopicId,
                  connectionTopicId: connectionTopicId,
                } as ExtendedCharacter,
            });
          } catch (error) {
              logger.error("API", "Error initializing connection", error);
              return res.status(500).json({
                error: `Error initializing connection: ${
                error instanceof Error ? error.message : String(error)
              }`,
            });
          }
          });
      }
    });

    // Chat endpoint using HCS-10
    app.post("/chat", (req: Request, res: Response) => {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get the account ID or EVM address from headers
      const userAddress = (req.headers["x-account-id"] || req.headers["account-id"]) as string;
      if (!userAddress) {
        return res.status(400).json({ error: "Account ID header (x-account-id or account-id) is required" });
      }

      // Convert EVM address to Hedera account ID if needed
      (async () => {
        try {
          let hederaAccountId = userAddress;
          
          // Check if the input is an EVM address
          if (userAddress.startsWith("0x")) {
            logger.info("API", `Converting EVM address ${userAddress} to Hedera account ID`);
            
            // Query the mirror node to get the Hedera account ID
            const response = await fetch(
              `https://testnet.mirrornode.hedera.com/api/v1/accounts/${userAddress}`
            );

            if (!response.ok) {
              logger.error("API", `Failed to get account ID for EVM address: ${response.statusText}`);
              return res.status(400).json({
                error: `Failed to get account ID for EVM address: ${response.statusText}`
              });
            }

            const data = await response.json();
            hederaAccountId = data.account;
            logger.info("API", `Converted EVM address ${userAddress} to Hedera account ID ${hederaAccountId}`);
          }

          // Check for user agent mapping using the Hedera account ID
          const mapping = await getUserAgentMapping(hederaAccountId);
          if (!mapping) {
            logger.warn("API", `No agent mapping found for user ${hederaAccountId}`);
            return res.status(400).json({
              error: "No existing agent connection found. Please initialize first." 
            });
          }
          
          // Use the connection topic ID from the mapping
          const topicId = mapping.connectionTopicId;
          logger.info("API", `Using mapped agent connection for user ${hederaAccountId}: ${topicId}`);
          
          // Continue processing with the topic ID and Hedera account ID
          await processChatRequest(topicId, hederaAccountId);
        } catch (err) {
          logger.error("API", `Error processing account ID: ${err}`);
          return res.status(500).json({ 
            error: `Error processing account ID: ${err instanceof Error ? err.message : String(err)}` 
          });
        }
      })();

      // Process the chat request with the topic ID and Hedera account ID
      async function processChatRequest(topicId: string, hederaAccountId: string) {
        try {
          // Get the server wallet private key
          const { privateKey, error } = await getServerWalletPrivateKey(hederaAccountId);
          
          if (error) {
            logger.error("API", "Error getting server wallet", {
              accountId: hederaAccountId,
              error,
            });
            return res
              .status(401)
              .json({ error: `Server wallet access error: ${error}` });
          }

          if (!privateKey) {
            logger.error("API", "No private key returned", { accountId: hederaAccountId });
            return res
              .status(404)
              .json({ error: "Server wallet not found or not accessible" });
          }

          logger.info("API", `Sending message to connection topic ${topicId}`);
          
          // Get the connection service
          const connectionService = await getConnectionService();
          
          // Generate unique IDs for message and response tracking
          const messageId = `msg-${uuidv4()}`;
          const responseId = `resp-${uuidv4()}`;
          
          // Format the message with appropriate IDs for HCS-10 standard
          const formattedMessage = {
            id: messageId,
            prompt: message,
            response_id: responseId,
            timestamp: Date.now()
          };
          
          console.log("privateKey",privateKey);
          console.log("formattedMessage",formattedMessage);
          console.log("hederaAccountId",hederaAccountId);
          console.log("topicId",topicId);
          // Send message using the ConnectionService
          const sendResult = await connectionService.sendMessage(
            topicId,
            formattedMessage,
            hederaAccountId,
            privateKey,
            'User message'
          );
          
          logger.info("API", `Successfully sent message to connection topic ${topicId} with sequence number ${sendResult.sequenceNumber}`);

          // Make sure we're monitoring this topic for responses
          if (!monitorServices.has(topicId)) {
            logger.info("API", `Setting up message monitoring for topic ${topicId}`);
            
            // Create HCS-10 client with user credentials
            const userClient = new HCS10Client({
              network: 'testnet' as NetworkType,
              operatorId: hederaAccountId,
              operatorPrivateKey: PrivateKey.fromStringECDSA(privateKey).toString(),
              logLevel: 'info',
              prettyPrint: true
            });
            
            // Create a new monitor service for the user
            const monitorService = new MonitorService(userClient);
            
            try {
              // Try to get character data from user-agent mapping
              const mapping = await getUserAgentMapping(hederaAccountId);
              if (mapping) {
                const characterData = getCharacterData(mapping.characterId);
                if (characterData) {
                  logger.info("API", `Using character data for ${mapping.characterId}`);
                  monitorService.setCharacterForTopic(topicId, characterData);
                }
              }
              
              // Start monitoring for messages
              await monitorService.startMonitoringTopic(topicId);
              
              // Register the topic type
              monitorService.registerTopicType(topicId, 'connection', {
                characterId: mapping?.characterId,
                userId: hederaAccountId
              });
              
              // Store the monitor service instance for future use
              monitorServices.set(topicId, monitorService);
              
              logger.info("API", `Started monitoring topic ${topicId} for responses`);
            } catch (monitorError) {
              logger.error("API", `Error setting up monitoring for topic: ${monitorError}`);
              // Continue even if monitoring setup fails
            }
          }

          // Return success with message tracking info
          res.json({
            status: "success",
            message: "Message sent successfully",
            messageId: messageId,
            responseId: responseId,
            sequenceNumber: sendResult.sequenceNumber,
            hederaAccountId: hederaAccountId // Include the resolved Hedera account ID in the response
          });
        } catch (error) {
          logger.error("API", "Error sending message", error);
          res.status(500).json({
            error: `Error sending message: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      }
    });

    // Get response endpoint
    app.get("/viewresponse/:messageId", (req: Request, res: Response) => {
      const { messageId } = req.params;

      if (!messageId) {
        return res.status(400).json({ error: "Message ID is required" });
      }

      // Get the account ID from headers
      const accountId = req.headers["x-account-id"] as string;
      // Topic ID is now optional - we'll automatically use the user's mapped agent
      let topicId = req.headers["topic-id"] as string;

      if (!accountId) {
        return res.status(400).json({ error: "x-account-id header is required" });
      }

      // Always check for a user agent mapping first, regardless of whether a topic ID was provided
      getUserAgentMapping(accountId).then(mapping => {
        if (!mapping) {
          // No mapping found, return error
          logger.warn("API", `No agent mapping found for user ${accountId}`);
          return res.status(400).json({ 
            error: "No existing agent connection found. Please initialize first." 
          });
        }
        
        // If topic ID is not provided, use the one from the mapping
        if (!topicId) {
          topicId = mapping.connectionTopicId;
          logger.info("API", `Using mapped agent connection for user ${accountId}: ${topicId}`);
        } else {
          // Verify the provided topic ID matches the mapping
          if (topicId !== mapping.connectionTopicId) {
            logger.warn("API", `Provided topic ID ${topicId} does not match mapped connection ${mapping.connectionTopicId} for user ${accountId}`);
                return res.status(400).json({
              error: "The provided topic ID does not match your active agent connection."
            });
          }
          logger.info("API", `Using provided topic ID ${topicId} which matches mapped connection`);
        }
        
        // Continue processing with the topic ID
        processResponseRequest();
      }).catch(err => {
        logger.error("API", `Error getting user agent mapping: ${err}`);
        return res.status(500).json({ error: "Error retrieving user agent mapping" });
      });

      // Process the response request with the topic ID
      function processResponseRequest() {
        // First get the server wallet private key
        getServerWalletPrivateKey(accountId)
          .then(async ({ privateKey, error }) => {
            if (error) {
              logger.error("API", "Error getting server wallet", {
                accountId,
                error,
              });
              return res
                .status(401)
                .json({ error: `Server wallet access error: ${error}` });
            }

            if (!privateKey) {
              logger.error("API", "No private key returned", { accountId });
              return res
                .status(404)
                .json({ error: "Server wallet not found or not accessible" });
            }

            try {
              // Create HCS-10 client with user credentials
              const hcs10Client = new HCS10Client({
                network: 'testnet' as NetworkType,
                operatorId: accountId,
                operatorPrivateKey: PrivateKey.fromStringECDSA(privateKey).toString(),
                logLevel: 'info',
                prettyPrint: true
              });

              // Get messages from topic
              const { messages } = await hcs10Client.getMessages(topicId);
              
              // Search for messages that match either the sequence number or the response ID
              let foundMessage = null;
              
              // First try to find by sequence number
              foundMessage = messages.find((msg: { sequence_number: number }) => 
                msg.sequence_number.toString() === messageId
              );
              
              // If not found, try to find by response ID in the message data
              if (!foundMessage) {
                for (const msg of messages) {
                  if (msg.data && typeof msg.data === 'string') {
                    try {
                      const parsedData = JSON.parse(msg.data);
                      // Check if this message has the target response ID
                      if (parsedData.id === messageId || parsedData.response_id === messageId) {
                        foundMessage = {
                          ...msg,
                          parsedData
                        };
                        break;
                      }
                    } catch (e) {
                      // Skip messages that aren't valid JSON
                      continue;
                    }
                  }
                }
              }

              if (!foundMessage) {
                return res.status(404).json({ error: "Message not found" });
              }

              res.json({
                status: "success",
                messageData: foundMessage
              });
            } catch (error) {
              logger.error("API", "Error getting message", error);
              res.status(500).json({
                error: `Error getting message: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              });
            }
          })
          .catch((error) => {
          logger.error(
            "API",
              "Unexpected error in server wallet retrieval",
            error
          );
            res.status(500).json({
              error: `Unexpected error retrieving server wallet: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
          });
      }
    });

    // Destruct/cleanup agent endpoint
    app.post("/destruct", (req: Request, res: Response) => {
      // Get the account ID from headers
      const accountId = req.headers["x-account-id"] as string;

      if (!accountId) {
        return res.status(400).json({ error: "x-account-id header is required" });
      }

      // First check if user has an agent mapping
      getUserAgentMapping(accountId).then(async mapping => {
        if (!mapping) {
          logger.warn("API", `No agent mapping found for user ${accountId}`);
                return res.status(400).json({
            error: "No active agent to destruct."
          });
        }
        
        // Get the server wallet private key
        const { privateKey, error: walletError } = await getServerWalletPrivateKey(accountId);
        
        if (walletError || !privateKey) {
          logger.error("API", `Error getting server wallet for cleanup: ${walletError}`);
              return res.status(500).json({
            error: `Error retrieving server wallet: ${walletError || "No private key returned"}`
          });
        }
        
        try {
          logger.info("API", `Cleaning up connection ${mapping.connectionTopicId} for user ${accountId}`);
          
          // Create client with user credentials
          const userClient = new HCS10Client({
            network: 'testnet' as NetworkType,
            operatorId: accountId,
            operatorPrivateKey: PrivateKey.fromStringECDSA(privateKey).toString(),
            logLevel: 'info',
            prettyPrint: true
          });
          
          // Send close message to the connection topic
          await userClient.sendMessage(
            mapping.connectionTopicId,
            JSON.stringify({
              type: "CONNECTION_CLOSED",
              timestamp: Date.now(),
              reason: "User requested cleanup"
            }),
            "Connection closed"
          );
          
          // Stop monitoring the connection topic
          const monitorService = monitorServices.get(mapping.connectionTopicId);
          if (monitorService) {
            await monitorService.stopMonitoringTopic(mapping.connectionTopicId);
            monitorServices.delete(mapping.connectionTopicId);
            logger.info("API", `Stopped monitoring for topic ${mapping.connectionTopicId}`);
          }
          
          // Remove the user-agent mapping
          const mappingFile = path.join(USER_MAPPINGS_DIR, `${accountId.replace(/\./g, '_')}.json`);
          if (fs.existsSync(mappingFile)) {
            fs.unlinkSync(mappingFile);
            logger.info("API", `Removed mapping file for user ${accountId}`);
          }
          
          // Remove from memory cache
          userAgentMappings.delete(accountId);
          
          // Return success
              res.json({
                status: "success",
            message: "Agent connection cleaned up successfully",
            connectionTopicId: mapping.connectionTopicId,
            agentAddress: mapping.agentAddress,
            characterId: mapping.characterId,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          logger.error("API", `Error during agent cleanup: ${error}`);
          res.status(500).json({
            error: `Error cleaning up agent: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }).catch(err => {
        logger.error("API", `Error checking user agent mapping: ${err}`);
            res.status(500).json({
          error: `Error retrieving user agent mapping: ${err instanceof Error ? err.message : String(err)}` 
            });
          });
    });

    // List available characters
    app.get("/characters", (req: Request, res: Response) => {
      try {
        const characters = listCharactersWithInfo();
        res.json({ characters });
      } catch (error) {
        logger.error("API", "Error listing characters", error);
        res.status(500).json({ error: "Error listing characters" });
      }
    });

    // Check server wallet status
    app.get("/wallet-status", (req: Request, res: Response) => {
      // Get the account ID from headers
      const accountId = req.headers["account-id"] as string;

      if (!accountId) {
        return res.status(400).json({ error: "account-id header is required" });
      }

      // Resolve EVM address to Hedera account ID if needed
      let resolvedAccountId = accountId;

      // Convert EVM address to Hedera account ID before checking agent existence
      if (accountId.startsWith("0x")) {
        try {
          // Use the mirror node API to get the account ID
          fetch(
            `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
          )
            .then(async (response) => {
              if (!response.ok) {
                logger.error(
                  "API",
                  `Failed to get account ID for EVM address: ${response.statusText}`
                );
                return res.status(400).json({
                  error: `Failed to get account ID for EVM address: ${response.statusText}`,
                });
              }

              const data = await response.json();
              resolvedAccountId = data.account;

              logger.debug(
                "API",
                `Resolved EVM address ${accountId} to Hedera account ID ${resolvedAccountId}`
              );

              // Continue with the resolved account ID
              continueWithResolvedAccountId(resolvedAccountId);
            })
            .catch((error) => {
              logger.error(
                "API",
                `Error resolving EVM address ${accountId}`,
                error
              );
              return res.status(500).json({
                error: `Error resolving EVM address: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              });
            });
        } catch (error) {
          logger.error(
            "API",
            `Error processing EVM address ${accountId}`,
            error
          );
          return res.status(500).json({
            error: `Error processing EVM address: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      } else {
        // Regular account ID, continue immediately
        continueWithResolvedAccountId(resolvedAccountId);
      }

      // Function to continue processing with the resolved account ID
      function continueWithResolvedAccountId(resolvedAccountId: string) {
        // Check if this user has an active agent with the resolved account ID
        if (!hasActiveAgent(resolvedAccountId)) {
          return res.status(400).json({
            error: "No active agent to destruct.",
          });
        }

        // Destroy the agent using the resolved account ID
        destroyAgent(state.serverClient!, resolvedAccountId)
          .then((success) => {
            if (success) {
            res.json({
                status: "success",
                info: "Agent destroyed successfully",
              });
            } else {
              res.status(500).json({ error: "Failed to destroy agent" });
            }
          })
          .catch((error) => {
            logger.error("API", "Error destroying agent", error);
            res.status(500).json({
              error: `Error destroying agent: ${
                error instanceof Error ? error.message : String(error)
              }`,
            });
          });
      }
    });

    // Start the server
    const port = process.env.API_PORT || 8080;
    app.listen(port, () => {
      logger.info("API", `Character MCP API server started on port ${port}`);
      console.log(
        `Character MCP API server is running on http://localhost:${port}`
      );
    });
  } catch (error) {
    logger.error("API", "Error starting server", error);
    process.exit(1);
  }
}

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    logger.error("API", "Fatal error", error);
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { startServer, processInput };
