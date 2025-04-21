import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Configuration for Lilypad
const LILYPAD_ENDPOINT = "https://anura-testnet.lilypad.tech/api/v1/chat/completions";
const LILYPAD_TOKEN = process.env.LILYPAD_API_TOKEN || process.env.LILYPAD_API_KEY;
const REQUEST_TIMEOUT = 60000; // 60 seconds timeout (matches Python implementation)
const MAX_RETRIES = 3; // Max retry attempts
const REQUEST_DELAY = 2000; // Delay between retries in ms

// Model configuration for Lilypad
const LILYPAD_MODELS = {
  explanation: "deepseek-r1:7b",
  critique: "phi4:14b",
  optimization: "mistral:7b",
  orchestrator: "llama3.1:8b",
  coding: "qwen2.5-coder:7b",
  math: "mistral:7b",
  creative: "openthinker:7b",
  default: "llama3.1:8b"
};

// Tools configuration for Lilypad
const LILYPAD_TOOLS = [
  {
    type: "function",
    function: {
      name: "route_to_model",
      description: "Route a subtask to the appropriate specialized model",
      parameters: {
        type: "object",
        properties: {
          task_type: {
            type: "string",
            enum: Object.keys(LILYPAD_MODELS).filter(key => key !== "orchestrator" && key !== "default"),
            description: "Type of subtask"
          },
          query: {
            type: "string",
            description: "The specific subtask query"
          }
        },
        required: ["task_type", "query"]
      }
    }
  }
];

// Session storage for streaming updates
const activeLilypadSessions = {};

/**
 * StreamLogger for tracking Lilypad processing
 */
class StreamLogger {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.buffer = [];
    
    // Initialize session if it doesn't exist
    if (!activeLilypadSessions[sessionId]) {
      activeLilypadSessions[sessionId] = {
        logs: [],
        status: "processing",
        startTime: Date.now()
      };
    }
  }
  
  /**
   * Log a message with timestamp
   * @param {string} step - The step description
   * @param {string|object} data - The data to log
   * @param {string} level - The log level (INFO, WARNING, ERROR)
   */
  log(step, data, level = "INFO") {
    const timestamp = new Date().toISOString();
    let message;
    
    if (typeof data === 'string') {
      message = `\n[${timestamp} ${level}] ${step}:\n${data}`;
    } else {
      message = `\n[${timestamp} ${level}] ${step}:\n${JSON.stringify(data, null, 2)}`;
    }
    
    this.buffer.push(message);
    
    // Update active session
    if (activeLilypadSessions[this.sessionId]) {
      activeLilypadSessions[this.sessionId].logs.push(message);
    }
    
    // Also log to console for server-side visibility
    if (level === "ERROR") {
      console.error(message);
    } else if (level === "WARNING") {
      console.warn(message);
    } else {
      console.log(message);
    }
  }
  
  /**
   * Get all logged updates as a single string
   * @returns {string} - The combined log messages
   */
  getUpdates() {
    return this.buffer.join("");
  }
}

/**
 * Call a model through the Lilypad API
 * @param {string} model - The model to use
 * @param {Array} messages - The messages to send to the model
 * @param {Array} tools - Optional tools to use
 * @param {number} temperature - The temperature for generation
 * @param {StreamLogger|null} logger - Optional logger
 * @returns {Promise<Object>} - The model response
 */
