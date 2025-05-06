"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
exports.processInput = processInput;
const dotenv = __importStar(require("dotenv"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
// Add debug logging
console.log("Starting character-mcp-api.ts initialization");
console.log("Node environment:", process.env.NODE_ENV || 'development');
console.log("Current directory:", process.cwd());
// Load environment variables first
dotenv.config();
console.log("Environment variables loaded");
const logger_1 = require("../src/utils/logger");
console.log("Logger imported");
console.log("Ollama client imported");
console.log("Importing Character modules...");
const characters_1 = require("../src/characters");
console.log("Character modules imported");
console.log("Importing Character types...");
console.log("Character types imported");
console.log("Importing MCP Server...");
const mcp_server_1 = require("../src/utils/mcp-server");
console.log("MCP Server imported");
console.log("Importing MCP OpenAI Client...");
const mcp_openai_1 = require("../src/utils/mcp-openai");
console.log("MCP OpenAI Client imported");
console.log("Importing Hedera Agent Kit...");
const agent_1 = __importDefault(require("../src/agent"));
console.log("Hedera Agent Kit imported");
console.log("Importing Hedera Tools...");
const src_1 = require("../src");
console.log("Hedera Tools imported");
console.log("Importing Hedera SDK...");
const sdk_1 = require("@hashgraph/sdk");
console.log("Hedera SDK imported");
// This might be the problematic import
try {
    console.log("Importing ethers...");
    // @ts-ignore - Module not found error suppressed; we have the actual module installed
    import { ethers } from "ethers";
    console.log("ethers imported successfully");
}
catch (e) {
    console.error("Failed to import ethers:", e);
}
console.log("Importing local implementations...");
const lit_helpers_1 = require("./lit-helpers");
console.log("Local implementations imported");
console.log("Importing contract constants...");
const constants_1 = require("./constants");
console.log("Contract constants imported");
console.log("Importing viem utilities...");
const viem_1 = require("viem");
const hedera_chain_1 = require("./hedera-chain");
console.log("viem utilities imported");
// Import HCS-10 controllers and services
console.log("Importing HCS-10 controllers...");
const agentController_1 = require("../src/controllers/agentController");
console.log("HCS-10 controllers imported");
console.log("Importing HCS-10 services...");
const registryService_1 = require("../src/services/registryService");
const storageService_1 = require("../src/services/storageService");
console.log("HCS-10 services imported");
console.log("Importing uuid...");
console.log("uuid imported");
console.log("Importing node-fetch...");
const node_fetch_1 = __importDefault(require("node-fetch"));
console.log("node-fetch imported");
console.log("Importing response generator...");
const response_generator_1 = require("../src/utils/response-generator");
console.log("response generator imported");
// Create a logger instance in place of the imported logger
const logger = {
    info: (module, message, data) => logger_1.Logger.getInstance({ module }).info(message, data),
    debug: (module, message, data) => logger_1.Logger.getInstance({ module }).debug(message, data),
    warn: (module, message, data) => logger_1.Logger.getInstance({ module }).warn(message, data),
    error: (module, message, data) => logger_1.Logger.getInstance({ module }).error(message, data),
    setLogLevel: (level) => {
        // Implement as needed
    },
    Level: {
        0: 'debug',
        1: 'info',
        2: 'warn',
        3: 'error',
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    }
};
// Initialize client for contract interaction
const publicClient = (0, viem_1.createPublicClient)({
    chain: hedera_chain_1.hederaTestnet,
    transport: (0, viem_1.http)(),
});
const state = {
    ollamaAvailable: false,
};
// Validate environment variables
function validateEnvironment() {
    const missingVars = [];
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
        logger.error("Env Validation", "Required environment variables are not set", { missingVars });
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
        // Fix the Logger.Level reference - define our own log level labels
        const logLevelLabels = {
            0: 'DEBUG',
            1: 'INFO',
            2: 'WARN',
            3: 'ERROR'
        };
        logger.info("Env Validation", `Log level set to ${logLevelLabels[logLevel] || logLevel}`);
    }
}
// Initialize Hedera MCP server
async function initializeMCP() {
    try {
        logger.info("MCP Init", "Initializing HederaAgentKit");
        // Get private key and ensure correct formatting
        const privateKeyString = process.env.HEDERA_PRIVATE_KEY;
        // Format private key correctly - remove 0x prefix if present
        let formattedPrivateKey = privateKeyString;
        if (privateKeyString.startsWith("0x")) {
            formattedPrivateKey = privateKeyString.substring(2);
            logger.debug("MCP Init", "Removed 0x prefix from private key");
        }
        // Convert to proper key type using SDK
        const privateKey = sdk_1.PrivateKey.fromStringECDSA(formattedPrivateKey);
        logger.debug("MCP Init", "ECDSA private key created successfully");
        const hederaKit = new agent_1.default(process.env.HEDERA_ACCOUNT_ID, privateKey.toString(), process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_NETWORK_TYPE || "testnet");
        logger.debug("MCP Init", "HederaAgentKit initialized");
        // Initialize the server Hedera client
        const serverAccountId = sdk_1.AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
        const serverClient = sdk_1.Client.forTestnet().setOperator(serverAccountId, privateKey);
        logger.debug("MCP Init", "Hedera client initialized for server");
        // Create the LangChain-compatible tools
        logger.info("MCP Init", "Creating Hedera tools");
        const tools = (0, src_1.createHederaTools)(hederaKit);
        logger.debug("MCP Init", `Created ${tools.length} tools`);
        // Start MCP server
        logger.info("MCP Init", "Starting MCP server");
        const mcpServer = new mcp_server_1.MCPServer(tools, 3001);
        await mcpServer.start();
        logger.info("MCP Init", `MCP server started at ${mcpServer.getUrl()}`);
        // Create MCP OpenAI client
        logger.info("MCP Init", "Creating MCP OpenAI client");
        const openAIClient = new mcp_openai_1.MCPOpenAIClient(process.env.OPENAI_API_KEY, mcpServer.getUrl(), process.env.OPENAI_MODEL || "gpt-4.1");
        logger.info("MCP Init", "MCP OpenAI client created");
        // Initialize the response generator
        await (0, response_generator_1.initializeMCPState)(openAIClient, state.ollamaAvailable, state.activeCharacter);
        return { mcpServer, openAIClient, serverClient };
    }
    catch (error) {
        logger.error("MCP Init", "Failed to initialize MCP", error);
        throw error;
    }
}
// Initialize character
async function initializeCharacter(characterIdentifier) {
    try {
        const characters = (0, characters_1.listCharacters)();
        if (characters.length === 0) {
            logger.error("Character Init", "No character files found in the characters directory");
            return null;
        }
        // If characterIdentifier is provided, try to load it by ID first, then by name/filename
        if (characterIdentifier) {
            // First try to find by ID (UUID format)
            const characterById = (0, characters_1.findCharacterById)(characterIdentifier);
            if (characterById) {
                logger.info("Character Init", `Loaded character by ID: ${characterById.name} (${characterIdentifier})`);
                return characterById;
            }
            // If not found by ID, try by filename
            const matchedCharacter = characters.find((file) => file === characterIdentifier || file === `${characterIdentifier}.json`);
            if (matchedCharacter) {
                logger.info("Character Init", `Loading character by filename: ${matchedCharacter}`);
                const character = (0, characters_1.loadCharacter)(matchedCharacter);
                logger.info("Character Init", `Character "${character.name}" loaded successfully!`);
                return character;
            }
            else {
                logger.warn("Character Init", `Character not found with ID or name: ${characterIdentifier}, defaulting to Franky character`);
            }
        }
        // Default to Franky character if identifier not provided or not found
        const frankyCharacter = characters.find((file) => file === "franky.json");
        if (frankyCharacter) {
            logger.info("Character Init", `Loading Franky character as default`);
            const character = (0, characters_1.loadCharacter)(frankyCharacter);
            logger.info("Character Init", `Character "${character.name}" loaded successfully!`);
            return character;
        }
        else {
            // If Franky character is not found, default to first character
            const defaultCharacter = characters[0];
            logger.warn("Character Init", `Franky character not found, loading default character: ${defaultCharacter}`);
            const character = (0, characters_1.loadCharacter)(defaultCharacter);
            logger.info("Character Init", `Character "${character.name}" loaded successfully!`);
            return character;
        }
    }
    catch (error) {
        logger.error("Character Init", "Error initializing character", error);
        return null;
    }
}
// Process user input and generate a response
async function processInput(userInput) {
    return (0, response_generator_1.generateResponse)(userInput);
}
// Retrieves and decrypts the server wallet private key
async function getServerWalletPrivateKey(accountId) {
    try {
        logger.info("Wallet", "Retrieving server wallet for account", {
            accountId,
        });
        // Use the contract to get the wallet info
        const serverWalletData = await publicClient.readContract({
            address: constants_1.FRANKY_ADDRESS,
            abi: constants_1.FRANKY_ABI,
            functionName: "serverWalletsMapping",
            args: [accountId.toLowerCase()],
        });
        // Cast the result to our ServerWalletResponse interface
        const serverWallet = serverWalletData;
        const walletAddress = serverWallet[0];
        const serverWalletAddress = serverWallet[1];
        const encryptedPrivateKey = serverWallet[2];
        const privateKeyHash = serverWallet[3];
        // Check if the wallet exists
        if (walletAddress == "0x0000000000000000000000000000000000000000") {
            logger.warn("Server Wallet", "No server wallet configured for this account");
            return {
                privateKey: null,
                error: "No server wallet configured for this account",
            };
        }
        // Use the device's private key from .env to create an authentication wallet
        // This key should belong to a registered device in the Franky contract
        if (!process.env.HEDERA_PRIVATE_KEY) {
            logger.error("Server Wallet", "Missing HEDERA_PRIVATE_KEY environment variable");
            return { privateKey: null, error: "Device private key not available" };
        }
        try {
            // Remove 0x prefix if present in the private key
            let devicePrivateKey = process.env.HEDERA_PRIVATE_KEY;
            if (devicePrivateKey.startsWith("0x")) {
                devicePrivateKey = devicePrivateKey.substring(2);
            }
            // Create the authentication wallet using the device's private key
            const ethersWallet = new ethers_1.ethers.Wallet(devicePrivateKey);
            logger.debug("Server Wallet", "Created authentication wallet using device key", {
                address: ethersWallet.address,
            });
            // 3. Decrypt the server wallet private key using Lit Protocol
            const decryptionResult = await (0, lit_helpers_1.decryptServerWallet)(ethersWallet, walletAddress.toLowerCase(), encryptedPrivateKey, privateKeyHash);
            if (decryptionResult.error) {
                logger.error("Server Wallet", "Failed to decrypt server wallet", {
                    error: decryptionResult.error,
                });
                return {
                    privateKey: null,
                    error: `Decryption failed: ${decryptionResult.error}`,
                };
            }
            logger.info("Server Wallet", "Successfully decrypted server wallet private key");
            return { privateKey: decryptionResult.decryptedData, error: null };
        }
        catch (walletError) {
            logger.error("Server Wallet", "Failed to create authentication wallet using device key", walletError);
            return {
                privateKey: null,
                error: `Failed to create authentication wallet: ${walletError instanceof Error
                    ? walletError.message
                    : String(walletError)}`,
            };
        }
    }
    catch (error) {
        logger.error("Server Wallet", "Error retrieving or decrypting server wallet", error);
        return {
            privateKey: null,
            error: `Error retrieving or decrypting server wallet: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
// Create a Hedera client for the user with the given private key
async function createUserClient(accountIdOrEvmAddress, privateKey) {
    try {
        // Check if the input looks like an EVM address
        if (accountIdOrEvmAddress.startsWith("0x")) {
            // Handle EVM address by getting the account ID from the mirror node
            const evmAddress = accountIdOrEvmAddress;
            try {
                // Use the mirror node API to get the account ID
                const response = await (0, node_fetch_1.default)(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${evmAddress}`);
                if (!response.ok) {
                    throw new Error(`Failed to get account ID for EVM address: ${response.statusText}`);
                }
                const data = await response.json();
                const hederaAccountId = data.account;
                logger.debug("HIP991", `Resolved EVM address ${evmAddress} to Hedera account ID ${hederaAccountId}`);
                // Now create the client with the resolved account ID
                const userAccountId = sdk_1.AccountId.fromString(hederaAccountId);
                const userPrivateKey = sdk_1.PrivateKey.fromStringECDSA(privateKey);
                return sdk_1.Client.forTestnet().setOperator(userAccountId, userPrivateKey);
            }
            catch (error) {
                logger.error("HIP991", `Error resolving EVM address ${evmAddress}`, error);
                throw new Error(`Error resolving EVM address: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        else {
            // Handle regular Hedera account ID (no changes to this path)
            const userAccountId = sdk_1.AccountId.fromString(accountIdOrEvmAddress);
            const userPrivateKey = sdk_1.PrivateKey.fromStringECDSA(privateKey);
            return sdk_1.Client.forTestnet().setOperator(userAccountId, userPrivateKey);
        }
    }
    catch (error) {
        logger.error("HIP991", "Error creating user client", error);
        throw new Error(`Error creating user client: ${error instanceof Error ? error.message : String(error)}`);
    }
}
// Add a helper function to fetch agent details and character data
async function fetchAgentAndCharacterData(agentAddress) {
    try {
        logger.info("Agent Init", `Fetching agent details for address: ${agentAddress}`);
        // Fetch agent details from Supabase instead of graph API
        const agentResponse = await (0, node_fetch_1.default)(`https://franky-hedera.vercel.app/api/db/agents?address=${agentAddress}`);
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
        const [agentData] = (await agentResponse.json()); // Get first agent since response is an array
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
        logger.info("Agent Init", `Fetching character data from: ${metadataUrl}`);
        // Fetch character data from metadata URL
        const characterResponse = await (0, node_fetch_1.default)(metadataUrl);
        if (!characterResponse.ok) {
            const errorText = await characterResponse.text();
            logger.error("Agent Init", `Failed to fetch character data: ${errorText}`);
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
        const feeInHbar = Number((0, viem_1.formatEther)(BigInt(feeInWei))); // Convert wei to HBAR
        logger.info("Agent Init", `Agent fee set to ${feeInHbar} HBAR`);
        return { agent: agentData, character, feeInHbar };
    }
    catch (error) {
        logger.error("Agent Init", "Error fetching agent or character data", error);
        return {
            agent: null,
            character: null,
            feeInHbar: 0.5,
            error: `Error fetching agent or character data: ${error instanceof Error ? error.message : String(error)}`,
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
        }
        else {
            logger.info("Server", `Character loaded: ${state.activeCharacter.name}`);
        }
        // Check Ollama availability
        logger.info("Server", "Checking Ollama model availability");
        const ollamaCheckResult = await (0, response_generator_1.checkOllamaModel)();
        state.ollamaAvailable = ollamaCheckResult.available;
        if (ollamaCheckResult.available) {
            logger.info("Server", "Ollama model is available");
            if (ollamaCheckResult.fallbackModel) {
                logger.info("Server", `Using fallback model: ${ollamaCheckResult.fallbackModel}`);
                process.env.OLLAMA_FALLBACK_MODEL = ollamaCheckResult.fallbackModel;
            }
        }
        else {
            logger.warn("Server", "Ollama model is not available, will fallback to OpenAI");
        }
        // Create Express app
        const app = (0, express_1.default)();
        app.use((0, cors_1.default)());
        app.use(body_parser_1.default.json());
        // Status endpoint - support both GET and POST methods
        const statusHandler = async (req, res) => {
            try {
                // Define with explicit type to avoid 'never[]' error
                let charactersInfo = [];
                try {
                    const characters = await (0, registryService_1.getAllCharactersFromRegistry)();
                    charactersInfo = characters.map(character => ({
                        characterId: character.characterId,
                        name: character.name,
                        description: character.description || '',
                        imageUrl: character.imageUrl || '',
                        registrationTimestamp: character.registrationTimestamp
                    }));
                }
                catch (error) {
                    // Just log the error but don't fail the request
                    logger.error("API", "Error getting characters from registry", error);
                }
                res.json({
                    status: "online",
                    ollamaAvailable: state.ollamaAvailable,
                    activeCharacter: state.activeCharacter
                        ? state.activeCharacter.name
                        : null,
                    availableCharacters: charactersInfo,
                    hcs10StandardAvailable: true
                });
            }
            catch (error) {
                logger.error("API", "Error in status handler", error);
                res.status(500).json({
                    status: "error",
                    error: `Internal server error: ${error instanceof Error ? error.message : String(error)}`
                });
            }
        };
        // Register the handler for both GET and POST methods
        app.get("/status", statusHandler);
        app.post("/status", statusHandler);
        // Initialize agent with character endpoint
        app.post("/initialize", (req, res) => {
            // Get the account ID from headers
            const accountId = req.headers["account-id"];
            if (!accountId) {
                return res.status(400).json({ error: "account-id header is required" });
            }
            // Extract characterId from request body
            const { characterId } = req.body;
            if (!characterId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing characterId in request body'
                });
            }
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
                logger.info("API", "Successfully retrieved server wallet private key", { accountId });
                try {
                    // Create user client using the decrypted private key
                    const userClient = await createUserClient(accountId, privateKey);
                    // Check if accountId is an EVM address, if so, get the Hedera account ID from mirror node
                    let userAccountId;
                    if (accountId.startsWith("0x")) {
                        try {
                            // Use the mirror node API to get the account ID
                            const response = await (0, node_fetch_1.default)(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`);
                            if (!response.ok) {
                                throw new Error(`Failed to get account ID for EVM address: ${response.statusText}`);
                            }
                            const data = await response.json();
                            const hederaAccountId = data.account;
                            logger.debug("API", `Resolved EVM address ${accountId} to Hedera account ID ${hederaAccountId}`);
                            userAccountId = sdk_1.AccountId.fromString(hederaAccountId);
                        }
                        catch (error) {
                            logger.error("API", `Error resolving EVM address ${accountId}`, error);
                            throw new Error(`Error resolving EVM address: ${error instanceof Error ? error.message : String(error)}`);
                        }
                    }
                    else {
                        userAccountId = sdk_1.AccountId.fromString(accountId);
                    }
                    // Look up character data in the registry
                    const characterData = await (0, registryService_1.getCharacterFromRegistry)(characterId);
                    if (!characterData) {
                        return res.status(404).json({
                            success: false,
                            error: `Character ${characterId} not found in registry`
                        });
                    }
                    // Create a modified request with all the necessary information
                    const hcs10Req = Object.create(req);
                    hcs10Req.headers = {
                        ...req.headers,
                        'authenticated-account-id': userAccountId.toString(),
                        'authenticated-private-key': privateKey
                    };
                    // Now call our HCS-10 implementation
                    return (0, agentController_1.initializeAgent)(hcs10Req, res);
                }
                catch (error) {
                    logger.error("API", "Error initializing agent", error);
                    res.status(500).json({
                        error: `Error initializing agent: ${error instanceof Error ? error.message : String(error)}`,
                    });
                }
            })
                .catch((error) => {
                logger.error("API", "Unexpected error in server wallet retrieval", error);
                res.status(500).json({
                    error: `Unexpected error retrieving server wallet: ${error instanceof Error ? error.message : String(error)}`,
                });
            });
        });
        // Chat endpoint using HIP-991 topics or HCS-10
        app.post("/chat", (req, res) => {
            const { message, characterId } = req.body;
            if (!message) {
                return res.status(400).json({ error: "Message is required" });
            }
            // Get the account ID from headers
            const accountId = req.headers["account-id"];
            if (!accountId) {
                return res.status(400).json({ error: "account-id header is required" });
            }
            // For HCS-10, we need characterId in the request body
            if (!characterId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing characterId in request body'
                });
            }
            // Authenticate using server wallet
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
                logger.info("API", "Successfully retrieved server wallet private key", { accountId });
                try {
                    // Create user client using the decrypted private key
                    const userClient = await createUserClient(accountId, privateKey);
                    // Resolve account ID if it's an EVM address
                    let resolvedAccountId = accountId;
                    if (accountId.startsWith("0x")) {
                        try {
                            const response = await (0, node_fetch_1.default)(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`);
                            if (!response.ok) {
                                throw new Error(`Failed to get account ID for EVM address: ${response.statusText}`);
                            }
                            const data = await response.json();
                            resolvedAccountId = data.account;
                        }
                        catch (error) {
                            logger.error("API", `Error resolving EVM address ${accountId}`, error);
                            throw new Error(`Error resolving EVM address: ${error instanceof Error ? error.message : String(error)}`);
                        }
                    }
                    // Create a modified request with all the necessary information
                    const hcs10Req = Object.create(req);
                    hcs10Req.headers = {
                        ...req.headers,
                        'authenticated-account-id': resolvedAccountId,
                        'authenticated-private-key': privateKey
                    };
                    // Call our HCS-10 implementation
                    return (0, agentController_1.sendMessage)(hcs10Req, res);
                }
                catch (error) {
                    logger.error("API", "Error sending message", error);
                    res.status(500).json({
                        error: `Error sending message: ${error instanceof Error ? error.message : String(error)}`,
                    });
                }
            })
                .catch((error) => {
                logger.error("API", "Unexpected error in server wallet retrieval", error);
                res.status(500).json({
                    error: `Unexpected error retrieving server wallet: ${error instanceof Error ? error.message : String(error)}`,
                });
            });
        });
        // Get response endpoint 
        const viewResponseHandler = (req, res) => {
            const { messageId } = req.params;
            if (!messageId) {
                return res.status(400).json({ error: "Message ID is required" });
            }
            // Get the account ID from headers
            const accountId = req.headers["account-id"];
            if (!accountId) {
                return res.status(400).json({ error: "account-id header is required" });
            }
            // Authenticate using server wallet
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
                    // Create a modified request with all the necessary information
                    const hcs10Req = Object.create(req);
                    hcs10Req.headers = {
                        ...req.headers,
                        'authenticated-account-id': accountId,
                        'authenticated-private-key': privateKey
                    };
                    // Call our HCS-10 implementation
                    return (0, agentController_1.getResponse)(hcs10Req, res);
                }
                catch (error) {
                    logger.error("API", "Error retrieving response", error);
                    res.status(500).json({
                        error: `Error retrieving response: ${error instanceof Error ? error.message : String(error)}`,
                    });
                }
            })
                .catch((error) => {
                logger.error("API", "Unexpected error in server wallet retrieval", error);
                res.status(500).json({
                    error: `Unexpected error retrieving server wallet: ${error instanceof Error ? error.message : String(error)}`,
                });
            });
        };
        // Register the view response handler for both GET and POST methods
        app.get("/viewresponse/:messageId", viewResponseHandler);
        app.post("/viewresponse/:messageId", viewResponseHandler);
        // Destruct/cleanup agent endpoint
        app.post("/destruct", (req, res) => {
            // Get the account ID from headers
            const accountId = req.headers["account-id"];
            if (!accountId) {
                return res.status(400).json({ error: "account-id header is required" });
            }
            // For HCS-10, we need characterId in the request body
            if (!req.body.characterId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing characterId in request body'
                });
            }
            // Authenticate using server wallet
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
                    // Create a modified request with all the necessary information
                    const hcs10Req = Object.create(req);
                    hcs10Req.headers = {
                        ...req.headers,
                        'authenticated-account-id': accountId,
                        'authenticated-private-key': privateKey
                    };
                    // Call our HCS-10 implementation
                    return (0, agentController_1.cleanupAgent)(hcs10Req, res);
                }
                catch (error) {
                    logger.error("API", "Error destroying agent", error);
                    res.status(500).json({
                        error: `Error destroying agent: ${error instanceof Error ? error.message : String(error)}`,
                    });
                }
            })
                .catch((error) => {
                logger.error("API", "Unexpected error in server wallet retrieval", error);
                res.status(500).json({
                    error: `Unexpected error retrieving server wallet: ${error instanceof Error ? error.message : String(error)}`,
                });
            });
        });
        // List available characters
        app.get("/characters", (req, res) => {
            try {
                const characters = (0, characters_1.listCharactersWithInfo)();
                res.json({ characters });
            }
            catch (error) {
                logger.error("API", "Error listing characters", error);
                res.status(500).json({ error: "Error listing characters" });
            }
        });
        // Check server wallet status
        app.get("/wallet-status", (req, res) => {
            // Get the account ID from headers
            const accountId = req.headers["account-id"];
            if (!accountId) {
                return res.status(400).json({ error: "account-id header is required" });
            }
            // Resolve EVM address to Hedera account ID
            async function resolveAccountAndCheckStatus() {
                try {
                    let resolvedAccountId = accountId;
                    // If it's an EVM address, resolve it
                    if (accountId.startsWith("0x")) {
                        try {
                            const response = await (0, node_fetch_1.default)(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`);
                            if (!response.ok) {
                                return res.status(400).json({
                                    error: `Failed to get account ID for EVM address: ${response.statusText}`,
                                });
                            }
                            const data = await response.json();
                            resolvedAccountId = data.account;
                            logger.debug("API", `Resolved EVM address ${accountId} to Hedera account ID ${resolvedAccountId}`);
                        }
                        catch (error) {
                            logger.error("API", `Error resolving EVM address ${accountId}`, error);
                            return res.status(500).json({
                                error: `Error resolving EVM address: ${error instanceof Error ? error.message : String(error)}`,
                            });
                        }
                    }
                    // Check the server wallet status using original accountId (for blockchain query)
                    const serverWalletData = await publicClient.readContract({
                        address: constants_1.FRANKY_ADDRESS,
                        abi: constants_1.FRANKY_ABI,
                        functionName: "serverWalletsMapping",
                        args: [accountId.toLowerCase()],
                    });
                    // Cast the result to our ServerWalletResponse interface
                    const serverWallet = serverWalletData;
                    const walletAddress = serverWallet[0];
                    const serverWalletAddress = serverWallet[1];
                    const encryptedPrivateKey = serverWallet[2];
                    const privateKeyHash = serverWallet[3];
                    const isConfigured = walletAddress !== "0x0000000000000000000000000000000000000000";
                    // Get list of characters to check for active connections for this user
                    const characters = await (0, registryService_1.getAllCharactersFromRegistry)();
                    let activeConnections = [];
                    for (const character of characters) {
                        const connectionTopicId = await (0, storageService_1.getConnectionTopicId)(resolvedAccountId, character.characterId);
                        if (connectionTopicId) {
                            activeConnections.push({
                                characterId: character.characterId,
                                characterName: character.name,
                                connectionTopicId: connectionTopicId
                            });
                        }
                    }
                    const hasActiveConnection = activeConnections.length > 0;
                    res.json({
                        accountId,
                        resolvedAccountId,
                        serverWalletConfigured: isConfigured,
                        serverWalletAddress: isConfigured ? serverWalletAddress : null,
                        hasEncryptedKey: isConfigured && encryptedPrivateKey ? true : false,
                        hasActiveAgents: hasActiveConnection,
                        activeConnections: hasActiveConnection ? activeConnections : null
                    });
                }
                catch (error) {
                    logger.error("API", "Error checking wallet and agent status", error);
                    res.status(500).json({
                        error: `Error checking wallet and agent status: ${error instanceof Error ? error.message : String(error)}`,
                    });
                }
            }
            // Start the async process
            resolveAccountAndCheckStatus();
        });
        // Start the server
        const port = process.env.API_PORT || 8080;
        app.listen(port, () => {
            logger.info("API", `Character MCP API server started on port ${port}`);
            console.log(`Character MCP API server is running on http://localhost:${port}`);
        });
    }
    catch (error) {
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
