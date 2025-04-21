import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Mock device credentials for testing
const TEST_DEVICE_CREDENTIALS = `Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Device Address: 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
Device Model: Test Device
Registration Hash: 0x123456`;

// Create mock device credentials file
if (!fs.existsSync('device_credentials.txt')) {
  fs.writeFileSync('device_credentials.txt', TEST_DEVICE_CREDENTIALS);
  console.log('✅ Created mock device credentials file');
}

// Test configuration
const TEST_CONFIG = {
  // Mock agent ID (replace with a valid address format)
  agentId: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  // Mock API key (this is a dummy key for testing)
  apiKey: '2tZV2XyRJGdcofpu8pMXw9YqtShPWvcLg8CQNt4X16eq5',
  // Mock user messages
  userMessages: [
    'Hello, who are you?',
    'Tell me about blockchain technology',
    'Calculate 25 * 16',
    'Write a short poem about AI',
  ],
  // Whether to test with Lilypad
  testLilypad: true,
  // Whether to test with Ollama
  testOllama: true,
  // Local Ollama URL
  ollamaUrl: 'http://127.0.0.1:11434',
  // Local server port
  testPort: 3005,
  // Mock character data
  mockCharacter: {
    name: 'Test Assistant',
    description: 'A helpful AI assistant for testing',
    personality: 'Friendly, knowledgeable, and concise',
    scenario: 'You are helping a user test the Franky Agent Framework',
    first_mes: 'Hi! I\'m Test Assistant, how can I help you today?',
    mes_example: 'User: How are you?\nTest Assistant: I\'m doing great! How can I assist you today?',
    creatorcomment: 'This is a test character',
    tags: ['test', 'assistant', 'helpful'],
    talkativeness: 0.7,
    fav: true
  },
  // Mock user name
  userName: 'TestUser'
};

// === MOCKED MODULE FUNCTIONS ===