async function callLilypadModel(model, messages, tools = [], temperature = 0.2, logger = null) {
  // Validate parameters
  if (!model || !messages || !Array.isArray(messages)) {
    console.error("❌ Invalid parameters for callLilypadModel");
    return null;
  }
  
  const headers = {
    "Authorization": `Bearer ${LILYPAD_TOKEN}`,
    "Content-Type": "application/json"
  };
  
  const payload = {
    model: model,
    messages: messages,
    stream: false,
    temperature: temperature
  };
  
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  
  if (logger && typeof logger.log === 'function') {
    logger.log(`Calling ${model}`, { input: messages });
  } else {
    console.log(`🌸 Calling Lilypad model ${model}`);
  }
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY * attempt));
        if (logger) {
          logger.log(`Retry attempt ${attempt + 1}`, "", "INFO");
        }
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const response = await fetch(LILYPAD_ENDPOINT, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        
        // Add type validation to handle the 'unknown' type
        if (result && 
            typeof result === 'object' && 
            'choices' in result && 
            Array.isArray(result.choices) && 
            result.choices.length > 0 && 
            result.choices[0] && 
            typeof result.choices[0] === 'object' && 
            'message' in result.choices[0]) {
            
          if (logger) {
            logger.log(`Response from ${model}`, result);
          } else {
            console.log(`✅ Response received from Lilypad model ${model}`);
          }
          return result.choices[0].message;
        } else {
          const errorMsg = `Invalid response structure from ${model}`;
          if (logger) {
            logger.log(errorMsg, result, "ERROR");
          } else {
            console.error(`❌ ${errorMsg}`, result);
          }
          return null;
        }
      } else {
        const errorText = await response.text();
        if (logger) {
          logger.log(`API Error from ${model}`, `Status ${response.status}: ${errorText}`, "ERROR");
        } else {
          console.error(`❌ Lilypad API Error (${response.status}): ${errorText}`);
        }
      }
    } catch (error) {
      const errorMessage = error.name === 'AbortError' 
        ? `Timeout after ${REQUEST_TIMEOUT/1000} seconds` 
        : error.message;
      
      if (logger) {
        logger.log(`Error with ${model}`, errorMessage, "ERROR");
      } else {
        console.error(`❌ Lilypad request error (attempt ${attempt + 1}):`, errorMessage);
      }
    }
  }
  
  if (logger) {
    logger.log(`Failed all ${MAX_RETRIES} attempts with ${model}`, "", "ERROR");
  } else {
    console.error(`❌ Failed all ${MAX_RETRIES} attempts with Lilypad model ${model}`);
  }
  return null;
}

/**
 * Extract JSON from a response text
 * @param {string} content - The text content
 * @returns {Object|null} - The extracted JSON or null if extraction failed
 */
function extractJsonFromResponse(content) {
  if (!content) return null;
  
  try {
    return JSON.parse(content);
  } catch (error) {
    // Try to extract JSON from code blocks
    const jsonMatch = content.match(/```(?:json)?\n({.*?})\n```/s);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (error) {
        // Ignore and try next method
      }
    }
    
    // Try to find a JSON object in the text
    const objectMatch = content.match(/{(?:[^{}]|{[^{}]*})*}/s);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (error) {
        // Ignore and return null
      }
    }
  }
  
  return null;
}

/**
 * Detect the task type based on the query
 * @param {string} query - The user query
 * @returns {string} - The detected task type
 */
function detectTaskType(query) {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes("story") || queryLower.includes("narrative") || 
      queryLower.includes("poem") || queryLower.includes("creative")) {
    return "creative";
  }
  if (queryLower.includes("code") || queryLower.includes("implement")) {
    return "coding";
  }
  if (queryLower.includes("math") || queryLower.includes("equation") || 
      queryLower.includes("formula")) {
    return "math";
  }
  if (queryLower.includes("explain") || queryLower.includes("how to")) {
    return "explanation";
  }
  if (queryLower.includes("critique") || queryLower.includes("analyze") || 
      queryLower.includes("issues")) {
    return "critique";
  }
  if (queryLower.includes("optimize") || queryLower.includes("improve")) {
    return "optimization";
  }
  if (queryLower.includes("calculate") || queryLower.includes("solve")) {
    return "math";
  }
  if (queryLower.includes("wrong") || queryLower.includes("problem")) {
    return "critique";
  }
  
  return "default";
}

/**
 * Orchestrate a query using Lilypad
 * @param {string} query - The user query
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} - The orchestration result
 */
