import * as dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { logger, LogLevel } from "../src/utils/logger";
import {
  mightRequireTools,
  queryOllama,
  isOllamaAvailable,
} from "../src/utils/ollama-client";
import {
  loadCharacter,
  listCharacters,
  createCharacterPrompt,
  findCharacterById,
  listCharactersWithInfo,
} from "../src/characters";
import { Character } from "../src/types";
import { MCPServer } from "../src/utils/mcp-server";
import { MCPOpenAIClient } from "../src/utils/mcp-openai";
import HederaAgentKit from "../src/agent";
import { createHederaTools } from "../src";
import { PrivateKey, Client, AccountId } from "@hashgraph/sdk";
// Import Lit Protocol and ethers for wallet decryption
import { ethers } from "ethers";
// Import local implementations
import { decryptServerWallet } from "./lit-helpers";
// Import contract constants
import { FRANKY_ADDRESS, FRANKY_ABI } from "./constants";
// Import utilities
import { createPublicClient, formatEther, http } from "viem";
import { hederaTestnet } from "./hedera-chain";
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
} from "../src/utils/hip991-agent";
import { v4 as uuidv4 } from "uuid";
// Import node-fetch for making HTTP requests
import fetch from "node-fetch";
import {
  generateResponse,
  initializeMCPState as initializeResponseGenerator,
  checkOllamaModel,
  enhancedToolDetection,
  queryOllamaWithFallback,
} from "../src/utils/response-generator";

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
  transport: http(),
});