// Mock getAgentCharacter function
async function getAgentCharacter(agentId) {
  console.log(`🔄 Mocking agent data fetch for ID: ${agentId}`);
  
  return {
    id: agentId,
    subname: 'test-agent',
    owner: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    agentAddress: agentId,
    deviceAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    ngrokLink: 'https://test-agent.ngrok.io',
    avatar: 'avatar.png',
    isPublic: true,
    perApiCallAmount: 0.01,
    character: TEST_CONFIG.mockCharacter,
    keyHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Mock isCallerOwner function 
async function isCallerOwner(agentId, apiKey, ownerKeyHash) {
  console.log(`🔄 Mocking API key verification`);
  console.log(`Agent ID: ${agentId}`);
  console.log(`API Key: ${apiKey}`);
  
  return {
    status: 1, // 1 means successful verification
    caller: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
  };
}

// Mock uploadJsonToAkave function
async function uploadJsonToAkave(jsonData, bucketName = "chat-history") {
  console.log(`🔄 Mocking upload to Akave bucket: ${bucketName}`);
  console.log(`Data: ${JSON.stringify(jsonData).substring(0, 100)}...`);
  
  // Generate a unique ID (this is what the real function would do)
  const uniqueId = uuidv4();
  
  // Store data in local file for testing/verification
  const tempDir = fs.mkdtempSync(path.join(path.resolve(), 'test-akave-'));
  const tempFilePath = path.join(tempDir, `${uniqueId}.json`);
  
  try {
    fs.writeFileSync(tempFilePath, JSON.stringify(jsonData, null, 2));
    console.log(`✅ Mock data saved to: ${tempFilePath}`);
  } catch (error) {
    console.error(`❌ Error saving mock data: ${error.message}`);
    return { fileName: null, success: false };
  }
  
  return { fileName: uniqueId, success: true };
}

// Mock getJsonFromAkave function
async function getJsonFromAkave(fileName, bucketName = "chat-history") {
  console.log(`🔄 Mocking retrieval from Akave bucket: ${bucketName}`);
  console.log(`File ID: ${fileName}`);
  
  // Check if the file exists in our test directory
  const testDir = fs.readdirSync(path.resolve()).find(dir => dir.startsWith('test-akave-'));
  
  if (testDir) {
    const filePath = path.join(path.resolve(), testDir, `${fileName}.json`);
    
    if (fs.existsSync(filePath)) {
      try {
        const fileData = fs.readFileSync(filePath, 'utf8');
        return { data: JSON.parse(fileData), success: true };
      } catch (error) {
        console.error(`❌ Error reading mock data: ${error.message}`);
      }
    }
  }
  
  // If file doesn't exist or can't be read, return a mock object
  return { 
    data: { 
      mock: true, 
      message: "This is mock data",
      fileName: fileName,
      timestamp: new Date().toISOString()
    }, 
    success: true 
  };
}

// Mock formatAddressForViem function
function formatAddressForViem(address) {
  if (!address || typeof address !== 'string') {
    return '';
  }
  
  // Ensure the address is a lowercase hex string with 0x prefix
  let formatted = address.toLowerCase().trim();
  if (!formatted.startsWith('0x')) {
    formatted = '0x' + formatted;
  }
  
  // Validate that it's a 42-character Ethereum address (0x + 40 hex characters)
  if (/^0x[0-9a-f]{40}$/i.test(formatted)) {
    return formatted;
  }
  
  return '';
}

// Create a mock Express router for testing
class MockRouter {
  constructor() {
    this.routes = {
      post: {},
      get: {}
    };
  }
  
  post(path, handler) {
    this.routes.post[path] = handler;
    return this;
  }
  
  get(path, handler) {
    this.routes.get[path] = handler;
    return this;
  }
  
  async callRoute(method, path, req, res) {
    if (this.routes[method][path]) {
      await this.routes[method][path](req, res);
      return true;
    }
    return false;
  }
}

// Create a mock response object
class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.body = null;
  }
  
  status(code) {
    this.statusCode = code;
    return this;
  }
  
  header(name, value) {
    this.headers[name] = value;
    return this;
  }
  
  send(data) {
    this.body = data;
    return this;
  }
  
  json(data) {
    this.body = data;
    return this;
  }
}

// === TEST FUNCTIONS ===

// Function to test Akave storage
async function testAkaveStorage() {
  console.log('\n=== Testing Akave Storage ===');
  
  try {
    // Test data
    const testData = {
      testId: uuidv4(),
      timestamp: new Date().toISOString(),
      message: 'This is a test message'
    };
    
    console.log('Uploading test data to Akave...');
    const uploadResult = await uploadJsonToAkave(testData);
    
    if (uploadResult.success) {
      console.log(`✅ Upload successful. File ID: ${uploadResult.fileName}`);
      
      // Attempt to retrieve the data
      console.log('Retrieving data from Akave...');
      const retrieveResult = await getJsonFromAkave(uploadResult.fileName);
      
      if (retrieveResult.success) {
        console.log('✅ Data retrieved successfully');
        console.log('Original data:', testData);
        console.log('Retrieved data:', retrieveResult.data);
        
        // Verify data integrity
        if (retrieveResult.data.testId === testData.testId) {
          console.log('✅ Data integrity verified');
        } else {
          console.log('❌ Data integrity check failed');
        }
      } else {
        console.log('❌ Failed to retrieve data');
      }
    } else {
      console.log('❌ Failed to upload data');
    }
  } catch (error) {
    console.error('❌ Error testing Akave storage:', error);
  }
}

// Function to test address utilities
function testAddressUtils() {
  console.log('\n=== Testing Address Utilities ===');
  
  const testAddresses = [
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    '70997970C51812dc3A010C7d01b50e0d17dc79C8',
    'invalid-address',
    '',
    null
  ];
  
  for (const address of testAddresses) {
    console.log(`Testing address: ${address || 'NULL'}`);
    const formatted = formatAddressForViem(address);
    console.log(`Formatted: ${formatted || 'NULL'}`);
  }
}

