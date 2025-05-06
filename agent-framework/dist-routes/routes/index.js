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
const openai_1 = require("@langchain/openai");
const langgraph_1 = require("@langchain/langgraph");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const messages_1 = require("@langchain/core/messages");
const dotenv = __importStar(require("dotenv"));
const readline = __importStar(require("readline"));
const logger_1 = require("../src/utils/logger");
const ollama_client_1 = require("../src/utils/ollama-client");
const characters_1 = require("../src/characters");
const config_1 = require("../src/utils/config");
dotenv.config();
// Flag to determine if we should use the hybrid model (Ollama + OpenAI)
const USE_HYBRID_MODEL = process.env.USE_HYBRID_MODEL !== 'false';
// Track if Ollama is available for hybrid mode
let ollamaAvailable = false;
// Current active character
let activeCharacter = undefined;
function validateEnvironment() {
    const missingVars = [];
    // You can tweak these as needed
    const requiredVars = ["OPENAI_API_KEY", "HEDERA_ACCOUNT_ID"];
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
async function checkOllamaAvailability() {
    if (USE_HYBRID_MODEL) {
        logger_1.logger.info('Hybrid Mode', 'Checking Ollama availability');
        ollamaAvailable = await (0, ollama_client_1.isOllamaAvailable)();
        if (ollamaAvailable) {
            logger_1.logger.info('Hybrid Mode', 'Ollama is available and will be used for general queries');
        }
        else {
            logger_1.logger.warn('Hybrid Mode', 'Ollama is not available, falling back to OpenAI for all queries');
        }
    }
}
validateEnvironment();
async function initializeAgent() {
    try {
        logger_1.logger.info('Agent Init', 'Initializing LLM');
        const llm = new openai_1.ChatOpenAI({
            modelName: "o3-mini",
        });
        logger_1.logger.debug('Agent Init', 'LLM initialized', { modelName: "o3-mini" });
        // Initialize HederaAgentKit
        logger_1.logger.info('Agent Init', 'Initializing HederaAgentKit');
        const hederaKit = new agent_1.default(process.env.HEDERA_ACCOUNT_ID, 
        // process.env.CUSTODIAL_MODE === 'true' ? process.env.HEDERA_PRIVATE_KEY! : undefined,
        process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, 
        // Pass your network of choice. Default is "testnet".
        // You can specify 'testnet', 'previewnet', or 'mainnet'.
        process.env.HEDERA_NETWORK_TYPE || "testnet");
        logger_1.logger.debug('Agent Init', 'HederaAgentKit initialized');
        // Create the LangChain-compatible tools
        logger_1.logger.info('Agent Init', 'Creating LangChain-compatible tools');
        const tools = (0, src_1.createHederaTools)(hederaKit);
        logger_1.logger.debug('Agent Init', `Created ${tools.length} tools`, {
            toolNames: tools.map(tool => tool.name)
        });
        // Prepare an in-memory checkpoint saver
        logger_1.logger.info('Agent Init', 'Creating memory checkpoint saver');
        const memory = new langgraph_1.MemorySaver();
        logger_1.logger.debug('Agent Init', 'Memory checkpoint saver created');
        // Additional configuration for the agent
        const config = { configurable: { thread_id: "Hedera Agent Kit!" } };
        logger_1.logger.debug('Agent Init', 'Agent config created', { config });
        // Create the React agent
        logger_1.logger.info('Agent Init', 'Creating ReAct agent');
        const messageModifier = `
        **General Guidelines**
        You are a helpful agent that can interact on-chain using the Hedera Agent Kit. 
        You are empowered to interact on-chain using your tools. If you ever need funds,
        you can request them from a faucet or from the user. 
        If there is a 5XX (internal) HTTP error code, ask the user to try again later. 
        If someone asks you to do something you can't do with your available tools, you 
        must say so, and encourage them to implement it themselves with the Hedera Agent Kit. 
        Keep your responses concise and helpful.
        
        **Token Creation Rules**:
        If the user mentions **NFT**, **non-fungible token**, or **unique token**, always use the **hedera_create_non_fungible_token** tool.
        If the user mentions **fungible token**, **FT**, or **decimal-based token**, always use the **hedera_create_fungible_token** tool.
        
      `;
        logger_1.logger.debug('Agent Init', 'Message modifier created', {
            messageModifierLength: messageModifier.length
        });
        const agent = (0, prebuilt_1.createReactAgent)({
            llm,
            tools,
            checkpointSaver: memory,
            messageModifier,
        });
        logger_1.logger.info('Agent Init', 'ReAct agent created successfully');
        // Check Ollama availability
        await checkOllamaAvailability();
        return { agent, config };
    }
    catch (error) {
        logger_1.logger.error('Agent Init', 'Failed to initialize agent', error);
        throw error;
    }
}
async function runAutonomousMode(agent, config, interval = 10) {
    logger_1.logger.info('Auto Mode', `Starting autonomous mode with ${interval}s interval`);
    while (true) {
        try {
            // The agent's "thought" is just a prompt you provide
            const thought = "Perform an interesting on-chain action on Hedera that showcases your capabilities.";
            logger_1.logger.debug('Auto Mode', 'Sending thought to agent', { thought });
            // You can stream or await the entire call
            logger_1.logger.info('Auto Mode', 'Streaming agent response');
            const startTime = Date.now();
            const stream = await agent.stream({ messages: [new messages_1.HumanMessage(thought)] }, config);
            logger_1.logger.debug('Auto Mode', 'Stream object received, processing chunks');
            for await (const chunk of stream) {
                if ("agent" in chunk) {
                    logger_1.logger.info('Auto Mode', 'Received agent message', {
                        contentLength: chunk.agent.messages[0].content.length,
                        messageType: chunk.agent.messages[0].type
                    });
                    console.log(chunk.agent.messages[0].content);
                }
                else if ("tools" in chunk) {
                    logger_1.logger.info('Auto Mode', 'Received tool message', {
                        contentLength: chunk.tools.messages[0].content.length,
                        messageType: chunk.tools.messages[0].type
                    });
                    console.log(chunk.tools.messages[0].content);
                }
                console.log("-------------------");
            }
            const executionTime = Date.now() - startTime;
            logger_1.logger.info('Auto Mode', 'Agent execution completed', {
                executionTimeMs: executionTime
            });
            // Sleep for `interval` seconds between each iteration
            logger_1.logger.debug('Auto Mode', `Sleeping for ${interval} seconds`);
            await new Promise((resolve) => setTimeout(resolve, interval * 1000));
        }
        catch (error) {
            if (error instanceof Error) {
                logger_1.logger.error('Auto Mode', 'Error in autonomous mode', error);
            }
            process.exit(1);
        }
    }
}
async function runChatMode(agent, config) {
    logger_1.logger.info('Chat Mode', 'Starting chat mode');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
    try {
        while (true) {
            const userInput = await question("\nPrompt: ");
            if (userInput.toLowerCase() === "exit") {
                logger_1.logger.info('Chat Mode', 'User requested exit');
                break;
            }
            logger_1.logger.info('Chat Mode', 'Received user input', {
                inputLength: userInput.length,
                firstWords: userInput.split(' ').slice(0, 3).join(' ') + '...'
            });
            // Determine if we should use Ollama or OpenAI
            // Ensure we use the global variable for consistent behavior
            const shouldUseOllama = USE_HYBRID_MODEL && ollamaAvailable && !(0, ollama_client_1.mightRequireTools)(userInput);
            // Add debug logging to see why we're not using Ollama
            console.log(`\n[DEBUG] Model selection decision:
        USE_HYBRID_MODEL: ${USE_HYBRID_MODEL}
        ollamaAvailable: ${ollamaAvailable}
        requiresTools: ${(0, ollama_client_1.mightRequireTools)(userInput)}
        Final decision: Using ${shouldUseOllama ? 'OLLAMA' : 'OPENAI'}\n`);
            if (shouldUseOllama) {
                // Use Ollama for general queries
                logger_1.logger.info('Chat Mode', 'Using Ollama for general query', {
                    model: process.env.OLLAMA_MODEL || 'qwen2.5:3b'
                });
                try {
                    const startTime = Date.now();
                    const ollamaResponse = await (0, ollama_client_1.queryOllama)(userInput);
                    const executionTime = Date.now() - startTime;
                    logger_1.logger.info('Chat Mode', 'Ollama response received', {
                        executionTimeMs: executionTime,
                        responseLength: ollamaResponse.length,
                        model: process.env.OLLAMA_MODEL || 'qwen2.5:3b'
                    });
                    console.log(ollamaResponse);
                    console.log("-------------------");
                }
                catch (error) {
                    logger_1.logger.error('Chat Mode', 'Error using Ollama, falling back to OpenAI', error);
                    // Fall back to OpenAI
                    await processWithOpenAI(agent, config, userInput);
                }
            }
            else {
                // Use OpenAI for tool-related queries
                if (USE_HYBRID_MODEL) {
                    logger_1.logger.info('Chat Mode', 'Using OpenAI for tool-related query', {
                        model: "o3-mini",
                        ollamaAvailable
                    });
                }
                await processWithOpenAI(agent, config, userInput);
            }
        }
    }
    catch (error) {
        if (error instanceof Error) {
            logger_1.logger.error('Chat Mode', 'Error in chat mode', error);
        }
        process.exit(1);
    }
    finally {
        rl.close();
    }
}
async function processWithOpenAI(agent, config, userInput) {
    // for now, isCustodial is based on env, but later it can be changed and passed with a prompt text coming from FE
    const isCustodial = process.env.CUSTODIAL_MODE === "true";
    logger_1.logger.debug('Chat Mode', `Using ${isCustodial ? 'custodial' : 'non-custodial'} mode`);
    const modelName = "o3-mini";
    logger_1.logger.info('Chat Mode', 'Sending prompt to OpenAI agent', {
        model: modelName
    });
    // Log model usage
    logger_1.logger.modelUsage(modelName, 'Query started', {
        promptLength: userInput.length
    });
    const startTime = Date.now();
    const stream = await sendPrompt(agent, config, userInput, isCustodial);
    logger_1.logger.debug('Chat Mode', 'Stream object received, processing chunks');
    for await (const chunk of stream) {
        if ("agent" in chunk) {
            logger_1.logger.info('Chat Mode', 'Received agent message', {
                contentLength: chunk.agent.messages[0].content.length,
                messageType: chunk.agent.messages[0].type
            });
            console.log(chunk.agent.messages[0].content);
        }
        else if ("tools" in chunk) {
            logger_1.logger.info('Chat Mode', 'Received tool message', {
                contentLength: chunk.tools.messages[0].content.length,
                messageType: chunk.tools.messages[0].type
            });
            console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
    }
    const executionTime = Date.now() - startTime;
    logger_1.logger.info('Chat Mode', 'OpenAI agent execution completed', {
        executionTimeMs: executionTime,
        model: modelName
    });
    // Log model usage completion
    logger_1.logger.modelUsage(modelName, 'Query completed', {
        executionTimeMs: executionTime
    });
}
async function sendPrompt(agent, config, userInput, isCustodial) {
    logger_1.logger.debug('Send Prompt', 'Creating agent configuration', {
        isCustodial,
        threadId: config.configurable.thread_id
    });
    const expandedConfig = {
        ...config,
        configurable: {
            ...config.configurable,
            isCustodial: isCustodial
        }
    };
    logger_1.logger.debug('Send Prompt', 'Creating human message');
    const message = new messages_1.HumanMessage(userInput);
    logger_1.logger.debug('Send Prompt', 'Streaming agent response');
    return agent.stream({ messages: [message] }, expandedConfig);
}
async function chooseMode() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
    while (true) {
        console.log("\nAvailable modes:");
        console.log("1. chat      - Interactive chat mode");
        console.log("2. auto      - Autonomous action mode");
        console.log("3. character - Character roleplay mode");
        logger_1.logger.debug('Choose Mode', 'Waiting for user input');
        const choice = (await question("\nChoose a mode (enter number or name): "))
            .toLowerCase()
            .trim();
        logger_1.logger.debug('Choose Mode', 'User selected', { choice });
        rl.close();
        if (choice === "1" || choice === "chat") {
            logger_1.logger.info('Choose Mode', 'Chat mode selected');
            return "chat";
        }
        else if (choice === "2" || choice === "auto") {
            logger_1.logger.info('Choose Mode', 'Autonomous mode selected');
            return "auto";
        }
        else if (choice === "3" || choice === "character") {
            logger_1.logger.info('Choose Mode', 'Character mode selected');
            return "character";
        }
        logger_1.logger.warn('Choose Mode', 'Invalid choice', { choice });
        console.log("Invalid choice. Please try again.");
    }
}
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
        // Enable character mode in config
        (0, config_1.enableCharacterMode)(selectedFileName);
        rl.close();
        return character;
    }
    catch (error) {
        logger_1.logger.error('Character Selection', 'Error selecting character', error);
        rl.close();
        return null;
    }
}
async function runCharacterMode(agent, config) {
    logger_1.logger.info('Character Mode', 'Starting character mode');
    // Select a character first
    const selectedCharacter = await chooseCharacter();
    if (!selectedCharacter) {
        logger_1.logger.error('Character Mode', 'No character selected, exiting character mode');
        return;
    }
    // Set the active character
    activeCharacter = selectedCharacter;
    logger_1.logger.info('Character Mode', `Active character: ${activeCharacter.name}`);
    // Display the character's first message
    console.log("\n--- Character Interaction ---");
    console.log(`${activeCharacter.name}: ${activeCharacter.first_mes}`);
    console.log("-------------------");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
    try {
        while (true) {
            const userInput = await question("\nYou: ");
            if (userInput.toLowerCase() === "exit") {
                logger_1.logger.info('Character Mode', 'User requested exit');
                break;
            }
            logger_1.logger.info('Character Mode', 'Received user input', {
                inputLength: userInput.length,
                firstWords: userInput.split(' ').slice(0, 3).join(' ') + '...'
            });
            // Determine if we should use Ollama or OpenAI
            const shouldUseOllama = USE_HYBRID_MODEL && ollamaAvailable && !(0, ollama_client_1.mightRequireTools)(userInput);
            // Add debug logging to see why we're not using Ollama
            console.log(`\n[DEBUG] Model selection decision:
        USE_HYBRID_MODEL: ${USE_HYBRID_MODEL}
        ollamaAvailable: ${ollamaAvailable}
        requiresTools: ${(0, ollama_client_1.mightRequireTools)(userInput)}
        Final decision: Using ${shouldUseOllama ? 'OLLAMA' : 'OPENAI'}\n`);
            if (shouldUseOllama) {
                // Use Ollama with character mode
                logger_1.logger.info('Character Mode', 'Using Ollama with character', {
                    model: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
                    character: activeCharacter.name
                });
                try {
                    const startTime = Date.now();
                    // Pass the active character to queryOllama
                    const ollamaResponse = await (0, ollama_client_1.queryOllama)(userInput, activeCharacter);
                    const executionTime = Date.now() - startTime;
                    logger_1.logger.info('Character Mode', 'Ollama response received', {
                        executionTimeMs: executionTime,
                        responseLength: ollamaResponse.length,
                        model: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
                        character: activeCharacter.name
                    });
                    console.log(`\n${activeCharacter.name}: ${ollamaResponse}`);
                    console.log("-------------------");
                }
                catch (error) {
                    logger_1.logger.error('Character Mode', 'Error using Ollama, falling back to OpenAI', error);
                    // Fall back to OpenAI (without character mode)
                    await processWithOpenAI(agent, config, userInput);
                }
            }
            else {
                // Use OpenAI for tool-related queries (without character mode as requested)
                if (USE_HYBRID_MODEL) {
                    logger_1.logger.info('Character Mode', 'Using OpenAI for tool-related query', {
                        model: "o3-mini",
                        ollamaAvailable
                    });
                }
                await processWithOpenAI(agent, config, userInput);
            }
        }
    }
    catch (error) {
        if (error instanceof Error) {
            logger_1.logger.error('Character Mode', 'Error in character mode', error);
        }
        process.exit(1);
    }
    finally {
        rl.close();
        (0, config_1.disableCharacterMode)();
    }
}
async function main() {
    try {
        validateEnvironment();
        await checkOllamaAvailability();
        const { agent, config } = await initializeAgent();
        const mode = await chooseMode();
        if (mode === "chat") {
            await runChatMode(agent, config);
        }
        else if (mode === "auto") {
            await runAutonomousMode(agent, config);
        }
        else if (mode === "character") {
            await runCharacterMode(agent, config);
        }
        process.exit(0);
    }
    catch (error) {
        if (error instanceof Error) {
            logger_1.logger.error('Main', 'Error in main function', error);
        }
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch((error) => {
        logger_1.logger.error('Main', 'Fatal error', error);
        console.error("Fatal error:", error);
        process.exit(1);
    });
}
