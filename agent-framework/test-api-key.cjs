#!/usr/bin/env node

/**
 * Test script for API key verification (CommonJS version)
 * Run with: node test-api-key.cjs <agent-id> <api-key>
 * 
 * Make sure to install node-fetch first:
 * npm install node-fetch@2
 */

// Import required modules (using CommonJS format)
// @ts-ignore - Fix TypeScript error with node-fetch import
const fetch = require('node-fetch');

// Default values - replace with your own
const DEFAULT_API_KEY = "2aUeRX1V8pF4shLJP4kQGQfoNaSsxZQQSW9qQJ5WxgPAJ85Q9Ft35QYon1kXaEku9AoG5jZLAH3ae9W7Uf98QUZoh";
const DEFAULT_AGENT_ID = "10";

// Get command line arguments or use defaults
const agentId = process.argv[2] || DEFAULT_AGENT_ID;
const apiKey = process.argv[3] || DEFAULT_API_KEY;

// Endpoint URL - update with your ngrok URL if testing externally
const endpointUrl = "http://localhost:8000/api/ollama-proxy/generate";

async function testApiKeyVerification() {
  console.log("🔍 Testing API key verification");
  console.log(`📝 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`);
  console.log(`📝 Agent ID: ${agentId}`);
  console.log(`📝 Endpoint: ${endpointUrl}`);
  
  // Create test request data
  const requestData = {
    model: "llama3",  // Replace with an available model
    prompt: "Hello, who are you?",
    stream: false
  };
  
  try {
    console.log("\n🚀 Sending request with API key...");
    
    // @ts-ignore - Fix TypeScript fetch call signature error
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'agent-id': agentId
      },
      body: JSON.stringify(requestData)
    });
    
    if (response.ok) {
      // @ts-ignore - Fix TypeScript error for response.json()
      const data = await response.json();
      console.log("\n✅ API key verification successful!");
      
      // Display the response data safely
      let responseDisplay = '';
      if (data && typeof data === 'object') {
        if ('response' in data && typeof data.response === 'string') {
          responseDisplay = data.response.substring(0, 100);
        } else {
          responseDisplay = JSON.stringify(data).substring(0, 100);
        }
      } else {
        responseDisplay = String(data).substring(0, 100);
      }
      
      console.log(`🤖 Response from model: "${responseDisplay}..."`);
    } else {
      // @ts-ignore - Fix TypeScript error for response.text()
      const errorText = await response.text();
      console.error(`\n❌ API key verification failed with status: ${response.status}`);
      console.error(`Error: ${errorText}`);
    }
  } catch (error) {
    console.error("\n❌ Error during API key verification test:");
    console.error(error);
  }
}

// Run the test
testApiKeyVerification();