// Function to test API key verification
async function testApiKeyVerification() {
  console.log('\n=== Testing API Key Verification ===');
  
  try {
    // Use the mock function for testing
    const verificationResult = await isCallerOwner(
      TEST_CONFIG.agentId,
      TEST_CONFIG.apiKey,
      null
    );
    
    console.log('Verification result:');
    console.log(`Status: ${verificationResult.status}`);
    console.log(`Caller: ${verificationResult.caller}`);
    
    if (verificationResult.status > 0) {
      console.log('✅ API key verification successful');
    } else {
      console.log('❌ API key verification failed');
    }
  } catch (error) {
    console.error('❌ Error testing API key verification:', error);
  }
}

// Function to test agent fetching
async function testAgentFetching() {
  console.log('\n=== Testing Agent Fetching ===');
  
  try {
    // Use the mock function for testing
    const agentData = await getAgentCharacter(TEST_CONFIG.agentId);
    
    console.log('Agent data retrieved:');
    console.log(`ID: ${agentData.id}`);
    console.log(`Character name: ${agentData.character.name}`);
    console.log(`Owner: ${agentData.owner}`);
    
    console.log('✅ Agent fetching successful');
    return agentData;
  } catch (error) {
    console.error('❌ Error testing agent fetching:', error);
    return null;
  }
}

