"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeMCPState = initializeMCPState;
exports.checkOllamaModel = checkOllamaModel;
exports.createCharacterPrompt = createCharacterPrompt;
exports.queryOllamaWithFallback = queryOllamaWithFallback;
exports.enhancedToolDetection = enhancedToolDetection;
exports.generateResponse = generateResponse;
const logger_1 = require("./logger");
const ollama_client_1 = require("./ollama-client");
// Global MCP state
let mcpState = {
    ollamaAvailable: false,
    activeCharacter: null
};
// Function to initialize MCP state
function initializeMCPState(openAIClient, ollamaAvailable, character) {
    mcpState = {
        openAIClient,
        ollamaAvailable,
        activeCharacter: character
    };
}
// Check if Ollama has the required model
async function checkOllamaModel() {
    try {
        logger_1.logger.info('API', 'Checking Ollama model availability');
        const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
        const configuredModel = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
        // First check if Ollama service is available
        const serviceResponse = await fetch(`${ollamaBaseUrl}/api/version`);
        if (!serviceResponse.ok) {
            logger_1.logger.warn('API', 'Ollama service is not available');
            return { available: false };
        }
        // Get list of available models
        const modelsResponse = await fetch(`${ollamaBaseUrl}/api/tags`);
        if (!modelsResponse.ok) {
            logger_1.logger.warn('API', 'Could not get Ollama models list');
            return { available: false };
        }
        const modelsData = await modelsResponse.json();
        const models = modelsData.models || [];
        const modelNames = models.map((model) => model.name);
        logger_1.logger.info('API', 'Available Ollama models', { modelNames });
        // Check if our configured model is available
        if (modelNames.includes(configuredModel)) {
            logger_1.logger.info('API', `Configured model ${configuredModel} is available`);
            return { available: true };
        }
        // Check if a model with the same family but different size is available
        // For example, if qwen2.5:14b is not available but qwen2.5:3b is
        const configuredModelFamily = configuredModel.split(':')[0];
        const familyMatches = modelNames.filter(name => name.startsWith(configuredModelFamily));
        if (familyMatches.length > 0) {
            logger_1.logger.info('API', `Using model from the same family: ${familyMatches[0]}`);
            return { available: true, fallbackModel: familyMatches[0] };
        }
        // If not, check for fallbacks
        const fallbackModels = ['llama3', 'llama2', 'gemma', 'mistral'];
        for (const fallback of fallbackModels) {
            const matchingModels = modelNames.filter((name) => name.startsWith(fallback));
            if (matchingModels.length > 0) {
                logger_1.logger.info('API', `Using fallback model: ${matchingModels[0]}`);
                return { available: true, fallbackModel: matchingModels[0] };
            }
        }
        // If there are any models available, use the first one
        if (modelNames.length > 0) {
            logger_1.logger.info('API', `Using first available model: ${modelNames[0]}`);
            return { available: true, fallbackModel: modelNames[0] };
        }
        logger_1.logger.warn('API', 'No Ollama models are available');
        return { available: false };
    }
    catch (error) {
        logger_1.logger.error('API', 'Error checking Ollama model availability', error);
        return { available: false };
    }
}
// Helper function to create character prompt
function createCharacterPrompt(character, prompt) {
    return `You are roleplaying as ${character.name}. ${character.description}\n\nUser: ${prompt}`;
}
// Wrapper for queryOllama to use our fallback model and limit response length
async function queryOllamaWithFallback(prompt, character) {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    const modelToUse = process.env.OLLAMA_FALLBACK_MODEL || process.env.OLLAMA_MODEL || 'qwen2.5:3b';
    logger_1.logger.info('API', `Using Ollama model: ${modelToUse}`);
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
            logger_1.logger.error('API', `HTTP error ${response.status}`, {
                errorText,
                status: response.status
            });
            throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        let ollamaResponse = data.response;
        if (ollamaResponse.length > 512) {
            logger_1.logger.info('API', `Limiting Ollama response from ${ollamaResponse.length} to 512 characters`);
            ollamaResponse = ollamaResponse.substring(0, 509) + '...';
        }
        return ollamaResponse;
    }
    catch (error) {
        logger_1.logger.error('API', 'Error querying Ollama', error);
        throw error;
    }
}
// Function to detect if input requires blockchain tools
function enhancedToolDetection(userInput) {
    // First run the original detection
    const originalDetection = (0, ollama_client_1.mightRequireTools)(userInput);
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
            logger_1.logger.debug('API', `Enhanced detection found term: ${term}`);
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
                logger_1.logger.debug('API', `Enhanced detection found complex question pattern: ${pattern}`);
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
// Main function to process user input and generate response
async function generateResponse(userInput, character) {
    logger_1.logger.info('API', 'Processing user input', {
        inputLength: userInput.length,
        firstWords: userInput.split(' ').slice(0, 3).join(' ') + '...'
    });
    // Use the provided character or fall back to the active character
    const activeCharacter = character || mcpState.activeCharacter;
    // Ensure we have a character and MCP client
    if (!activeCharacter) {
        return "Error: No character is active. Please initialize the service.";
    }
    if (!mcpState.openAIClient) {
        return "Error: MCP client is not initialized. Please initialize the service.";
    }
    // Use enhanced tool detection to be more aggressive in routing to OpenAI
    const requiresTools = enhancedToolDetection(userInput);
    if (requiresTools) {
        // Use MCP for blockchain operations and complex queries
        logger_1.logger.info('API', 'Detected complex query or blockchain operation, using OpenAI');
        try {
            // Generate response with MCP
            const { response, toolCalls } = await mcpState.openAIClient.generateResponse(userInput);
            // Only process tool calls if there are any
            if (toolCalls.length > 0) {
                logger_1.logger.info('API', `Executing tools: ${toolCalls.map(tc => tc.name).join(', ')}`);
                const toolResults = await mcpState.openAIClient.executeTools(toolCalls);
                // Generate follow-up response with character context
                const followUpResponse = await mcpState.openAIClient.generateFollowUp(userInput, toolResults, undefined, activeCharacter.name);
                return `Blockchain Result: ${followUpResponse}`;
            }
            else {
                // If there are no tool calls, return the regular response with character voice
                return `${activeCharacter.name}: ${response}`;
            }
        }
        catch (error) {
            logger_1.logger.error('API', 'Error using MCP', error);
            return `Sorry, I encountered an error processing your query: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
    else if (mcpState.ollamaAvailable) {
        // Only use Ollama for very simple conversation (like greetings)
        logger_1.logger.info('API', 'Using character mode with Ollama for simple query');
        try {
            // Pass the character to our modified Ollama function
            const ollamaResponse = await queryOllamaWithFallback(userInput, activeCharacter);
            return `${activeCharacter.name}: ${ollamaResponse}`;
        }
        catch (error) {
            logger_1.logger.error('API', 'Error with Ollama character response', error);
            // Fall back to OpenAI if Ollama fails
            logger_1.logger.info('API', 'Falling back to OpenAI after Ollama error');
            try {
                const { response } = await mcpState.openAIClient.generateResponse(userInput, `You are roleplaying as ${activeCharacter.name}. ${activeCharacter.description}`);
                return `${activeCharacter.name}: ${response}`;
            }
            catch (fallbackError) {
                logger_1.logger.error('API', 'Error with OpenAI fallback', fallbackError);
                return `Sorry, I encountered an error generating a response: ${error instanceof Error ? error.message : String(error)}`;
            }
        }
    }
    else {
        // Fallback if Ollama is not available
        logger_1.logger.warn('API', 'Ollama is not available, using OpenAI for character response');
        try {
            const { response } = await mcpState.openAIClient.generateResponse(userInput, `You are roleplaying as ${activeCharacter.name}. ${activeCharacter.description}`);
            return `${activeCharacter.name}: ${response}`;
        }
        catch (error) {
            logger_1.logger.error('API', 'Error with OpenAI fallback', error);
            return `Sorry, I encountered an error generating a response: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}
