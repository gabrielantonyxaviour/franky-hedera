const { OpenAI } = require('openai');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * OpenAI client that interacts with the MCP server
 */
class MCPOpenAIClient {
  /**
   * Create a new MCP OpenAI client
   * @param {string} apiKey - OpenAI API key
   * @param {string} mcpUrl - MCP server URL
   * @param {string} model - OpenAI model to use
   */
  constructor(apiKey, mcpUrl, model = 'gpt-4o') {
    this.openai = new OpenAI({ apiKey });
    this.mcpUrl = mcpUrl;
    this.model = model;
    // Initialize conversation history
    this.conversationHistory = [];
    
    console.log(`MCPOpenAIClient created with model: ${model}, MCP URL: ${mcpUrl}`);

    this.systemMessage = `You are a helpful assistant with access to tools. 
You remember the conversation history and maintain context between messages.

CRITICALLY IMPORTANT INSTRUCTIONS FOR TOOL USAGE:
1. When you need to execute a tool, you MUST format your response EXACTLY like this:
   "I'll use the [tool_name] tool with these parameters: [JSON parameters]"

2. For character creation specifically, once you have all required information, you MUST use:
   "I'll use the create_character tool with these parameters: {"name": "Name", "description": "Description", "personality": "Personality", "scenario": "Scenario", "first_mes": "First message", "mes_example": "Example message", "creator_notes": "Creator notes", "system_prompt": "System prompt"}"

3. For character searching, when asked about ANY character or to find ANY character, you MUST use:
   "I'll use the find_character tool with these parameters: {"search_term": "any term"}"
   NOTE: find_character now returns ALL characters from the topic regardless of search term!

4. For listing all characters, when asked to show all characters or browse characters, you MUST use:
   "I'll use the list_all_characters tool with these parameters: {}"

5. DO NOT improvise or make up your own response format. The exact format above is required for the tool to work.

6. DO NOT claim you have created or found a character without using the appropriate tool with the exact format above.

7. When you use the find_character tool, you MUST analyze all the character data returned and answer questions about ANY character using that data.

Example of CORRECT responses:
- "I'll use the create_character tool with these parameters: {"name": "Alice", "description": "A tall woman with blue eyes", "personality": "Friendly and outgoing", "scenario": "In a coffee shop", "first_mes": "Hello, nice to meet you!", "mes_example": "How are you today?", "creator_notes": "Speaks formally", "system_prompt": "You are Alice, a friendly barista."}"

- "I'll use the find_character tool with these parameters: {"search_term": "any term"}"

- "I'll use the list_all_characters tool with these parameters: {}"

- "I'll use the addition tool with these parameters: {"a": 5, "b": 3}"

Example of INCORRECT response (DO NOT DO THIS):
"I found a character named BlackBeard who is a pirate."`;
    
    this.followUpResponseExample = `To create a character:
{
  "name": "Character name",
  "description": "Physical appearance",
  "personality": "Personality traits",
  "scenario": "Background setting",
  "first_mes": "First message",
  "mes_example": "Example message",
  "creator_notes": "Creator notes",
  "system_prompt": "System instructions"
}

You can also perform addition: {"a": 5, "b": 3}`;
  }
  
  /**
   * Get tool descriptions from the MCP server
   * @returns {string} Tool descriptions
   */
  async getToolDescriptions() {
    try {
      // Get list of tools
      const response = await axios.get(`${this.mcpUrl}/tools`);
      const data = response.data;
      
      if (!data.tools || !Array.isArray(data.tools)) {
        throw new Error('Invalid response from MCP server');
      }
      
      // Get description for each tool
      const toolPromises = data.tools.map(async toolName => {
        const toolResponse = await axios.get(`${this.mcpUrl}/tools/${toolName}`);
        const toolData = toolResponse.data;
        return `${toolData.name}: ${toolData.description}`;
      });
      
      const toolDescriptions = await Promise.all(toolPromises);
      return toolDescriptions.join('\n\n');
    } catch (error) {
      console.error('Error getting tool descriptions:', error.message);
      return 'Error getting tool descriptions';
    }
  }
  
