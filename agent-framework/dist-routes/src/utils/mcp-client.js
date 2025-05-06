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
exports.queryMCP = queryMCP;
exports.isMCPAvailable = isMCPAvailable;
const node_fetch_1 = __importDefault(require("node-fetch"));
const logger_1 = require("./logger");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// MCP configuration
const MCP_API_URL = process.env.MCP_API_URL || 'http://localhost:8000/api/chat';
const MCP_DEFAULT_MODEL = process.env.MCP_DEFAULT_MODEL || 'gpt-4.1';
const MCP_API_KEY = process.env.MCP_API_KEY;
/**
 * Queries the MCP API with the given messages
 * @param userInput The user input
 * @param systemPrompt Optional system prompt
 * @param character Optional character for roleplay mode
 * @param modelName Optional model name to use
 * @param context Optional context to pass to the MCP API
 * @returns The response from the MCP API
 */
async function queryMCP(userInput, systemPrompt, character, modelName = MCP_DEFAULT_MODEL, context) {
    const startTime = Date.now();
    // Build messages array
    const messages = [];
    // Add system prompt if provided or use character prompt
    if (character) {
        // Format character prompt
        const characterSystem = `${character.system_prompt}

You are role-playing as ${character.name}.
${character.description}
${character.personality}

Background: ${character.scenario}

Here's how you typically respond: 
${character.mes_example}`;
        messages.push({ role: 'system', content: characterSystem });
    }
    else if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    // Add user message
    messages.push({ role: 'user', content: userInput });
    logger_1.logger.info('MCPClient', 'Querying MCP API', {
        apiUrl: MCP_API_URL,
        model: modelName,
        promptLength: userInput.length,
        characterMode: !!character,
        characterName: character?.name,
        hasSystemPrompt: !!systemPrompt
    });
    // Log model usage
    logger_1.logger.modelUsage(modelName, 'Query started', {
        promptLength: userInput.length,
        characterMode: !!character
    });
    try {
        // Build request
        const mcpRequest = {
            messages,
            model: modelName,
            stream: false,
            context
        };
        // Make request
        const response = await (0, node_fetch_1.default)(MCP_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(MCP_API_KEY ? { 'Authorization': `Bearer ${MCP_API_KEY}` } : {})
            },
            body: JSON.stringify(mcpRequest),
        });
        if (!response.ok) {
            const errorText = await response.text();
            logger_1.logger.error('MCPClient', `HTTP error ${response.status}`, {
                errorText,
                status: response.status
            });
            throw new Error(`MCP API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        const elapsedTime = Date.now() - startTime;
        const responseContent = data.choices[0]?.message?.content || '';
        logger_1.logger.info('MCPClient', 'MCP response received', {
            executionTimeMs: elapsedTime,
            responseLength: responseContent.length,
            characterMode: !!character,
            tokenUsage: data.usage
        });
        // Log model usage completion
        logger_1.logger.modelUsage(modelName, 'Query completed', {
            executionTimeMs: elapsedTime,
            responseLength: responseContent.length,
            characterMode: !!character,
            tokenUsage: data.usage
        });
        return responseContent;
    }
    catch (error) {
        logger_1.logger.error('MCPClient', 'Error querying MCP API', error);
        throw error;
    }
}
/**
 * Checks if the MCP API is available
 * @returns True if the MCP API is available, false otherwise
 */
async function isMCPAvailable() {
    try {
        logger_1.logger.debug('MCPClient', 'Checking MCP API availability');
        const response = await (0, node_fetch_1.default)(`${MCP_API_URL}/status`, {
            method: 'GET',
            headers: MCP_API_KEY ? { 'Authorization': `Bearer ${MCP_API_KEY}` } : {}
        });
        if (response.ok) {
            logger_1.logger.info('MCPClient', 'MCP API is available');
            return true;
        }
        logger_1.logger.warn('MCPClient', 'MCP API is not available', {
            status: response.status
        });
        return false;
    }
    catch (error) {
        logger_1.logger.warn('MCPClient', 'Error checking MCP API availability', {
            error: error.message || String(error)
        });
        return false;
    }
}
