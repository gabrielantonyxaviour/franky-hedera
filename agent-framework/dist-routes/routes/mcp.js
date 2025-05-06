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
const agent_1 = __importDefault(require("../src/agent"));
const src_1 = require("../src");
const dotenv = __importStar(require("dotenv"));
const readline = __importStar(require("readline"));
const logger_1 = require("../src/utils/logger");
const mcp_server_1 = require("../src/utils/mcp-server");
const mcp_openai_1 = require("../src/utils/mcp-openai");
dotenv.config();
// Validate environment variables
function validateEnvironment() {
    const missingVars = [];
    const requiredVars = ["OPENAI_API_KEY", "HEDERA_ACCOUNT_ID", "HEDERA_PRIVATE_KEY"];
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
// Initialize HederaAgentKit and tools
async function initializeMCP() {
    try {
        logger_1.logger.info('MCP Init', 'Initializing HederaAgentKit');
        // Get private key and ensure correct formatting
        const privateKeyString = process.env.HEDERA_PRIVATE_KEY;
        const privateKeyType = process.env.HEDERA_KEY_TYPE || 'ECDSA';
        // Format private key correctly based on type - remove 0x prefix if present
        let formattedPrivateKey = privateKeyString;
        if (privateKeyString.startsWith('0x')) {
            formattedPrivateKey = privateKeyString.substring(2);
            logger_1.logger.debug('MCP Init', 'Removed 0x prefix from private key');
        }
        // Convert to proper key type using SDK
        const { PrivateKey } = require("@hashgraph/sdk");
        const privateKey = PrivateKey.fromStringECDSA(formattedPrivateKey);
        logger_1.logger.debug('MCP Init', 'ECDSA private key created successfully');
        const hederaKit = new agent_1.default(process.env.HEDERA_ACCOUNT_ID, privateKey.toString(), process.env.HEDERA_PUBLIC_KEY, 
        // Pass your network of choice. Default is "testnet".
        process.env.HEDERA_NETWORK_TYPE || "testnet");
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
// Run MCP chat mode
async function runMCPChat(openAIClient) {
    logger_1.logger.info('MCP Chat', 'Starting MCP chat mode');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
    try {
        console.log("\nHedera MCP Chat - Direct blockchain interactions");
        console.log("---------------------------------------------------------------");
        while (true) {
            const userInput = await question("\nYou: ");
            if (userInput.toLowerCase() === "exit") {
                logger_1.logger.info('MCP Chat', 'User requested exit');
                break;
            }
            logger_1.logger.info('MCP Chat', 'Received user input', {
                inputLength: userInput.length,
                firstWords: userInput.split(' ').slice(0, 3).join(' ') + '...'
            });
            try {
                // Generate response
                console.log("\nProcessing...");
                const { response, toolCalls } = await openAIClient.generateResponse(userInput);
                // Show raw model response and detected tool calls for debugging
                logger_1.logger.debug('MCP Chat', 'Raw model response', { response });
                logger_1.logger.debug('MCP Chat', 'Detected tool calls', {
                    numToolCalls: toolCalls.length,
                    toolCalls: JSON.stringify(toolCalls)
                });
                // Only show a minimal response if there are tool calls
                if (toolCalls.length > 0) {
                    // Execute any tool calls directly without showing intermediate output
                    console.log(`\nExecuting: ${toolCalls.map(tc => tc.name).join(', ')}...`);
                    const toolResults = await openAIClient.executeTools(toolCalls);
                    // Show raw tool results for debugging
                    logger_1.logger.debug('MCP Chat', 'Raw tool results', {
                        numResults: toolResults.length,
                        results: JSON.stringify(toolResults)
                    });
                    // Generate follow-up response
                    const followUpResponse = await openAIClient.generateFollowUp(userInput, toolResults);
                    console.log(`\nAssistant: ${followUpResponse}`);
                }
                else {
                    // If there are no tool calls, show the regular response
                    console.log(`\nAssistant: ${response}`);
                }
                console.log("\n---------------------------------------------------------------");
            }
            catch (error) {
                logger_1.logger.error('MCP Chat', 'Error in chat processing', error);
                console.log("\nSorry, I encountered an error while processing your request.");
            }
        }
    }
    catch (error) {
        if (error instanceof Error) {
            logger_1.logger.error('MCP Chat', 'Error in MCP chat mode', error);
        }
        process.exit(1);
    }
    finally {
        rl.close();
    }
}
// Main function
async function main() {
    try {
        validateEnvironment();
        const { openAIClient } = await initializeMCP();
        await runMCPChat(openAIClient);
        process.exit(0);
    }
    catch (error) {
        if (error instanceof Error) {
            logger_1.logger.error('Main', 'Error in main function', error);
        }
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