  /**
   * Generate a response using OpenAI with access to MCP tools
   * @param {string} userMessage - User message
   * @param {string} systemMessage - System message
   * @returns {Object} Response and tool calls
   */
  async generateResponse(userMessage, systemMessage) {
    // Get tool descriptions
    const toolDescriptions = await this.getToolDescriptions();
    
    // Create system message with tool descriptions
    const fullSystemMessage = `${systemMessage || this.systemMessage}\n\n` +
      `You have access to the following tools:\n\n${toolDescriptions}\n\n` +
      `IMPORTANT INSTRUCTIONS:\n` +
      `1. ALWAYS execute tools immediately based on user requests.\n` +
      `2. Maintain context between messages and remember information shared earlier.\n` +
      `3. Be conversational but concise.\n\n` +
      `EXAMPLE REQUESTS AND EXACT REQUIRED RESPONSES:\n` +
      `- User: "Add 5 and 7"\n` +
      `  You: I'll use the addition tool with these parameters: {"a": 5, "b": 7}.\n\n` +
      `Always format your tool usage EXACTLY as shown in the example above.`;
    
    try {
      // Build messages array with conversation history
      const messages = [
        { role: 'system', content: fullSystemMessage },
        ...this.conversationHistory,
        { role: 'user', content: userMessage }
      ];
      
      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.7, // Slightly higher temperature for more natural responses
      });
      
      const responseText = completion.choices[0]?.message?.content || '';
      console.log('Generated response:', responseText);
      
      // Update conversation history
      this.conversationHistory.push({ role: 'user', content: userMessage });
      this.conversationHistory.push({ role: 'assistant', content: responseText });
      
