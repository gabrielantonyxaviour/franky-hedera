import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Tool } from '@langchain/core/tools';
import { logger } from './logger';
import { MCPAdapter } from './mcp-adapter';

/**
 * Simple MCP server that provides a REST API for OpenAI to interact with tools
 */
export class MCPServer {
  private app: express.Express;
  private adapter: MCPAdapter;
  private port: number;
  
  /**
   * Create a new MCP server
   * @param tools The tools to expose via MCP
   * @param port The port to run the server on
   */
  constructor(tools: Tool[], port: number = 3000) {
    this.app = express();
    this.adapter = new MCPAdapter(tools);
    this.port = port;
    
    // Setup middleware
    this.app.use(cors());
    this.app.use(bodyParser.json());
    
    // Setup routes
    this.setupRoutes();
    
    logger.info('MCPServer', `Created with ${tools.length} tools`);
  }
  
  /**
   * Setup the API routes
   */
  private setupRoutes() {
    // Get OpenAPI schema
    this.app.get('/openapi.json', (req: Request, res: Response) => {
      const schema = this.adapter.getOpenAPISchema();
      res.json(schema);
    });
    
    // List all available tools
    this.app.get('/tools', (req: Request, res: Response) => {
      const toolNames = this.adapter.getToolNames();
      res.json({ tools: toolNames });
    });
    
    // Get tool description
    this.app.get('/tools/:name', (req: Request, res: Response) => {
      const { name } = req.params;
      const description = this.adapter.getToolDescription(name);
      
      if (!description) {
        res.status(404).json({ error: `Tool not found: ${name}` });
        return;
      }
      
      res.json({ name, description });
    });
    
    // Execute a tool
    this.app.post('/tools/:name/execute', async (req: Request, res: Response) => {
      const { name } = req.params;
      const params = req.body;
      const isCustodial = req.query.custodial !== 'false'; // Default to true
      
      try {
        const result = await this.adapter.executeTool(name, params, isCustodial);
        res.json(result);
      } catch (error) {
        logger.error('MCPServer', `Error executing tool ${name}`, { error, params });
        res.status(500).json({ 
          error: error instanceof Error ? error.message : String(error),
          tool: name,
          params
        });
      }
    });
    
    // MCP compatibility endpoint
    this.app.post('/mcp/actions', async (req: Request, res: Response) => {
      const { action, parameters } = req.body;
      
      if (!action) {
        res.status(400).json({ error: 'Missing action parameter' });
        return;
      }
      
      try {
        const result = await this.adapter.executeTool(action, parameters || {});
        res.json({ result });
      } catch (error) {
        logger.error('MCPServer', `Error executing MCP action ${action}`, { error, parameters });
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
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        logger.info('MCPServer', `Started on port ${this.port}`);
        resolve();
      });
    });
  }
  
  /**
   * Get the URL of the server
   */
  getUrl(): string {
    return `http://localhost:${this.port}`;
  }
  
  /**
   * Get the adapter instance
   */
  getAdapter(): MCPAdapter {
    return this.adapter;
  }
} 