const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const HederaAgentKit = require('./hedera-agent-kit');
const { createHederaTools } = require('./tools');
const MCPServer = require('./mcp-server');
const MCPOpenAIClient = require('./mcp-openai');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Global variable to store the OpenAI client
let openAIClient;

// Initialize MCP server and OpenAI client
async function initializeMCP() {
  try {
    console.log('Initializing HederaAgentKit');
    
    // Initialize HederaAgentKit
    const hederaKit = new HederaAgentKit(
      process.env.HEDERA_ACCOUNT_ID,
      process.env.HEDERA_PRIVATE_KEY,
      process.env.HEDERA_NETWORK_TYPE || 'testnet'
    );
    
    // Create tools
    console.log('Creating Hedera tools');
    const tools = createHederaTools(hederaKit);
    
    // Start MCP server
    console.log('Starting MCP server');
    const port = process.env.MCP_SERVER_PORT ? parseInt(process.env.MCP_SERVER_PORT) : 3000;
    const mcpServer = new MCPServer(tools, port);
    await mcpServer.start();
    
    // Create MCP OpenAI client
    console.log('Creating MCP OpenAI client');
    openAIClient = new MCPOpenAIClient(
      process.env.OPENAI_API_KEY,
      mcpServer.getUrl(),
      process.env.OPENAI_MODEL || 'gpt-4o'
    );
    
    return { mcpServer, openAIClient };
  } catch (error) {
    console.error('Failed to initialize MCP:', error);
    throw error;
  }
}

// Input and output topic IDs
const INPUT_TOPIC_ID = "0.0.5892483";
const OUTPUT_TOPIC_ID = "0.0.5892486";

// Create HederaKit for sending messages to topics
const hederaKit = new HederaAgentKit(
  process.env.HEDERA_ACCOUNT_ID,
  process.env.HEDERA_PRIVATE_KEY,
  process.env.HEDERA_NETWORK_TYPE || 'testnet'
);

// Define API endpoints

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API server is running' });
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const userInput = req.body.message;
    
    if (!userInput) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Message is required' 
      });
    }

    console.log(`Received user input: "${userInput.substring(0, 30)}${userInput.length > 30 ? '...' : ''}"`);
    
    // Send user message to input topic
    try {
      console.log(`Sending user message to input topic ${INPUT_TOPIC_ID}...`);
      await hederaKit.submitTopicMessage(INPUT_TOPIC_ID, userInput);
      console.log(`User message sent to topic ${INPUT_TOPIC_ID}`);
    } catch (topicError) {
      console.error(`Error sending user message to topic: ${topicError.message}`);
      // Continue even if topic submission fails
    }

    // Process the message with the agent
    console.log("Processing...");
    const { response, toolCalls } = await openAIClient.generateResponse(userInput);
    
    console.log("Generated response:", response);
    console.log("Extracted tool calls:", JSON.stringify(toolCalls, null, 2));
    
    let displayResponse = "";
    let toolResults = [];
    
    // Execute tool calls if any
    if (toolCalls.length > 0) {
      console.log(`Executing: ${toolCalls.map(tc => tc.name).join(', ')}...`);
      toolResults = await openAIClient.executeTools(toolCalls);
      
      console.log("Tool execution results:", JSON.stringify(toolResults, null, 2));
      
      // Generate follow-up response
      const followUpResponse = await openAIClient.generateFollowUp(userInput, toolResults);
      
      console.log(`Assistant response: ${followUpResponse}`);
      displayResponse = followUpResponse;
    } else {
      // If there are no tool calls, use the regular response
      console.log(`Assistant response: ${response}`);
      displayResponse = response;
    }
    
    // Send agent response to output topic
    try {
      console.log(`Sending agent response to output topic ${OUTPUT_TOPIC_ID}...`);
      await hederaKit.submitTopicMessage(OUTPUT_TOPIC_ID, displayResponse);
      console.log(`Agent response sent to topic ${OUTPUT_TOPIC_ID}`);
    } catch (topicError) {
      console.error(`Error sending agent response to topic: ${topicError.message}`);
      // Continue even if topic submission fails
    }
    
    // Send response back to the client
    res.json({ 
      status: 'success',
      input: userInput,
      response: displayResponse,
      tool_calls: toolCalls,
      tool_results: toolResults
    });
    
  } catch (error) {
    console.error('Error processing chat:', error);
    
    // Try to send error to output topic
    try {
      const errorMessage = "Sorry, I encountered an error while processing your request.";
      await hederaKit.submitTopicMessage(OUTPUT_TOPIC_ID, errorMessage);
    } catch (topicError) {
      console.error(`Error sending error message to topic: ${topicError.message}`);
    }
    
    res.status(500).json({ 
      status: 'error', 
      message: 'Error processing your request',
      error: error.message
    });
  }
});

// Clear history endpoint
app.post('/clear', (req, res) => {
  try {
    if (openAIClient) {
      openAIClient.clearHistory();
      console.log('Conversation history cleared');
      res.json({ status: 'success', message: 'Conversation history cleared' });
    } else {
      res.status(500).json({ status: 'error', message: 'OpenAI client not initialized' });
    }
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ status: 'error', message: 'Error clearing history', error: error.message });
  }
});

// Start the server
const API_PORT = process.env.API_PORT || 4000;

// Initialize and start the server
async function startServer() {
  try {
    await initializeMCP();
    
    app.listen(API_PORT, () => {
      console.log(`API server running on port ${API_PORT}`);
      console.log(`You can now interact with the agent via Postman at http://localhost:${API_PORT}/chat`);
      console.log('Send POST requests with JSON body: {"message": "your message here"}');
      console.log(`Messages will be recorded on Hedera topics:`);
      console.log(`  Input messages go to topic: ${INPUT_TOPIC_ID}`);
      console.log(`  Output messages go to topic: ${OUTPUT_TOPIC_ID}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 