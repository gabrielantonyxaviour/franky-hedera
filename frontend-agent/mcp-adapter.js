/**
 * MCP adapter that converts tools to MCP compatible format
 */
class MCPAdapter {
  /**
   * Create a new MCP adapter
   * @param {Tool[]} tools - Array of tools
   */
  constructor(tools) {
    this.toolsMap = new Map();
    tools.forEach(tool => {
      this.toolsMap.set(tool.name, tool);
    });
    
    console.log(`MCPAdapter initialized with ${tools.length} tools`);
  }
  
  /**
   * Get OpenAPI schema for all tools
   * @returns {Object} OpenAPI schema
   */
  getOpenAPISchema() {
    const paths = {};
    const schemas = {};
    
    this.toolsMap.forEach((tool, name) => {
      // Extract parameters from tool description
      const paramSchema = this.extractParamsFromDescription(tool.description);
      
      // Add path for this tool
      paths[`/tools/${name}/execute`] = {
        post: {
          operationId: name,
          summary: tool.description.split('\n')[0],
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
   * Extract parameter schema from tool description
   * @param {string} description - Tool description
   * @returns {Object} Parameter schema
   */
  extractParamsFromDescription(description) {
    const paramSchema = {
      type: 'object',
      properties: {},
      required: []
    };
    
    // Extract parameters from tool description
    const descLines = description.split('\n');
    const inputsStartIdx = descLines.findIndex(line => line.startsWith('Inputs'));
    
    if (inputsStartIdx >= 0) {
      const inputLines = descLines.slice(inputsStartIdx + 1);
      inputLines.forEach(line => {
        // Match parameter format: name: type, description
        const match = line.match(/(\w+):\s+([\w]+),\s+(.*)/);
        if (match) {
          const [_, paramName, paramType, paramDescription] = match;
          
          // Determine correct JSON schema type
          let schemaType = 'string';
          if (paramType === 'number') {
            schemaType = 'number';
          } else if (paramType === 'boolean') {
            schemaType = 'boolean';
          }
          
          // Add parameter to schema
          paramSchema.properties[paramName] = {
            type: schemaType,
            description: paramDescription
          };
          
          // Add to required list if not optional
          if (!paramDescription.includes('optional')) {
            paramSchema.required.push(paramName);
          }
        }
      });
    }
    
    return paramSchema;
  }
  
  /**
   * Execute a tool by name
   * @param {string} toolName - Tool name
   * @param {Object} params - Tool parameters
   * @param {boolean} isCustodial - Whether to use custodial mode
   * @returns {Object} Execution result
   */
  async executeTool(toolName, params, isCustodial = true) {
    const tool = this.toolsMap.get(toolName);
    if (!tool) {
      console.error(`Tool not found: ${toolName}`);
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    try {
      console.log(`Executing tool: ${toolName}`, params);
      
      // Call the tool with parameters and configuration
      const result = await tool.call(JSON.stringify(params), {
        configurable: { isCustodial }
      });
      
      // Try to parse result as JSON
      try {
        return JSON.parse(result);
      } catch {
        return { result };
      }
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all tool names
   * @returns {string[]} Tool names
   */
  getToolNames() {
    return Array.from(this.toolsMap.keys());
  }
  
  /**
   * Get a tool's description
   * @param {string} toolName - Tool name
   * @returns {string|undefined} Tool description
   */
  getToolDescription(toolName) {
    return this.toolsMap.get(toolName)?.description;
  }
}

module.exports = MCPAdapter; 