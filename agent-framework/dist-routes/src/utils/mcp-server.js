"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const logger_1 = require("./logger");
const mcp_adapter_1 = require("./mcp-adapter");
/**
 * Simple MCP server that provides a REST API for OpenAI to interact with tools
 */
class MCPServer {
    /**
     * Create a new MCP server
     * @param tools The tools to expose via MCP
     * @param port The port to run the server on
     */
    constructor(tools, port = 3000) {
        this.app = (0, express_1.default)();
        this.adapter = new mcp_adapter_1.MCPAdapter(tools);
        this.port = port;
        // Setup middleware
        this.app.use((0, cors_1.default)());
        this.app.use(body_parser_1.default.json());
        // Setup routes
        this.setupRoutes();
        logger_1.logger.info('MCPServer', `Created with ${tools.length} tools`);
    }
    /**
     * Setup the API routes
     */
    setupRoutes() {
        // Get OpenAPI schema
        this.app.get('/openapi.json', (req, res) => {
            const schema = this.adapter.getOpenAPISchema();
            res.json(schema);
        });
        // List all available tools
        this.app.get('/tools', (req, res) => {
            const toolNames = this.adapter.getToolNames();
            res.json({ tools: toolNames });
        });
        // Get tool description
        this.app.get('/tools/:name', (req, res) => {
            const { name } = req.params;
            const description = this.adapter.getToolDescription(name);
            if (!description) {
                res.status(404).json({ error: `Tool not found: ${name}` });
                return;
            }
            res.json({ name, description });
        });
        // Execute a tool
        this.app.post('/tools/:name/execute', async (req, res) => {
            const { name } = req.params;
            const params = req.body;
            const isCustodial = req.query.custodial !== 'false'; // Default to true
            try {
                const result = await this.adapter.executeTool(name, params, isCustodial);
                res.json(result);
            }
            catch (error) {
                logger_1.logger.error('MCPServer', `Error executing tool ${name}`, { error, params });
                res.status(500).json({
                    error: error instanceof Error ? error.message : String(error),
                    tool: name,
                    params
                });
            }
        });
        // MCP compatibility endpoint
        this.app.post('/mcp/actions', async (req, res) => {
            const { action, parameters } = req.body;
            if (!action) {
                res.status(400).json({ error: 'Missing action parameter' });
                return;
            }
            try {
                const result = await this.adapter.executeTool(action, parameters || {});
                res.json({ result });
            }
            catch (error) {
                logger_1.logger.error('MCPServer', `Error executing MCP action ${action}`, { error, parameters });
                res.status(500).json({
                    error: error instanceof Error ? error.message : String(error),
                    action,
                    parameters
                });
            }
        });
    }
    /**
     * Start the server
     */
    async start() {
        return new Promise((resolve) => {
            this.app.listen(this.port, () => {
                logger_1.logger.info('MCPServer', `Started on port ${this.port}`);
                resolve();
            });
        });
    }
    /**
     * Get the URL of the server
     */
    getUrl() {
        return `http://localhost:${this.port}`;
    }
    /**
     * Get the adapter instance
     */
    getAdapter() {
        return this.adapter;
    }
}
exports.MCPServer = MCPServer;