async function orchestrateQuery(query, sessionId) {
  const logger = new StreamLogger(sessionId);
  logger.log("Starting orchestration", { query });
  
  if (query.split(" ").length < 3) {
    return { direct_response: true };
  }
  
  const systemPrompt = `You are an AI task router. Analyze the user query and return JSON specifying which specialized models to use. The JSON should have this structure:
{
  "subtasks": [
    {
      "task_type": "task_category",
      "query": "specific_question",
      "recommended_model": "model_name"
    }
  ]
}

Available task categories: coding, math, explanation, critique, optimization, creative

IMPORTANT: 
1. Return ONLY valid JSON
2. Use double quotes
3. Break down complex queries into separate subtasks
4. Match each subtask to the most specialized model

MOST IMPORTANT: You need to SIMPLY grab the ENTIRE response returned from Multiple models in the end and display them while summarising the results`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: query }
  ];
  
  const response = await callLilypadModel(LILYPAD_MODELS.orchestrator, messages, [], 0.2, logger);
  
  if (!response) {
    return { error: "Orchestration failed" };
  }
  
  const jsonData = extractJsonFromResponse(response.content);
  if (jsonData) {
    logger.log("Parsed subtasks", jsonData);
    return jsonData;
  }
  
  logger.log("JSON extraction failed, using task detection", "", "WARNING");
  const detectedType = detectTaskType(query);
  
  return {
    subtasks: [{
      task_type: detectedType,
      query: query,
      recommended_model: LILYPAD_MODELS[detectedType] || LILYPAD_MODELS.default
    }]
  };
}

/**
 * Execute a model task using Lilypad
 * @param {string} taskType - The type of task
 * @param {string} query - The query to process
 * @param {string} sessionId - The session ID
 * @returns {Promise<string|null>} - The model response content
 */
async function executeModelTask(taskType, query, sessionId) {
  const logger = new StreamLogger(sessionId);
  logger.log(`Executing ${taskType.toUpperCase()} task`, { query });
  
  const model = LILYPAD_MODELS[taskType] || LILYPAD_MODELS.default;
  const messages = [{ role: "user", content: query }];
  
  const response = await callLilypadModel(model, messages, [], 0.2, logger);
  return response ? response.content : null;
}

/**
 * Clean roleplay response
 * @param {string} response - The raw response
 * @param {string} characterName - The character name for cleaning
 * @returns {string} - The cleaned response
 */