const state: AppState = {
  ollamaAvailable: false,
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
    privateKey: "380c56cf5607c879be45c358b81b60a769e0e8d9064dd7c4ad9fdc0e1cbe7d14",
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
async function createUserClient(
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

// Add a helper function to fetch agent details and character data
async function fetchAgentAndCharacterData(agentAddress: string): Promise<{
  agent: any;
  character: Character | null;
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
        agent: agentData,
        character: null,
        feeInHbar: 0.5,
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
        agent: agentData,
        character: null,
        feeInHbar: 0.5,
        error: `Failed to fetch character data: ${characterResponse.status} ${errorText}`,
      };
    }

    const characterData = await characterResponse.json();
    logger.info("Agent Init", "Character data fetched successfully");

    // Extract the character from the characterData
    const character = characterData.character || characterData;

    // Convert the perApiCallFee from wei to HBAR
    // Assuming the fee is stored in wei and 1 HBAR = 100,000,000 wei
    const feeInWei = agentData.perApiCallFee || agentData.per_api_call_fee
      ? Number(agentData.perApiCallFee || agentData.per_api_call_fee)
      : 50000000; // Default to 0.5 HBAR in wei
    const feeInHbar = Number(formatEther(BigInt(feeInWei))); // Convert wei to HBAR

    logger.info("Agent Init", `Agent fee set to ${feeInHbar} HBAR`);

    return { agent: agentData, character, feeInHbar };
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

    // Initialize agent with character endpoint
    app.post("/initialize", (req: Request, res: Response) => {
      // Get the account ID from headers
      const accountId = req.headers["account-id"] as string;

      if (!accountId) {
        return res.status(400).json({ error: "account-id header is required" });
      }

      // Get the agent address from headers instead of character ID from body
      const agentAddress = req.headers["agent-address"] as string;

      // First get the server wallet private key to authenticate the user
      getServerWalletPrivateKey(accountId)
        .then(async ({ privateKey, error: walletError }) => {
          if (walletError) {
            logger.error("API", "Error getting server wallet", {
              accountId,
              error: walletError,
            });
            return res
              .status(401)
              .json({ error: `Server wallet access error: ${walletError}` });
          }

          if (!privateKey) {
            logger.error("API", "No private key returned", { accountId });
            return res
              .status(404)
              .json({ error: "Server wallet not found or not accessible" });
          }

          logger.info(
            "API",
            "Successfully retrieved server wallet private key",
            { accountId }
          );

          try {
            // Create user client using the decrypted private key
            const userClient = await createUserClient(accountId, privateKey);
            // Check if accountId is an EVM address, if so, get the Hedera account ID from mirror node
            let userAccountId;
            if (accountId.startsWith("0x")) {
              try {
                // Use the mirror node API to get the account ID
                const response = await fetch(
                  `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
                );

                if (!response.ok) {
                  throw new Error(
                    `Failed to get account ID for EVM address: ${response.statusText}`
                  );
                }

                const data = await response.json();
                const hederaAccountId = data.account;

                logger.debug(
                  "API",
                  `Resolved EVM address ${accountId} to Hedera account ID ${hederaAccountId}`
                );
                userAccountId = AccountId.fromString(hederaAccountId);
              } catch (error) {
                logger.error(
                  "API",
                  `Error resolving EVM address ${accountId}`,
                  error
                );
                throw new Error(
                  `Error resolving EVM address: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                );
              }
            } else {
              userAccountId = AccountId.fromString(accountId);
            }

            // Variable to hold the character and fee
            let character: Character | null = null;
            let feeInHbar = 0.1; // Default fee

            // Check if we have an agent address - if so, always use it
            if (agentAddress) {
              logger.info(
                "API",
                `Agent address provided: ${agentAddress}, fetching agent details`
              );

              // Fetch agent details and character data
              const {
                agent,
                character: agentCharacter,
                feeInHbar: agentFee,
                error: fetchError,
              } = await fetchAgentAndCharacterData(agentAddress);

              if (fetchError || !agentCharacter) {
                return res.status(404).json({
                  error: fetchError || "Failed to retrieve character data",
                });
              }

              // Use the character and fee from the agent
              character = agentCharacter;
              feeInHbar = agentFee;

              logger.info(
                "API",
                `Using character "${character.name}" from agent ${agentAddress} with fee ${feeInHbar} HBAR`
              );
            } else {
              // No agent address provided, use default character
              logger.info(
                "API",
                "No agent address provided, using Franky character"
              );

              // First try to load Franky specifically
              character = await initializeCharacter("franky");

              // If Franky couldn't be loaded, fall back to active character or initialize a new one
              if (!character) {
                logger.warn(
                  "API",
                  "Could not load Franky character, falling back to active character"
                );
                character =
                  state.activeCharacter || (await initializeCharacter());
              }

              if (!character) {
                return res
                  .status(500)
                  .json({ error: "Could not load default character" });
              }

              logger.info(
                "API",
                `Using character "${character.name}" with fee ${feeInHbar} HBAR`
              );
            }

            // Create the HIP-991 agent for this user and character
            const hip991Agent = await initializeAgent(
              state.serverClient!, // Server client
              AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!), // Server account ID
              PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY!), // Server key
              userAccountId, // User account ID
              userClient.operatorPublicKey, // User public key
              character, // Character
              feeInHbar // Fee (from agent or default)
            );

            res.json({
              status: "success",
              message: `Agent initialized with character ${character.name}`,
              agent: {
                agentAddress: agentAddress || "local", // Use 'local' if no agent address was provided
                characterName: character.name,
                inboundTopicId: hip991Agent.inboundTopicId,
                outboundTopicId: hip991Agent.outboundTopicId,
                greeting: character.first_mes,
                feePerMessage: feeInHbar,
              },
            });
          } catch (error) {
            logger.error("API", "Error initializing agent", error);
            res.status(500).json({
              error: `Error initializing agent: ${
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
    });

    // Chat endpoint using HIP-991 topics
    app.post("/chat", (req: Request, res: Response) => {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

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
            error:
              "No active agent initialized. Please initialize an agent first using the /initialize endpoint.",
          });
        }

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

            logger.info(
              "API",
              "Successfully retrieved server wallet private key",
              { accountId }
            );

            try {
              // Create user client using the decrypted private key
              const userClient = await createUserClient(accountId, privateKey);

              // Get the agent for this user using the resolved account ID
              const agent = getAgentByUserId(resolvedAccountId);
              if (!agent) {
                return res.status(400).json({
                  error:
                    "No active agent found. Please initialize an agent first using the /initialize endpoint.",
                });
              }

              // Send the message to the agent's inbound topic
              const { messageId, responseId, responsePromise } =
                await sendUserMessage(userClient, agent, message);

              // Return immediately with the message IDs
              res.json({
                status: "success",
                message: "Message sent successfully",
                messageId,
                responseId,
                outboundTopicId: agent.outboundTopicId,
                characterName: agent.character.name,
              });

              // The response will be processed asynchronously by the agent
              // The user can retrieve it with the /viewresponse endpoint
            } catch (error) {
              logger.error("API", "Error sending message", error);
              res.status(500).json({
                error: `Error sending message: ${
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

    // Get response endpoint
    app.get("/viewresponse/:messageId", (req: Request, res: Response) => {
      const { messageId } = req.params;

      if (!messageId) {
        return res.status(400).json({ error: "Message ID is required" });
      }

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
            error:
              "No active agent initialized. Please initialize an agent first.",
          });
        }

        // Get the message from the cache
        const message = getMessage(messageId);

        if (!message) {
          return res.status(404).json({ error: "Message not found" });
        }

        res.json({
          status: "success",
          message,
        });
      }
    });

    // Destruct/cleanup agent endpoint
    app.post("/destruct", (req: Request, res: Response) => {
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
                message: "Agent destroyed successfully",
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
        // Check the server wallet status using original accountId (for blockchain query)
        publicClient
          .readContract({
            address: FRANKY_ADDRESS as `0x${string}`,
            abi: FRANKY_ABI,
            functionName: "serverWalletsMapping",
            args: [accountId.toLowerCase()],
          })
          .then((serverWallet) => {
            const walletAddress = serverWallet[0];
            const serverWalletAddress = serverWallet[1];
            const encryptedPrivateKey = serverWallet[2];
            const privateKeyHash = serverWallet[3];
            const isConfigured =
              walletAddress !== "0x0000000000000000000000000000000000000000";

            // Check if user has an active agent using the resolved account ID
            const hasAgent = hasActiveAgent(resolvedAccountId);
            const agent = getAgentByUserId(resolvedAccountId);

            res.json({
              accountId,
              resolvedAccountId,
              serverWalletConfigured: isConfigured,
              serverWalletAddress: isConfigured ? serverWalletAddress : null,
              hasEncryptedKey:
                isConfigured && encryptedPrivateKey ? true : false,
              hasActiveAgent: hasAgent,
              agentInfo:
                hasAgent && agent
                  ? {
                      characterName: agent.character.name,
                      characterId: agent.character.id,
                      inboundTopicId: agent.inboundTopicId,
                      outboundTopicId: agent.outboundTopicId,
                    }
                  : null,
            });
          })
          .catch((error) => {
            logger.error("API", "Error checking server wallet status", error);
            res.status(500).json({
              error: `Error checking server wallet status: ${
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
if (require.main === module) {
  startServer().catch((error) => {
    logger.error("API", "Fatal error", error);
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { startServer, processInput };
