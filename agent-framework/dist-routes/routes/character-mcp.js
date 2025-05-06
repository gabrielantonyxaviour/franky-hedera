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
const dotenv = __importStar(require("dotenv"));
const readline = __importStar(require("readline"));
const logger_1 = require("../src/utils/logger");
const ollama_client_1 = require("../src/utils/ollama-client");
const characters_1 = require("../src/characters");
const mcp_server_1 = require("../src/utils/mcp-server");
const mcp_openai_1 = require("../src/utils/mcp-openai");
const agent_1 = __importDefault(require("../src/agent"));
const src_1 = require("../src");
const sdk_1 = require("@hashgraph/sdk");
dotenv.config();
// Validate environment variables
function validateEnvironment() {
    const missingVars = [];
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
        logger_1.logger.error('Env Validation', 'Required environment variables are not set', { missingVars });
        missingVars.forEach((varName) => {
            console.error(`${varName}=your_${varName.toLowerCase()}_here`);
        });
        process.exit(1);
    }
    logger_1.logger.info('Env Validation', 'All required environment variables are set');
    // Set log level from environment if provided
    if (process.env.LOG_LEVEL) {
        const logLevel = parseInt(process.env.LOG_LEVEL);
        logger_1.logger.setLogLevel(logLevel);
        logger_1.logger.info('Env Validation', `Log level set to ${logger_1.LogLevel[logLevel]}`);
    }
}
// Initialize Hedera MCP server
async function initializeMCP() {
    try {
        logger_1.logger.info('MCP Init', 'Initializing HederaAgentKit');
        // Get private key and ensure correct formatting
        const privateKeyString = process.env.HEDERA_PRIVATE_KEY;
        // Format private key correctly - remove 0x prefix if present
        let formattedPrivateKey = privateKeyString;
        if (privateKeyString.startsWith('0x')) {
            formattedPrivateKey = privateKeyString.substring(2);
            logger_1.logger.debug('MCP Init', 'Removed 0x prefix from private key');
        }
        // Convert to proper key type using SDK
        const privateKey = sdk_1.PrivateKey.fromStringECDSA(formattedPrivateKey);
        logger_1.logger.debug('MCP Init', 'ECDSA private key created successfully');
        const hederaKit = new agent_1.default(process.env.HEDERA_ACCOUNT_ID, privateKey.toString(), process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_NETWORK_TYPE || "testnet");
        logger_1.logger.debug('MCP Init', 'HederaAgentKit initialized');
        // Create the LangChain-compatible tools
        logger_1.logger.info('MCP Init', 'Creating Hedera tools');
        const tools = (0, src_1.createHederaTools)(hederaKit);
        logger_1.logger.debug('MCP Init', `Created ${tools.length} tools`);
        // Start MCP server
        logger_1.logger.info('MCP Init', 'Starting MCP server');
        const mcpServer = new mcp_server_1.MCPServer(tools, 3000);
        await mcpServer.start();
        logger_1.logger.info('MCP Init', `MCP server started at ${mcpServer.getUrl()}`);
        // Create MCP OpenAI client
        logger_1.logger.info('MCP Init', 'Creating MCP OpenAI client');
        const openAIClient = new mcp_openai_1.MCPOpenAIClient(process.env.OPENAI_API_KEY, mcpServer.getUrl(), process.env.OPENAI_MODEL || 'gpt-4.1');
        logger_1.logger.info('MCP Init', 'MCP OpenAI client created');
        return { mcpServer, openAIClient };
    }
    catch (error) {
        logger_1.logger.error('MCP Init', 'Failed to initialize MCP', error);
        throw error;
    }
}
// Choose a character
async function chooseCharacter() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
    try {
        const characters = (0, characters_1.listCharacters)();
        if (characters.length === 0) {
            console.log("\nNo character files found in the 'characters' directory.");
            console.log("Please create a character JSON file in the 'characters' directory and try again.");
            rl.close();
            return null;
        }
        console.log("\nAvailable characters:");
        characters.forEach((file, index) => {
            console.log(`${index + 1}. ${file}`);
        });
        const choice = await question("\nChoose a character (enter number or filename): ");
        const trimmedChoice = choice.trim();
        let selectedFileName;
        // Check if the input is a number
        if (/^\d+$/.test(trimmedChoice)) {
            const index = parseInt(trimmedChoice) - 1;
            if (index >= 0 && index < characters.length) {
                selectedFileName = characters[index];
            }
            else {
                console.log("Invalid choice. Please try again.");
                rl.close();
                return null;
            }
        }
        else {
            // Check if the input matches a filename
            if (characters.includes(trimmedChoice)) {
                selectedFileName = trimmedChoice;
            }
            else if (characters.some(f => f === `${trimmedChoice}.json`)) {
                selectedFileName = `${trimmedChoice}.json`;
            }
            else {
                console.log("Character not found. Please try again.");
                rl.close();
                return null;
            }
        }
        console.log(`Loading character: ${selectedFileName}`);
        const character = (0, characters_1.loadCharacter)(selectedFileName);
        console.log(`Character "${character.name}" loaded successfully!`);
        rl.close();
        return character;
    }
    catch (error) {
        logger_1.logger.error('Character Selection', 'Error selecting character', error);
        rl.close();
        return null;
    }
}
// Run hybrid character and MCP mode
async function runHybridMode(openAIClient) {
    logger_1.logger.info('Hybrid Mode', 'Starting hybrid character and MCP mode');
    // Check Ollama availability first
    logger_1.logger.info('Hybrid Mode', 'Checking Ollama availability');
    const ollamaAvailable = await (0, ollama_client_1.isOllamaAvailable)();
    if (ollamaAvailable) {
        logger_1.logger.info('Hybrid Mode', 'Ollama is available and will be used for character responses');
    }
    else {
        logger_1.logger.warn('Hybrid Mode', 'Ollama is not available. Character mode will not work.');
        console.log("\nOllama is not available! Please start Ollama to use character mode.");
        return;
    }
    // Select a character
    const character = await chooseCharacter();
    if (!character) {
        logger_1.logger.error('Hybrid Mode', 'No character selected, exiting hybrid mode');
        return;
    }
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
    try {
        // Display the character's first message
        console.log("\n--- Character Interaction ---");
        console.log(`${character.name}: ${character.first_mes}`);
        console.log("-------------------");
        while (true) {
            const userInput = await question("\nYou: ");
            if (userInput.toLowerCase() === "exit") {
                logger_1.logger.info('Hybrid Mode', 'User requested exit');
                break;
            }
            logger_1.logger.info('Hybrid Mode', 'Received user input', {
                inputLength: userInput.length,
                firstWords: userInput.split(' ').slice(0, 3).join(' ') + '...'
            });
            // Determine if this looks like a blockchain request
            const requiresTools = (0, ollama_client_1.mightRequireTools)(userInput);
            if (requiresTools) {
                // Use MCP for blockchain operations
                logger_1.logger.info('Hybrid Mode', 'Detected blockchain operation, using MCP');
                console.log("\nProcessing blockchain operation...");
                try {
                    // Generate response with MCP
                    const { response, toolCalls } = await openAIClient.generateResponse(userInput);
                    // Only show a minimal response if there are tool calls
                    if (toolCalls.length > 0) {
                        // Execute any tool calls directly
                        console.log(`\nExecuting: ${toolCalls.map(tc => tc.name).join(', ')}...`);
                        const toolResults = await openAIClient.executeTools(toolCalls);
                        // Generate follow-up response with character context
                        const followUpResponse = await openAIClient.generateFollowUp(userInput, toolResults, undefined, character.name);
                        console.log(`\nBlockchain Result: ${followUpResponse}`);
                    }
                    else {
                        // If there are no tool calls, show the regular response with character voice
                        console.log(`\n${character.name}: ${response}`);
                    }
                }
                catch (error) {
                    logger_1.logger.error('Hybrid Mode', 'Error using MCP', error);
                    console.log("\nSorry, I encountered an error processing your blockchain request.");
                }
            }
            else {
                // Use Ollama with character mode for regular conversation
                logger_1.logger.info('Hybrid Mode', 'Using character mode with Ollama');
                try {
                    // Pass the character to queryOllama
                    const ollamaResponse = await (0, ollama_client_1.queryOllama)(userInput, character);
                    console.log(`\n${character.name}: ${ollamaResponse}`);
                }
                catch (error) {
                    logger_1.logger.error('Hybrid Mode', 'Error with Ollama character response', error);
                    console.log("\nSorry, I encountered an error generating a response.");
                }
            }
            console.log("-------------------");
        }
    }
    catch (error) {
        logger_1.logger.error('Hybrid Mode', 'Error in hybrid mode', error);
        process.exit(1);
    }
    finally {
        rl.close();
    }
}
// Main function
async function main() {
    try {
        // Validate environment
        validateEnvironment();
        // Initialize MCP
        const { openAIClient } = await initializeMCP();
        // Run hybrid mode
        await runHybridMode(openAIClient);
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Main', 'Error in main function', error);
        process.exit(1);
    }
}
// Run the main function
if (require.main === module) {
    main().catch((error) => {
        logger_1.logger.error('Main', 'Fatal error', error);
        console.error("Fatal error:", error);
        process.exit(1);
    });
}
