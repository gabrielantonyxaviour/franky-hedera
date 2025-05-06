"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPAdapter = void 0;
const logger_1 = require("./logger");
/**
 * Simple MCP adapter that converts LangChain tools to MCP compatible format
 * and provides a standard interface for OpenAI to interact with them
 */
class MCPAdapter {
    constructor(tools) {
        this.toolsMap = new Map();
        tools.forEach(tool => {
            this.toolsMap.set(tool.name, tool);
        });
        logger_1.logger.info('MCPAdapter', `Initialized with ${tools.length} tools`);
    }
    /**
     * Gets the OpenAPI schema for all tools
     * This can be used by LLMs to understand tool capabilities
     */
    getOpenAPISchema() {
        const paths = {};
        const schemas = {};
        this.toolsMap.forEach((tool, name) => {
            // Create schema for tool
            const paramSchema = {
                type: 'object',
                properties: {},
                required: []
            };
            // Extract parameters from tool description
            const descLines = tool.description.split('\n');
            const inputsStartIdx = descLines.findIndex(line => line.startsWith('Inputs'));
            if (inputsStartIdx >= 0) {
                const inputLines = descLines.slice(inputsStartIdx + 1);
                inputLines.forEach(line => {
                    const match = line.match(/(\w+):\s+([\w]+),\s+(.*)/);
                    if (match) {
                        const [_, paramName, paramType, description] = match;
                        paramSchema.properties[paramName] = {
                            type: paramType === 'number' ? 'number' : 'string',
                            description
                        };
                        if (!description.includes('optional')) {
                            paramSchema.required.push(paramName);
                        }
                    }
                });
            }
            // Add path for this tool
            paths[`/${name}`] = {
                post: {
                    operationId: name,
                    summary: descLines[0],
                    description: tool.description,
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: `#/components/schemas/${name}Params`
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Successful operation',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object'
                                    }
                                }
                            }
                        }
                    }
                }
            };
            // Add schema for this tool's parameters
            schemas[`${name}Params`] = paramSchema;
        });
        // Construct the full OpenAPI schema
        return {
            openapi: '3.0.0',
            info: {
                title: 'Hedera Agent Tools',
                version: '1.0.0',
                description: 'API for Hedera blockchain operations'
            },
            paths,
            components: {
                schemas
            }
        };
    }
    /**
     * Execute a tool by name with the given parameters
     */
    async executeTool(toolName, params, isCustodial = true) {
        const tool = this.toolsMap.get(toolName);
        if (!tool) {
            logger_1.logger.error('MCPAdapter', `Tool not found: ${toolName}`);
            throw new Error(`Tool not found: ${toolName}`);
        }
        try {
            logger_1.logger.info('MCPAdapter', `Executing tool: ${toolName}`, { params });
            // Use the tool.invoke method which accepts the configurable option
            const result = await tool.invoke(JSON.stringify(params), {
                configurable: { isCustodial }
            });
            // Try to parse result as JSON, fallback to string if not possible
            try {
                return JSON.parse(result);
            }
            catch {
                return { result };
            }
        }
        catch (error) {
            logger_1.logger.error('MCPAdapter', `Error executing tool ${toolName}`, { error });
            throw error;
        }
    }
    /**
     * Get all tool names
     */
    getToolNames() {
        return Array.from(this.toolsMap.keys());
    }
    /**
     * Get a specific tool's description
     */
    getToolDescription(toolName) {
        return this.toolsMap.get(toolName)?.description;
    }
}
exports.MCPAdapter = MCPAdapter;