function cleanRoleplayResponse(response, characterName) {
  if (!response) return '';
  
  // Remove any prefixes that might indicate roleplay formatting
  let cleaned = response.replace(/^(\*|\(|as\s+|<|")/i, '').trim();
  
  // Remove character name prefixes
  const namePattern = new RegExp(`^(${characterName}\\s*:|${characterName}\\s*says:|as\\s+${characterName}[,:])`, 'i');
  cleaned = cleaned.replace(namePattern, '').trim();
  
  return cleaned;
}

// Add more complex test cases with a delay between each
const TEST_QUERIES = [
  "hi",
  "Explain how blockchain works in simple terms",
  "What are the major differences between proof of work and proof of stake?",
  "Implement a basic smart contract in Solidity that handles token transfers"
];

// Add a new function to handle long-running requests more efficiently
async function executeWithTimeout(fn, timeoutMs = 120000) {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs/1000} seconds`));
    }, timeoutMs);
    
    try {
      const result = await fn();
      clearTimeout(timeoutId);
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

// Update the processLilypadRequest function to use the new timeout handling for subtasks
async function processLilypadRequest(userQuery, characterData, userName) {
  const sessionId = uuidv4();
  console.log(`🌸 Processing Lilypad request: ${userQuery} (Session ID: ${sessionId})`);
  
  const logger = new StreamLogger(sessionId);
  const usedModels = new Set();
  const results = [];
  
  // Record start time separately to avoid session data issues
  const startTime = Date.now();
  
  try {
    // Initialize session data
    activeLilypadSessions[sessionId] = {
      logs: [],
      status: "processing",
      startTime: startTime
    };
    
    // Step 1: Orchestration
    logger.log("==== PROCESSING STARTED ====", `Query: ${userQuery}`);
    const orchestration = await executeWithTimeout(() => orchestrateQuery(userQuery, sessionId));
    usedModels.add(LILYPAD_MODELS.orchestrator);
    
    if ("direct_response" in orchestration) {
      // Simple queries get a direct response - no changes needed here
      logger.log("Using direct response for simple query", "");
      
      // Create a character-tailored system prompt for simple queries
      const systemPrompt = `You are ${characterData.name}, a character with the following personality: ${characterData.personality}. 
      You're in a scenario where: ${characterData.scenario || "You're having a conversation."}
      Respond to the user (${userName}) in your character's voice.`;
      
      const response = await callLilypadModel(
        LILYPAD_MODELS.default,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery }
        ],
        [],
        0.7,
        logger
      );
      
      usedModels.add(LILYPAD_MODELS.default);
      
      if (!response) {
        throw new Error("Failed to generate direct response");
      }
      
      // Clean and return the response
      const cleanedResponse = cleanRoleplayResponse(response.content, characterData.name);
      
      return {
        response: cleanedResponse,
        character_name: characterData.name,
        models_used: Array.from(usedModels),
        processing_time: `${(Date.now() - startTime) / 1000} seconds`
      };
    }
    
    if ("error" in orchestration) {
      logger.log("Orchestration error", orchestration.error, "ERROR");
      throw new Error(orchestration.error);
    }
    
    if (!orchestration.subtasks || !orchestration.subtasks.length) {
      logger.log("No subtasks generated", "", "ERROR");
      throw new Error("Failed to generate subtasks");
    }
    
    // Step 2: Execute subtasks with better timeout handling
    // Process subtasks in parallel to improve performance
    const subtaskPromises = orchestration.subtasks.map(async (subtask) => {
      const taskType = subtask.task_type || "default";
      const taskQuery = subtask.query;
      
      logger.log(`SCHEDULING ${taskType.toUpperCase()}`, { query: taskQuery });
      
      try {
        const messages = [
          { role: "system", content: `Route this ${taskType} task` },
          { role: "user", content: taskQuery }
        ];
        
        // Use a shorter timeout for routing to keep things moving
        const routingResponse = await executeWithTimeout(() => 
          callLilypadModel(
            LILYPAD_MODELS.orchestrator,
            messages,
            LILYPAD_TOOLS,
            0.2,
            logger
          ), 
          45000 // 45 seconds timeout for routing
        );
        
        usedModels.add(LILYPAD_MODELS.orchestrator);
        
        if (routingResponse && routingResponse.tool_calls) {
          for (const toolCall of routingResponse.tool_calls) {
            if (toolCall.function?.name === "route_to_model") {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                logger.log(`EXECUTING ${args.task_type.toUpperCase()}`, { query: args.query });
                
                // Execute the actual task with a model-specific timeout
                const result = await executeWithTimeout(() =>
                  executeModelTask(
                    args.task_type,
                    args.query,
                    sessionId
                  ),
                  90000 // 90 seconds timeout for model execution
                );
                
                if (result) {
                  logger.log(`COMPLETED ${args.task_type.toUpperCase()}`, { result: result.substring(0, 100) + "..." });
                  usedModels.add(LILYPAD_MODELS[args.task_type] || LILYPAD_MODELS.default);
                  return {
                    task_type: args.task_type,
                    query: args.query,
                    result: result
                  };
                }
              } catch (error) {
                logger.log(`Failed ${taskType} task`, error.message, "ERROR");
              }
            }
          }
        }
      } catch (error) {
        logger.log(`Subtask error for ${taskType}`, error.message, "ERROR");
      }
      return null;
    });
    
    // Wait for all subtasks to complete or timeout
    const subtaskResults = await Promise.allSettled(subtaskPromises);
    subtaskResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    });
    
    // Step 3: Combine results - even if only some subtasks succeeded
    if (results.length === 0) {
      logger.log("No results from subtasks", "", "ERROR");
      throw new Error("No results from subtasks");
    }
    
    // Create a character-aware combine prompt
    const combinePrompt = "Combine these results into one coherent response, in the voice of " + 
      `${characterData.name}, a character with the personality: ${characterData.personality}:\n\n` + 
      results.map(res => `### ${res.task_type}\n${res.result}`).join("\n\n");
    
    // Use a timeout for the final combination
    const finalResponse = await executeWithTimeout(() =>
      callLilypadModel(
        LILYPAD_MODELS.orchestrator,
        [
          { 
            role: "system", 
            content: `You are ${characterData.name}, a character with the following personality: ${characterData.personality}. 
            Synthesize these inputs into one polished response that sounds like you.` 
          },
          { role: "user", content: combinePrompt }
        ],
        [],
        0.7,
        logger
      ),
      90000 // 90 seconds timeout for final response
    );
    
    usedModels.add(LILYPAD_MODELS.orchestrator);
    
    if (!finalResponse || !finalResponse.content) {
      logger.log("Failed to generate final response", "", "ERROR");
      // Fallback to concatenating results
      const fallbackResponse = results.map(res => `## ${res.task_type}\n${res.result}`).join("\n\n");
      
      return {
        response: cleanRoleplayResponse(fallbackResponse, characterData.name),
        character_name: characterData.name,
        models_used: Array.from(usedModels),
        processing_time: `${(Date.now() - startTime) / 1000} seconds`,
        fallback: true
      };
    }
    
    // Clean up session data
    delete activeLilypadSessions[sessionId];
    
    // Clean and return the response
    const cleanedResponse = cleanRoleplayResponse(finalResponse.content, characterData.name);
    
    return {
      response: cleanedResponse,
      character_name: characterData.name,
      models_used: Array.from(usedModels),
      processing_time: `${(Date.now() - startTime) / 1000} seconds`
    };
    
  } catch (error) {
    console.error(`❌ Lilypad processing error: ${error.message}`);
    
    // Clean up session data (if it exists)
    if (activeLilypadSessions[sessionId]) {
      delete activeLilypadSessions[sessionId];
    }
    
    return {
      response: `I'm sorry, I encountered an error while processing your request: ${error.message}`,
      character_name: characterData.name,
      models_used: Array.from(usedModels),
      processing_time: `${(Date.now() - startTime) / 1000} seconds`,
      error: error.message
    };
  }
}