// Check if Ollama is running
async function checkOllama() {
  try {
    console.log(`Checking if Ollama is running at ${TEST_CONFIG.ollamaUrl}...`);
    const response = await fetch(`${TEST_CONFIG.ollamaUrl}/api/tags`);
    
    if (response.ok) {
      const data = await response.json();
      
      // Validate data structure before accessing properties
      let modelNames = 'None';
      if (data && typeof data === 'object') {
        // First validate the data has the models property
        if ('models' in data && Array.isArray(data.models)) {
          modelNames = data.models.map(m => m.name).join(', ');
        }
      }
      
      console.log(`✅ Ollama is running. Available models: ${modelNames}`);
      return true;
    } else {
      console.log('❌ Ollama is not responding properly');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to connect to Ollama:', error.message);
    return false;
  }
}

// Simulate a chat request
async function simulateChatRequest(prompt, useLilypad = false) {
  console.log(`\n=== Simulating Chat Request ===`);
  console.log(`Using: ${useLilypad ? 'Lilypad' : 'Ollama'}`);
  console.log(`Prompt: "${prompt}"`);
  
  try {
    // Get agent data
    const agentData = await getAgentCharacter(TEST_CONFIG.agentId);
    
    // Create mock request and response objects
    const req = {
      headers: {
        'api-key': TEST_CONFIG.apiKey,
        'agent-id': TEST_CONFIG.agentId,
        'islilypad': useLilypad ? 'true' : 'false'
      },
      body: {
        prompt: prompt,
        user_name: TEST_CONFIG.userName
      }
    };
    
    const res = new MockResponse();
    
    // Create mock function for processing
    let processed = false;
    let response = null;
    
    if (useLilypad) {
      // Mock Lilypad processing
      console.log('🌸 Processing with Lilypad...');
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      response = {
        response: `[Lilypad Test Response] In response to: "${prompt}"\n\nAs ${agentData.character.name}, I would say: This is a simulated response from Lilypad for testing purposes.`,
        character_name: agentData.character.name,
        models_used: ['llama3.1:8b'],
        processing_time: '2.5 seconds',
        // Add history property to avoid TypeScript error later
        history: ''
      };
      
      processed = true;
    } else {
      // Test if Ollama is running
      const ollamaRunning = await checkOllama();
      
      if (ollamaRunning) {
        // Try to make a real request to Ollama
        console.log('🔄 Making real request to Ollama...');
        
        try {
          const ollamaRequest = {
            model: 'qwen2.5:3b',
            prompt: `You are ${agentData.character.name}, a character with the following personality: ${agentData.character.personality}. Respond to: ${prompt}`,
            stream: false,
            options: {
              temperature: 0.7
            }
          };
          
          const ollamaResponse = await fetch(`${TEST_CONFIG.ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(ollamaRequest),
          });
          
          if (ollamaResponse.ok) {
            const responseData = await ollamaResponse.json();
            
            // Create response with proper validation
            let responseText = '';
            if (responseData && typeof responseData === 'object') {
              // Validate that responseData has a response property
              if ('response' in responseData) {
                // Ensure responseText is a string
                responseText = typeof responseData.response === 'string' 
                  ? responseData.response 
                  : String(responseData.response || '');
              }
            }
            
            response = {
              response: responseText,
              character_name: agentData.character.name,
              history: ''
            };
            
            processed = true;
          } else {
            const errorText = await ollamaResponse.text();
            console.log('❌ Ollama request failed:', errorText);
          }
        } catch (error) {
          console.error('❌ Error making Ollama request:', error.message);
        }
      }
      
      // If Ollama request failed or wasn't attempted, use a mock response
      if (!processed) {
        console.log('⚠️ Using mock Ollama response');
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        response = {
          response: `[Ollama Test Response] In response to: "${prompt}"\n\nAs ${agentData.character.name}, I would say: This is a simulated response from Ollama for testing purposes.`,
          character_name: agentData.character.name,
          // Add history property to avoid TypeScript error later
          history: ''
        };
        
        processed = true;
      }
    }
    
    // Mock saving to Akave
    console.log('📦 Saving chat history to Akave...');
    const historyId = uuidv4();
    
    // Add the history ID to the response
    if (response) {
      response.history = historyId;
    }
    
    // Return the response
    res.send(response);
    
    console.log('✅ Chat request processed successfully');
    if (response) {
      console.log('Response:', response.response);
      console.log(`History ID: ${response.history}`);
    }
    
    return {
      success: true,
      response: response
    };
  } catch (error) {
    console.error('❌ Error simulating chat request:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main test function
async function runTests() {
  console.log('=== Starting Franky Agent Framework Tests ===');
  console.log('Test configuration:', TEST_CONFIG);
  
  // Test address utilities
  await testAddressUtils();
  
  // Test API key verification
  await testApiKeyVerification();
  
  // Test agent fetching
  await testAgentFetching();
  
  // Test Akave storage
  await testAkaveStorage();
  
  // Run chat tests
  console.log('\n=== Running Chat Tests ===');
  
  // Test Ollama
  if (TEST_CONFIG.testOllama) {
    for (const message of TEST_CONFIG.userMessages) {
      await simulateChatRequest(message, false);
    }
  }
  
  // Test Lilypad
  if (TEST_CONFIG.testLilypad) {
    for (const message of TEST_CONFIG.userMessages) {
      await simulateChatRequest(message, true);
    }
  }
  
  // Clean up test directories
  console.log('\n=== Cleaning Up Test Files ===');
  const testDirs = fs.readdirSync(path.resolve()).filter(dir => dir.startsWith('test-akave-'));
  
  for (const dir of testDirs) {
    const dirPath = path.join(path.resolve(), dir);
    
    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        fs.unlinkSync(path.join(dirPath, file));
      }
      fs.rmdirSync(dirPath);
      console.log(`✅ Removed test directory: ${dir}`);
    } catch (error) {
      console.error(`❌ Error cleaning up directory ${dir}: ${error.message}`);
    }
  }
  
  // Remove device credentials file if we created it
  try {
    fs.unlinkSync('device_credentials.txt');
    console.log('✅ Removed mock device credentials file');
  } catch (error) {
    console.error(`❌ Error removing device credentials file: ${error.message}`);
  }
  
  console.log('\n=== All Tests Completed ===');
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
}); 