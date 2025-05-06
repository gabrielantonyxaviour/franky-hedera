"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPOpenAIClient = void 0;
const openai_1 = __importDefault(require("openai"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const logger_1 = require("./logger");
/**
 * Client that connects OpenAI to our MCP server
 */
class MCPOpenAIClient {
    /**
     * Create a new MCP OpenAI client
     * @param apiKey OpenAI API key
     * @param mcpUrl URL of the MCP server
     * @param model OpenAI model to use
     */
    constructor(apiKey, mcpUrl, model = 'gpt-4.1') {
        this.openai = new openai_1.default({ apiKey });
        this.mcpUrl = mcpUrl;
        this.model = model;
        logger_1.logger.info('MCPOpenAIClient', `Created with MCP URL: ${mcpUrl}, model: ${model}`);
    }
    /**
     * Get tool descriptions from the MCP server
     */
    async getToolDescriptions() {
        try {
            const response = await (0, node_fetch_1.default)(`${this.mcpUrl}/tools`);
            const data = await response.json();
            const toolPromises = data.tools.map(async (toolName) => {
                const toolResponse = await (0, node_fetch_1.default)(`${this.mcpUrl}/tools/${toolName}`);
                const toolData = await toolResponse.json();
                return `${toolData.name}: ${toolData.description}`;
            });
            const toolDescriptions = await Promise.all(toolPromises);
            return toolDescriptions.join('\n\n');
        }
        catch (error) {
            logger_1.logger.error('MCPOpenAIClient', 'Error getting tool descriptions', { error });
            return 'Error getting tool descriptions';
        }
    }
    /**
     * Generate a response using OpenAI with access to MCP tools
     */
    async generateResponse(userMessage, systemMessage) {
        // Get tool descriptions
        const toolDescriptions = await this.getToolDescriptions();
        // Create system message with tool descriptions - MORE DIRECT
        const fullSystemMessage = `${systemMessage || 'You are a direct, action-oriented assistant that interacts with the Hedera blockchain. Take immediate action when requested.'}\n\n` +
            `You have access to the following tools:\n\n${toolDescriptions}\n\n` +
            `IMPORTANT INSTRUCTIONS:\n` +
            `1. ALWAYS execute tools immediately based on user requests.\n` +
            `2. For balance inquiries, ALWAYS use hedera_get_hbar_balance with empty params.\n` +
            `3. Be extremely concise - no explanations needed.\n\n` +
            `EXAMPLE REQUESTS AND EXACT REQUIRED RESPONSES:\n` +
            `- User: "Check my HBAR balance"\n` +
            `  You: I'll use the hedera_get_hbar_balance tool with these parameters: {}.\n` +
            `- User: "Create a topic"\n` +
            `  You: I'll use the hedera_create_topic tool with these parameters: {"name": "My Topic", "isSubmitKey": false}.\n\n` +
            `Always format your tool usage EXACTLY as shown in the examples above.`;
        try {
            // Call OpenAI API
            const completion = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: fullSystemMessage },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.3, // Lower temperature for more direct responses
            });
            const responseText = completion.choices[0]?.message?.content || '';
            logger_1.logger.info('MCPOpenAIClient', 'Generated response', { responseLength: responseText.length });
            // Extract tool calls from the response
            const toolCalls = this.extractToolCalls(responseText);
            return {
                response: responseText,
                toolCalls
            };
        }
        catch (error) {
            logger_1.logger.error('MCPOpenAIClient', 'Error generating response', { error });
            throw error;
        }
    }
    /**
     * Execute tools identified in the response
     */
    async executeTools(toolCalls) {
        const results = [];
        for (const toolCall of toolCalls) {
            try {
                logger_1.logger.info('MCPOpenAIClient', `Executing tool: ${toolCall.name}`, { args: toolCall.args });
                const response = await (0, node_fetch_1.default)(`${this.mcpUrl}/tools/${toolCall.name}/execute`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(toolCall.args)
                });
                const result = await response.json();
                results.push({ toolName: toolCall.name, result });
                logger_1.logger.info('MCPOpenAIClient', `Tool execution result for ${toolCall.name}`, { result });
            }
            catch (error) {
                logger_1.logger.error('MCPOpenAIClient', `Error executing tool ${toolCall.name}`, { error, args: toolCall.args });
                results.push({
                    toolName: toolCall.name,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        return results;
    }
    /**
     * Extract tool calls from an OpenAI response
     */
    extractToolCalls(text) {
        const toolCalls = [];
        // More flexible regex that can handle various formatting
        const toolRegex = /I['']ll use the (\w+) tool with these parameters:?\s*({[^}]*})/g;
        let match;
        while ((match = toolRegex.exec(text)) !== null) {
            try {
                const toolName = match[1].trim();
                let args = {};
                // Better JSON parsing handling
                try {
                    const argsText = match[2].trim();
                    if (argsText !== '{}') {
                        args = JSON.parse(argsText);
                    }
                }
                catch (jsonError) {
                    logger_1.logger.error('MCPOpenAIClient', 'Error parsing tool args JSON', {
                        argsText: match[2],
                        error: jsonError
                    });
                }
                logger_1.logger.debug('MCPOpenAIClient', `Extracted tool call for ${toolName}`, { args });
                toolCalls.push({ name: toolName, args });
            }
            catch (error) {
                logger_1.logger.error('MCPOpenAIClient', 'Error parsing tool call', {
                    match: match ? match.toString() : 'null',
                    error
                });
            }
        }
        return toolCalls;
    }
    /**
     * Generate a follow-up response with tool results
     */
    async generateFollowUp(userMessage, toolResults, systemMessage, characterName) {
        const toolResultsText = toolResults.map(r => r.error
            ? `${r.toolName}: Error - ${r.error}`
            : `${r.toolName}: ${JSON.stringify(r.result)}`).join('\n\n');
        // Add character context if provided
        const characterContext = characterName
            ? `\n8. If in character mode as "${characterName}", maintain a professional tone but say "As ${characterName}, I can tell you that" before presenting the results.`
            : '';
        const fullSystemMessage = `${systemMessage || 'You are a direct blockchain assistant providing concise results without explanation.'}\n\n` +
            `You previously executed tools and got these results:\n\n${toolResultsText}\n\n` +
            `IMPORTANT INSTRUCTIONS:\n` +
            `1. Present ONLY the essential information from the results.\n` +
            `2. For balances, format as: "HBAR Balance: XX.XX ℏ"\n` +
            `3. For topic creation: "Topic created: 0.0.XXXXX"\n` +
            `4. For topic deletion: If status is "success", say ONLY "Topic deleted successfully."\n` +
            `5. No pleasantries, explanations, or extra commentary.\n` +
            `6. For errors, just state: "Error: [specific error message]"\n` +
            `7. CRITICAL: If result contains "status":"success", the operation was successful - NEVER report an error!${characterContext}`;
        try {
            const completion = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: fullSystemMessage },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.3, // Lower temperature for more direct responses
            });
            const responseText = completion.choices[0]?.message?.content || '';
            logger_1.logger.info('MCPOpenAIClient', 'Generated follow-up response', { responseLength: responseText.length });
            return responseText;
        }
        catch (error) {
            logger_1.logger.error('MCPOpenAIClient', 'Error generating follow-up response', { error });
            throw error;
        }
    }
}
exports.MCPOpenAIClient = MCPOpenAIClient;