// Test character data
const TEST_CHARACTER = {
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
};

// Main test function
async function runLilypadTests() {
  console.log('=== Starting Lilypad Integration Tests ===');
  
  if (!LILYPAD_TOKEN) {
    console.error('❌ LILYPAD_API_TOKEN environment variable is not set!');
    console.error('Please add a valid Lilypad API token to your .env file');
    return;
  }
  
  console.log('Testing with character:', TEST_CHARACTER.name);
  console.log('API Token:', LILYPAD_TOKEN ? `${LILYPAD_TOKEN.substring(0, 8)}...` : 'Not set');
  console.log('Endpoint:', LILYPAD_ENDPOINT);
  console.log('Timeout:', `${REQUEST_TIMEOUT/1000} seconds`);
  
  // Run tests for each query
  for (const query of TEST_QUERIES) {
    console.log(`\n=== Testing query: "${query}" ===`);
    
    const startTime = Date.now();
    try {
      const response = await processLilypadRequest(query, TEST_CHARACTER, "TestUser");
      const duration = (Date.now() - startTime) / 1000;
      
      console.log(`\n✅ Response generated in ${duration.toFixed(2)} seconds:`);
      console.log(`Character: ${response.character_name}`);
      console.log(`Models used: ${response.models_used ? response.models_used.join(', ') : 'None'}`);
      
      // Print the full response instead of truncating it
      console.log(`Response: "${response.response}"`);
      
      if (response.fallback) {
        console.log('⚠️ Used fallback response method');
      }
      
      if (response.error) {
        console.error(`❌ Error: ${response.error}`);
      }
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      console.error(`❌ Test failed after ${duration.toFixed(2)} seconds:`, error.message);
    }
    
    // Add a delay between tests to avoid rate limiting, longer for complex queries
    if (TEST_QUERIES.indexOf(query) < TEST_QUERIES.length - 1) {
      const delaySeconds = query.length > 50 ? 10 : 5;
      console.log(`\nWaiting ${delaySeconds} seconds before next test...`);
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }
  }
  
  console.log('\n=== All Lilypad Tests Completed ===');
}

// Run the tests
runLilypadTests().catch(error => {
  console.error('❌ Test execution failed:', error);
}); 