      // Limit history length to avoid token limit issues (keep last 10 exchanges)
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }
      
      // Extract tool calls from the response
      const toolCalls = this.extractToolCalls(responseText);
      
      return {
        response: responseText,
        toolCalls
      };
    } catch (error) {
      console.error('Error generating response:', error.message);
      throw error;
    }
  }
  
  /**
   * Extract tool calls from OpenAI response
   * @param {string} text - Response text
   * @returns {Array} Tool calls
   */
  extractToolCalls(text) {
    const toolCalls = [];
    console.log("Extracting tool calls from text:", text);
    
    // First, check for structured formatted tool calls based on examples
    const toolRegex = /I['']ll use the (\w+) tool with these parameters:?\s*({[^}]*})/g;
    
    let match;
    while ((match = toolRegex.exec(text)) !== null) {
      try {
        const toolName = match[1].trim();
        let args = {};
        
        // Parse the JSON arguments
        try {
          const argsText = match[2].trim();
          console.log(`Found tool call for "${toolName}" with args text:`, argsText);
          if (argsText !== '{}') {
            args = JSON.parse(argsText);
          }
        } catch (jsonError) {
          console.error('Error parsing tool args JSON:', jsonError);
        }
        
        console.log(`Extracted tool call for ${toolName}:`, args);
        toolCalls.push({ name: toolName, args });
      } catch (error) {
        console.error('Error parsing tool call:', error);
      }
    }
    
    // If no tool calls found with the standard format, try alternative patterns
    if (toolCalls.length === 0) {
      console.log("No tool calls were extracted using standard format. Trying alternative patterns...");
      
      // Special handling for character creation
      if (text.toLowerCase().includes("character") && 
          (text.includes("create") || text.includes("generated") || text.includes("submitted"))) {
        console.log("Detected character creation scenario, attempting to parse character data...");
        
        // Strategy 1: Look for JSON blocks
        const jsonRegex = /\{[\s\S]*?name[\s\S]*?\}/g;
        const jsonMatches = [...text.matchAll(jsonRegex)];
        
        for (const jsonMatch of jsonMatches) {
          try {
            const jsonStr = jsonMatch[0].replace(/\\"/g, '"').replace(/\\n/g, '');
            console.log("Found potential JSON data:", jsonStr);
            
            let parsedJson;
            try {
              parsedJson = JSON.parse(jsonStr);
            } catch (e) {
              // Try to clean the JSON string by removing invalid characters
              const cleanedStr = jsonStr
                .replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Add quotes around keys
                .replace(/:\s*'([^']*)'/g, ':"$1"')                  // Replace single quotes with double quotes
                .replace(/,\s*}/g, '}');                             // Remove trailing commas
              
              console.log("Attempting to parse cleaned JSON:", cleanedStr);
              parsedJson = JSON.parse(cleanedStr);
            }
            
            if (parsedJson && parsedJson.name) {
              console.log("Successfully parsed character data:", parsedJson);
              
              // Ensure all required fields are present
              const requiredFields = ['name', 'description', 'personality', 'scenario', 
                                    'first_mes', 'mes_example', 'creator_notes', 'system_prompt'];
              
              let characterData = {};
              let missingFields = [];
              
              for (const field of requiredFields) {
                // Check various possible key names for each field
                const fieldVariants = [
                  field,
                  field.replace('_', ' '),
                  field.replace('_mes', '_message'),
                  field.replace('mes_', 'message_'),
                  field.replace('first_mes', 'first message'),
                  field.replace('mes_example', 'example messages')
                ];
                
                let found = false;
                for (const variant of fieldVariants) {
                  if (parsedJson[variant] !== undefined) {
                    characterData[field] = parsedJson[variant];
                    found = true;
                    break;
                  }
                }
                
                if (!found) {
                  missingFields.push(field);
                }
              }
              
              if (missingFields.length === 0) {
                console.log("All required fields found. Creating tool call.");
                toolCalls.push({ name: "create_character", args: characterData });
                break;
              } else {
                console.log(`Missing required fields: ${missingFields.join(', ')}`);
                
                // Try to extract missing fields from text context
                const extractedFields = this.extractCharacterFieldsFromText(text, missingFields);
                if (Object.keys(extractedFields).length > 0) {
                  console.log("Extracted additional fields from text:", extractedFields);
                  const combinedData = { ...characterData, ...extractedFields };
                  
                  const stillMissing = requiredFields.filter(field => !combinedData[field]);
                  if (stillMissing.length === 0) {
                    console.log("All required fields now present. Creating tool call.");
                    toolCalls.push({ name: "create_character", args: combinedData });
                    break;
                  } else {
                    console.log(`Still missing fields: ${stillMissing.join(', ')}`);
                  }
                }
              }
            }
          } catch (error) {
            console.log("Failed to process JSON data:", error);
          }
        }
        
        // Strategy 2: Extract from key-value pairs if no JSON found
        if (toolCalls.length === 0) {
          console.log("Attempting to extract character data from key-value format in text");
          const characterData = this.extractCharacterFieldsFromText(text, [
            'name', 'description', 'personality', 'scenario', 
            'first_mes', 'mes_example', 'creator_notes', 'system_prompt'
          ]);
          
          if (Object.keys(characterData).length >= 6) { // At least 6 fields found
            console.log("Extracted character data from text:", characterData);
            toolCalls.push({ name: "create_character", args: characterData });
          }
        }
      }
    }
    
    return toolCalls;
  }
  
  /**
   * Extract character fields from text using regex patterns
   * @param {string} text - Text to extract from
   * @param {Array} fields - Fields to extract
   * @returns {Object} Extracted fields
   */
  extractCharacterFieldsFromText(text, fields) {
    const extracted = {};
    
    for (const field of fields) {
      // Create field variants to search for
      const fieldVariants = [
        field,
        field.replace('_', ' '),
        field.replace('_mes', ' message'),
        field.replace('mes_', 'message '),
        field.replace('first_mes', 'first message'),
        field.replace('mes_example', 'example messages')
      ];
      
      // Different regex patterns to try
      const patterns = [
        // Pattern for "Field: Value" format
        fieldVar => new RegExp(`${fieldVar}\\s*:\\s*["']?([^"',\\n]+)["']?`, 'i'),
        // Pattern for "Field = Value" format
        fieldVar => new RegExp(`${fieldVar}\\s*=\\s*["']?([^"',\\n]+)["']?`, 'i'),
        // Pattern for "- Field: Value" format (bullet points)
        fieldVar => new RegExp(`-\\s*${fieldVar}\\s*:\\s*["']?([^"',\\n]+)["']?`, 'i'),
        // Pattern for quoted values with possible line breaks
        fieldVar => new RegExp(`${fieldVar}\\s*:\\s*["']([^"']+)["']`, 'i'),
      ];
      
      // Try each field variant with each pattern
      for (const fieldVar of fieldVariants) {
        let found = false;
        
        for (const patternFn of patterns) {
          const pattern = patternFn(fieldVar);
          const match = text.match(pattern);
          
          if (match && match[1]) {
            extracted[field] = match[1].trim();
            found = true;
            break;
          }
        }
        
        if (found) break;
      }
    }
    
    return extracted;
  }
  
  /**
   * Execute tools identified in the response
   * @param {Array} toolCalls - Tool calls
   * @returns {Array} Tool results
   */
  async executeTools(toolCalls) {
    const results = [];
    console.log(`Preparing to execute ${toolCalls.length} tool calls:`, toolCalls);
    
    for (const toolCall of toolCalls) {
      try {
        console.log(`Executing tool: ${toolCall.name} with args:`, toolCall.args);
        
        // Call the MCP server to execute the tool
        const url = `${this.mcpUrl}/tools/${toolCall.name}/execute`;
        console.log(`Sending request to: ${url}`);
        
        const response = await axios.post(url, toolCall.args);
        
        const result = response.data;
        console.log(`Tool execution successful for ${toolCall.name}. Result:`, result);
        results.push({ toolName: toolCall.name, result });
      } catch (error) {
        console.error(`Error executing tool ${toolCall.name}:`, error.message);
        console.error('Error details:', error.response?.data || 'No response data');
        results.push({ 
          toolName: toolCall.name, 
          error: error.response?.data?.error || error.message 
        });
      }
    }
    
    return results;
  }
  
  /**
   * Generate a follow-up response with tool results
   * @param {string} userMessage - User message
   * @param {Array} toolResults - Tool results
   * @param {string} systemMessage - System message
   * @returns {string} Follow-up response
   */
  async generateFollowUp(userMessage, toolResults, systemMessage) {
    // Format tool results for the prompt
    const toolResultsText = toolResults.map(r => 
      r.error 
        ? `${r.toolName}: Error - ${r.error}` 
        : `${r.toolName}: ${JSON.stringify(r.result)}`
    ).join('\n\n');
    
    const fullSystemMessage = `${systemMessage || this.systemMessage}\n\n` +
      `You previously executed tools and got these results:\n\n${toolResultsText}\n\n` +
      `IMPORTANT INSTRUCTIONS:\n` +
      `1. Present the essential information from the results in a natural, conversational way.\n` +
      `2. For the addition tool, you can say something like "The result is X".\n` +
      `3. If status is "success", the operation was successful.\n` +
      `4. Keep your response concise but natural.\n` +
      `5. For errors, explain them clearly.`;
    
    try {
      // Build messages array with conversation history
      const messages = [
        { role: 'system', content: fullSystemMessage },
        ...this.conversationHistory.slice(0, -2), // Exclude the last exchange that triggered the tool
        { role: 'user', content: userMessage }
      ];
      
      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.7, // Slightly higher temperature for more natural responses
      });
      
      const responseText = completion.choices[0]?.message?.content || '';
      console.log('Generated follow-up response:', responseText);
      
      // Update conversation history, replacing the last assistant message
      // Remove the last assistant message first
      this.conversationHistory.pop();
      // Add the new follow-up response
      this.conversationHistory.push({ role: 'assistant', content: responseText });
      
      return responseText;
    } catch (error) {
      console.error('Error generating follow-up response:', error.message);
      throw error;
    }
  }
  
  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    console.log("Conversation history cleared");
    return "Conversation history cleared";
  }
}

module.exports = MCPOpenAIClient; 