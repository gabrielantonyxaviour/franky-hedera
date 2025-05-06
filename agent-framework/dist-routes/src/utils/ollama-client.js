"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryOllama = queryOllama;
exports.isOllamaAvailable = isOllamaAvailable;
exports.mightRequireTools = mightRequireTools;
// For Node.js < 18 compatibility
const node_fetch_1 = __importDefault(require("node-fetch"));
const logger_1 = require("./logger");
const characters_1 = require("../characters");
// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
/**
 * Queries Ollama with the given prompt
 * @param prompt The prompt to send to Ollama
 * @param character Optional character for roleplay mode
 * @returns The response from Ollama
 */
async function queryOllama(prompt, character) {
    const startTime = Date.now();
    // Apply character formatting if a character is provided
    const formattedPrompt = character
        ? (0, characters_1.createCharacterPrompt)(character, prompt)
        : prompt;
    logger_1.logger.info('OllamaClient', 'Querying Ollama', {
        baseUrl: OLLAMA_BASE_URL,
        model: OLLAMA_MODEL,
        promptLength: formattedPrompt.length,
        characterMode: !!character,
        characterName: character?.name
    });
    // Log model usage
    logger_1.logger.modelUsage(OLLAMA_MODEL, 'Query started', {
        promptLength: formattedPrompt.length,
        characterMode: !!character
    });
    try {
        const response = await (0, node_fetch_1.default)(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: formattedPrompt,
                stream: false,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            logger_1.logger.error('OllamaClient', `HTTP error ${response.status}`, {
                errorText,
                status: response.status
            });
            throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        const elapsedTime = Date.now() - startTime;
        logger_1.logger.info('OllamaClient', 'Ollama response received', {
            executionTimeMs: elapsedTime,
            responseLength: data.response.length,
            characterMode: !!character
        });
        // Log model usage completion
        logger_1.logger.modelUsage(OLLAMA_MODEL, 'Query completed', {
            executionTimeMs: elapsedTime,
            responseLength: data.response.length,
            characterMode: !!character
        });
        return data.response;
    }
    catch (error) {
        logger_1.logger.error('OllamaClient', 'Error querying Ollama', error);
        throw error;
    }
}
/**
 * Checks if Ollama is available
 * @returns True if Ollama is available, false otherwise
 */
async function isOllamaAvailable() {
    try {
        logger_1.logger.debug('OllamaClient', 'Checking Ollama availability');
        const response = await (0, node_fetch_1.default)(`${OLLAMA_BASE_URL}/api/version`, {
            method: 'GET',
        });
        if (response.ok) {
            const data = await response.json();
            logger_1.logger.info('OllamaClient', 'Ollama is available', { version: data.version });
            return true;
        }
        logger_1.logger.warn('OllamaClient', 'Ollama is not available', {
            status: response.status
        });
        return false;
    }
    catch (error) {
        logger_1.logger.warn('OllamaClient', 'Error checking Ollama availability', {
            error: error.message || String(error)
        });
        return false;
    }
}
/**
 * Checks if the input likely requires tool usage
 * This is a simple heuristic and can be improved
 */
function mightRequireTools(input) {
    const toolRelatedTerms = [
        'balance', 'transfer', 'send', 'hbar', 'token', 'account', 'topic',
        'create', 'get', 'associate', 'airdrop', 'claim', 'nft', 'ft',
        'hedera', 'transaction', 'wallet', 'mint', 'blockchain'
    ];
    const toolActionTerms = [
        'transfer', 'send', 'create', 'associate', 'airdrop', 'claim',
        'mint', 'check', 'delete', 'update', 'lookup', 'query', 'generate'
    ];
    const lowercaseInput = input.toLowerCase();
    // Find which specific terms matched
    const matchedToolTerms = toolRelatedTerms.filter(term => lowercaseInput.includes(term));
    const matchedActionTerms = toolActionTerms.filter(term => lowercaseInput.includes(term));
    // Check if the input contains both a tool-related term AND an action term
    const hasToolTerm = matchedToolTerms.length > 0;
    const hasActionTerm = matchedActionTerms.length > 0;
    // Check for special case: "topic" with any action term should always use tools
    const hasTopic = lowercaseInput.includes('topic');
    const topicWithAction = hasTopic && hasActionTerm;
    // More precise detection - must have both a tool term and an action term
    const requiresTools = hasToolTerm && hasActionTerm;
    // Check for specific Hedera-related terms that strongly indicate tool usage
    const hederaTerms = ['hedera', 'hbar', 'token', 'nft', 'blockchain', '0.0.']; // Added check for account/topic IDs
    const matchedHederaTerms = hederaTerms.filter(term => lowercaseInput.includes(term));
    const strongHedera = matchedHederaTerms.length > 0;
    // If input contains "what is" or "who is" or "explain", it's likely a general query
    const isQuestion = /what is|who is|explain|tell me about/.test(lowercaseInput);
    // Final decision: requires tools if strong indicators AND not a general question,
    // or if it's a topic-related action
    const finalDecision = ((requiresTools || strongHedera || topicWithAction) && !isQuestion);
    logger_1.logger.debug('OllamaClient', 'Tool usage detection', {
        input: lowercaseInput.substring(0, 50) + (lowercaseInput.length > 50 ? '...' : ''),
        hasToolTerm,
        matchedToolTerms,
        hasActionTerm,
        matchedActionTerms,
        topicWithAction,
        strongHedera,
        matchedHederaTerms,
        isQuestion,
        requiresTools: finalDecision
    });
    return finalDecision;
}
