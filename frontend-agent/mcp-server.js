// agent/mcp-server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const HederaAgentKit = require('./hedera-agent-kit');
const { createHederaTools } = require('./tools');
const MCPAdapter = require('./mcp-adapter');

// Load environment variables
dotenv.config();

/**
 * MCP server that provides an API for OpenAI to interact with tools
 */
class MCPServer {
  /**
   * Create a new MCP server
   * @param {Tool[]} tools - Array of tools
   * @param {number} port - Server port
   */
  constructor(tools, port = 3000) {
    this.app = express();
    this.adapter = new MCPAdapter(tools);
    this.port = port;
    
    // Setup middleware
    this.app.use(cors());
    this.app.use(bodyParser.json());
    
    // Setup routes
    this.setupRoutes();
    
    console.log(`MCPServer created with ${tools.length} tools`);
  }
  
  /**
   * Setup API routes
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
      } catch (error) {
        console.error(`Error executing tool ${name}:`, error);
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
      } catch (error) {
        console.error(`Error executing MCP action ${action}:`, error);
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
   * @returns {Promise<void>} Promise that resolves when server starts
   */
  async start() {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`MCP server started on http://localhost:${this.port}`);
        resolve();
      });
    });
  }
  
  /**
   * Get the server URL
   * @returns {string} Server URL
   */
  getUrl() {
    return `http://localhost:${this.port}`;
  }
}

async function main() {
  // Validate required environment variables
  if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
    console.error('Missing required environment variables: HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY');
    process.exit(1);
  }
  
  // Initialize HederaAgentKit
  const hederaKit = new HederaAgentKit(
    process.env.HEDERA_ACCOUNT_ID,
    process.env.HEDERA_PRIVATE_KEY,
    process.env.HEDERA_NETWORK_TYPE || 'testnet'
  );
  
  // Create tools
  const tools = createHederaTools(hederaKit);
  
  // Create and start MCP server
  const port = process.env.MCP_SERVER_PORT ? parseInt(process.env.MCP_SERVER_PORT) : 3000;
  const mcpServer = new MCPServer(tools, port);
  await mcpServer.start();
}

// Run the server if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error starting MCP server:', error);
    process.exit(1);
  });
}

module.exports = MCPServer; 