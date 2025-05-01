const readline = require('readline');
const dotenv = require('dotenv');
const HederaAgentKit = require('./hedera-agent-kit');
const { createHederaTools, Tool, AdditionTool, CreateCharacterTool, FindCharacterTool, ListAllCharactersTool } = require('./tools');
const MCPServer = require('./mcp-server');
const MCPOpenAIClient = require('./mcp-openai');
const express = require('express');
const cors = require('cors');

// Load environment variables
dotenv.config();

// Validate environment variables
function validateEnvironment() {
  const missingVars = [];
  const requiredVars = ['OPENAI_API_KEY', 'HEDERA_ACCOUNT_ID', 'HEDERA_PRIVATE_KEY'];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error('Required environment variables are not set:', missingVars.join(', '));
    process.exit(1);
  }
  
  console.log('All required environment variables are set');
}

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
    const openAIClient = new MCPOpenAIClient(
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

// Run interactive chat with the agent
async function runAgentChat(openAIClient) {
  console.log('Starting MCP chat mode');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
  
  // Create HederaKit for sending messages to topics
  const hederaKit = new HederaAgentKit(
    process.env.HEDERA_ACCOUNT_ID,
    process.env.HEDERA_PRIVATE_KEY,
    process.env.HEDERA_NETWORK_TYPE || 'testnet'
  );
  
  // Input and output topic IDs
  const INPUT_TOPIC_ID = "0.0.5892483";
  const OUTPUT_TOPIC_ID = "0.0.5892486";

  try {
    console.log("\nHedera MCP Chat - Direct blockchain interactions");
    console.log("---------------------------------------------------------------");
    console.log('Special commands:');
    console.log('  "exit" - Exit the chat');
    console.log('  "clear" - Clear conversation history');
    console.log("---------------------------------------------------------------");
    console.log('Available tools:');
    console.log('  1. Addition Tool - Add two numbers together');
    console.log('  2. Create Character Tool - Create a character and send to topic 0.0.5882994');
    console.log('     Required fields: name, description, personality, scenario, first_mes,');
    console.log('     mes_example, creator_notes, system_prompt');
    console.log('  3. Find Character Tool - Find characters by name or attributes');
    console.log('     Example: "Tell me about BlackBeard" or "Find a pirate character"');
    console.log('  4. List All Characters Tool - Show all characters in the topic');
    console.log('     Example: "Show me all the characters" or "List all available characters"');
    console.log("---------------------------------------------------------------");
    console.log('Messages will be recorded on Hedera:');
    console.log(`  Input messages go to topic: ${INPUT_TOPIC_ID}`);
    console.log(`  Output messages go to topic: ${OUTPUT_TOPIC_ID}`);
    console.log("---------------------------------------------------------------");
    
    while (true) {
      const userInput = await question("\nYou: ");
      
      // Handle special commands
      if (userInput.toLowerCase() === "exit") {
        console.log('Exiting chat');
        break;
      }
      
      if (userInput.toLowerCase() === "clear") {
        openAIClient.clearHistory();
        console.log('Conversation history cleared');
        continue;
      }
      
      console.log(`Received user input: "${userInput.substring(0, 30)}${userInput.length > 30 ? '...' : ''}"`);
      
      // Send user message to input topic
      try {
        console.log(`Sending user message to input topic ${INPUT_TOPIC_ID}...`);
        await hederaKit.submitTopicMessage(INPUT_TOPIC_ID, userInput);
        console.log(`User message sent to topic ${INPUT_TOPIC_ID}`);
      } catch (topicError) {
        console.error(`Error sending user message to topic: ${topicError.message}`);
      }

      try {
        // Generate response
        console.log("\nProcessing...");
        const { response, toolCalls } = await openAIClient.generateResponse(userInput);
        
        console.log("Generated response:", response);
        console.log("Extracted tool calls:", JSON.stringify(toolCalls, null, 2));
        
        // If we have character creation details but no tool call, force a tool call
        if (toolCalls.length === 0 && 
            response.includes('name') && 
            response.includes('description') && 
            response.includes('personality') && 
            response.includes('successfully created')) {
          
          console.log("Detected character creation attempt without proper tool call format.");
          console.log("Response suggests character was created, but no tool call was made.");
          
          // Extract JSON from the response
          const jsonMatch = response.match(/\{[\s\S]*?name[\s\S]*?\}/);
          if (jsonMatch) {
            try {
              const jsonStr = jsonMatch[0];
              console.log("Attempting to extract character data from response:", jsonStr);
              
              // Check if the extracted text can be parsed as JSON
              // If not, we'll need a more sophisticated parser
              const characterData = JSON.parse(jsonStr);
              
              console.log("Manually creating tool call for character creation");
              toolCalls.push({
                name: "create_character",
                args: characterData
              });
            } catch (error) {
              console.error("Failed to extract character data from response:", error);
            }
          } else {
            console.log("Could not find character data in AI response");
          }
        }
        
        let displayResponse = "";
        
        // Only show a minimal response if there are tool calls
        if (toolCalls.length > 0) {
          // Execute any tool calls
          console.log(`\nExecuting: ${toolCalls.map(tc => tc.name).join(', ')}...`);
          const toolResults = await openAIClient.executeTools(toolCalls);
          
          console.log("Tool execution results:", JSON.stringify(toolResults, null, 2));
          
          // Generate follow-up response
          const followUpResponse = await openAIClient.generateFollowUp(userInput, toolResults);
          
          console.log(`\nAssistant: ${followUpResponse}`);
          displayResponse = followUpResponse;
        } else {
          // If there are no tool calls, show the regular response
          console.log(`\nAssistant: ${response}`);
          displayResponse = response;
        }
        
        // Send agent response to output topic
        try {
          console.log(`Sending agent response to output topic ${OUTPUT_TOPIC_ID}...`);
          await hederaKit.submitTopicMessage(OUTPUT_TOPIC_ID, displayResponse);
          console.log(`Agent response sent to topic ${OUTPUT_TOPIC_ID}`);
        } catch (topicError) {
          console.error(`Error sending agent response to topic: ${topicError.message}`);
        }
        
        console.log("\n---------------------------------------------------------------");
      } catch (error) {
        console.error('Error in chat processing:', error);
        console.log("\nSorry, I encountered an error while processing your request.");
        
        // Even if there's an error, try to send the error message to the output topic
        try {
          const errorMessage = "Sorry, I encountered an error while processing your request.";
          await hederaKit.submitTopicMessage(OUTPUT_TOPIC_ID, errorMessage);
        } catch (topicError) {
          console.error(`Error sending error message to topic: ${topicError.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Error in agent chat:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Main function
async function main() {
  try {
    validateEnvironment();
    
    const { openAIClient } = await initializeMCP();
    
    await runAgentChat(openAIClient);
    
    process.exit(0);
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

const createMCPAgent = async () => {
  const tools = createHederaTools({
    isCustodial: IS_CUSTODIAL,
    operatorId: process.env.OPERATOR_ID,
    operatorKey: process.env.OPERATOR_KEY,
    custodialClientId: process.env.CUSTODIAL_CLIENT_ID,
    custodialClientSecret: process.env.CUSTODIAL_CLIENT_SECRET,
    hederaNetwork: process.env.HEDERA_NETWORK
  });

  const mcpClient = new MCPOpenAIClient(
    process.env.OPENAI_API_KEY,
    process.env.OPENAI_MODEL || 'gpt-4o',
    tools,
    process.env.MCP_URL
  );

  return mcpClient;
}; 