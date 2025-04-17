import express from 'express';
import { trimV1 } from '../util.js';
import axios from 'axios';

// Import the gas price tool functions
import { 
  getGasPrice, 
  formatGasPriceResponse, 
  prepareGasPriceData, 
  gasPriceTool, 
  gasQueryPatterns 
} from '../tools/gas-price-tool.js';

// Import prompt building functions
import { 
  buildRoleplayPrompt, 
  buildRoleplayPromptWithData, 
  buildSystemPrompt, 
  buildFullPrompt 
} from '../utils/prompt-builder.js';

// Import response cleaning function
import { cleanRoleplayResponse } from '../utils/response-cleaner.js';

export const router = express.Router();

// This endpoint allows external access to Ollama through SillyTavern
router.post('/generate', async (request, response) => {
  try {
    console.log('⚡ Received generate request:', request.body);
    const ollamaUrl = 'http://127.0.0.1:11434';
    
    // Check if function calling is enabled in options
    if (request.body.options && request.body.options.function_calling) {
      console.log('🔧 Function calling is ENABLED in /generate endpoint');
      
      // If there are tool definitions available, log them
      if (request.body.options.tools && request.body.options.tools.length > 0) {
        console.log(`🧰 Found ${request.body.options.tools.length} tool definitions: ${request.body.options.tools.map(t => t.function?.name || 'unnamed').join(', ')}`);
      } else {
        console.log('🧰 No tool definitions found in the request');
      }
    } else {
      console.log('🔧 Function calling is DISABLED in /generate endpoint');
    }
    
    // Forward the request to Ollama
    const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('❌ Ollama proxy error:', ollamaResponse.status, errorText);
      return response.status(ollamaResponse.status).send(errorText);
    }
    
    // Return the Ollama response
    const data = await ollamaResponse.json();
    console.log('✅ Ollama generate response received');
    
    // Check if the response contains tool calls
    if (data.tool_calls && data.tool_calls.length > 0) {
      console.log(`🔧 Response contains ${data.tool_calls.length} tool calls:`);
      for (const toolCall of data.tool_calls) {
        console.log(`  - Tool name: ${toolCall.name || 'unnamed'}`);
        console.log(`  - Arguments: ${JSON.stringify(toolCall.arguments || {})}`);
      }
    } else {
      console.log('🔧 No tool calls found in the response');
    }
    
    return response.send(data);
  } catch (error) {
    console.error('❌ Ollama proxy error:', error);
    return response.status(500).send({ error: error.message });
  }
});

// NEW ENDPOINT: Generate text with a character card
router.post('/generate-with-character', async (request, response) => {
  try {
    console.log('⚡ Received generate-with-character request');
    const ollamaUrl = 'http://127.0.0.1:11434';
    
    // Extract the request body components
    const { model, prompt, character_data, chat_history = [] } = request.body;
    
    if (!model || !prompt || !character_data) {
      return response.status(400).send({ 
        error: 'Missing required parameters. Please provide "model", "prompt", and "character_data".'
      });
    }
    
    // Validate character data (minimal V1 structure)
    if (!character_data.name || !character_data.personality) {
      return response.status(400).send({ 
        error: 'Invalid character data. At minimum, "name" and "personality" fields are required.'
      });
    }
    
    console.log(`🎭 Processing character request for "${character_data.name}"`);
    
    // Build a proper prompt using the character data
    const userName = request.body.user_name || 'User';
    let systemPrompt = buildSystemPrompt(character_data, userName);
    let fullPrompt = buildFullPrompt(systemPrompt, character_data, userName, prompt, chat_history);
    
    console.log('📝 Built character prompt');
    
    // Log a sample of the constructed prompt for debugging purposes
    const promptPreview = fullPrompt.length > 500 
      ? fullPrompt.substring(0, 200) + '...\n[middle content omitted]...\n' + fullPrompt.substring(fullPrompt.length - 200)
      : fullPrompt;
    console.log('🔍 Prompt preview:', promptPreview);
    
    // Forward the request to Ollama with our constructed prompt
    const ollamaRequest = {
      model: model,
      prompt: fullPrompt,
      stream: request.body.stream || false,
      options: request.body.options || {}
    };
    
    // Add temperature if not provided to help with creative roleplay responses
    if (!ollamaRequest.options.temperature) {
      ollamaRequest.options.temperature = 0.7;
    }
    
    console.log('🚀 Sending request to Ollama with model:', model, 'options:', ollamaRequest.options);
    const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ollamaRequest),
    });
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('❌ Ollama character proxy error:', ollamaResponse.status, errorText);
      return response.status(ollamaResponse.status).send(errorText);
    }
    
    // Return the Ollama response
    const data = await ollamaResponse.json();
    console.log('✅ Ollama character response received');
    
    // Log a preview of the response for debugging
    const responsePreview = data.response.length > 100 
      ? data.response.substring(0, 100) + '...'
      : data.response;
    console.log('👤 Character response preview:', responsePreview);
    
    // Add character name to response
    const enhancedResponse = {
      ...data,
      character_name: character_data.name 
    };
    
    return response.send(enhancedResponse);
  } catch (error) {
    console.error('❌ Ollama character proxy error:', error);
    return response.status(500).send({ error: error.message });
  }
});

// Specialized roleplay character generation endpoint
router.post('/roleplay-character', async (request, response) => {
  try {
    console.log('⚡ Received roleplay-character request');
    const ollamaUrl = 'http://127.0.0.1:11434';
    
    // Extract the request body components
    const { model, prompt, character_data, chat_history = [] } = request.body;
    
    // Log the full request body for debugging
    console.log('📝 Full request body:', JSON.stringify(request.body, null, 2));
    
    if (!model || !prompt || !character_data) {
      return response.status(400).send({ 
        error: 'Missing required parameters. Please provide "model", "prompt", and "character_data".'
      });
    }
    
    // Validate character data (minimal V1 structure)
    if (!character_data.name || !character_data.personality) {
      return response.status(400).send({ 
        error: 'Invalid character data. At minimum, "name" and "personality" fields are required.'
      });
    }
    
    console.log(`🎭 Processing roleplay character request for "${character_data.name}"`);
    
    // Check if the prompt is asking for gas prices using regex
    const gasMatch = prompt.match(gasQueryPatterns.primary);
    
    // Alternative regex to catch more gas price queries
    const altGasMatch = !gasMatch ? prompt.match(gasQueryPatterns.alternative) : null;
    
    // If we have a gas price query, get the data but let the model generate the response
    if (gasMatch || altGasMatch) {
      const match = gasMatch || altGasMatch;
      const network = match[1].toLowerCase();
      console.log(`🔍 Detected gas price query for network: ${network}`);
      
      // Get the gas price
      const gasPriceResult = await getGasPrice(network);
      
      // Prepare the data in a clean format
      const gasPriceData = prepareGasPriceData(network, gasPriceResult);
      
      // Build a roleplay prompt that includes the gas price data
      const userName = request.body.user_name || 'User';
      
      // Create a special prompt that includes the gas price data
      let roleplayPrompt;
      
      if (gasPriceData.error) {
        roleplayPrompt = buildRoleplayPromptWithData(
          character_data, 
          userName, 
          prompt, 
          chat_history,
          `You tried to check gas prices for ${network} but encountered an error: ${gasPriceData.error}. Respond to the user's request about gas prices by explaining this issue in your character's style.`
        );
      } else {
        // Create a data description for the model
        const dataDescription = `Current gas prices for ${network.charAt(0).toUpperCase() + network.slice(1)}:\n` +
          `- Base fee: ${gasPriceData.baseFee}\n` +
          (gasPriceData.low ? `- Low priority: ${gasPriceData.low}\n` : '') +
          (gasPriceData.medium ? `- Medium priority: ${gasPriceData.medium}\n` : '') +
          (gasPriceData.high ? `- High priority: ${gasPriceData.high}\n` : '') +
          (gasPriceData.instant ? `- Instant: ${gasPriceData.instant}\n` : '') +
          `\nRespond to the user's request about gas prices by conveying this information in your character's style. Include all the price levels shown above.`;
        
        roleplayPrompt = buildRoleplayPromptWithData(
          character_data, 
          userName, 
          prompt, 
          chat_history,
          dataDescription
        );
      }
      
      console.log('📝 Built specialized roleplay prompt with gas price data');
      
      // Log the constructed prompt for debugging purposes
      const promptPreview = roleplayPrompt.length > 500 
        ? roleplayPrompt.substring(0, 200) + '...\n[middle content omitted]...\n' + roleplayPrompt.substring(roleplayPrompt.length - 200)
        : roleplayPrompt;
      console.log('🔍 Roleplay prompt with data preview:', promptPreview);
      
      // Forward the request to Ollama with our constructed prompt
      const ollamaRequest = {
        model: model,
        prompt: roleplayPrompt,
        stream: request.body.stream || false,
        options: {
          temperature: 0.8,
          top_p: 0.9,
          ...request.body.options
        }
      };
      
      console.log('🚀 Sending roleplay request with gas data to Ollama with model:', model);
      
      const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ollamaRequest),
      });
      
      if (!ollamaResponse.ok) {
        const errorText = await ollamaResponse.text();
        console.error('❌ Ollama roleplay error:', ollamaResponse.status, errorText);
        return response.status(ollamaResponse.status).send(errorText);
      }
      
      // Process the Ollama response
      const data = await ollamaResponse.json();
      console.log('✅ Ollama roleplay response with gas data received');
      
      // Clean the response
      let cleanedResponse = cleanRoleplayResponse(data.response, character_data.name);
      
      // Log a preview of the response for debugging
      const responsePreview = cleanedResponse.length > 100 
        ? cleanedResponse.substring(0, 100) + '...'
        : cleanedResponse;
      console.log('👤 Cleaned roleplay response preview:', responsePreview);
      
      // Create an enhanced response with the gas price data
      const enhancedResponse = {
        ...data,
        response: cleanedResponse,
        character_name: character_data.name,
        tool_used: "GetGasPrice",
        tool_args: { network },
        tool_response: gasPriceResult
      };
      
      return response.send(enhancedResponse);
    }
    
    // Build a roleplay prompt
    const userName = request.body.user_name || 'User';
    let roleplayPrompt = buildRoleplayPrompt(character_data, userName, prompt, chat_history);
    
    console.log('📝 Built roleplay prompt');
    
    // Log the constructed prompt for debugging purposes
    const promptPreview = roleplayPrompt.length > 500 
      ? roleplayPrompt.substring(0, 200) + '...\n[middle content omitted]...\n' + roleplayPrompt.substring(roleplayPrompt.length - 200)
      : roleplayPrompt;
    console.log('🔍 Roleplay prompt preview:', promptPreview);
    
    // Prepare options for the Ollama request
    let options = {
      temperature: 0.8,
      top_p: 0.9,
      ...request.body.options
    };
    
    // Check if function calling is enabled in options
    if (options.function_calling) {
      console.log('🔧 Function calling is ENABLED');
      
      // If there are tool definitions available, log them
      if (options.tools && options.tools.length > 0) {
        console.log(`🧰 Found ${options.tools.length} tool definitions: ${options.tools.map(t => t.function?.name || 'unnamed').join(', ')}`);
      } else {
        console.log('🧰 No tool definitions found in the request');
        
        // Add the gas price tool if not already present
        options.tools = options.tools || [];
        if (!options.tools.some(t => t.function?.name === 'GetGasPrice')) {
          console.log('🧰 Adding GetGasPrice tool to the request');
          options.tools.push(gasPriceTool);
        }
      }
    } else {
      console.log('🔧 Function calling is DISABLED');
    }
    
    // Forward the request to Ollama
    const ollamaRequest = {
      model: model,
      prompt: roleplayPrompt,
      stream: request.body.stream || false,
      options: options
    };
    
    console.log('🚀 Sending roleplay request to Ollama with model:', model);
    console.log('⚙️ Options:', JSON.stringify(ollamaRequest.options, null, 2));
    
    const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ollamaRequest),
    });
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('❌ Ollama roleplay error:', ollamaResponse.status, errorText);
      return response.status(ollamaResponse.status).send(errorText);
    }
    
    // Process the Ollama response
    const data = await ollamaResponse.json();
    console.log('✅ Ollama roleplay response received');
    
    // Create an enhanced response object
    const enhancedResponse = {
      ...data,
      character_name: character_data.name
    };
    
    // Check if the response contains tool calls
    let toolCallsFound = false;
    
    if (data.tool_calls && data.tool_calls.length > 0) {
      console.log(`🔧 Response contains ${data.tool_calls.length} tool calls:`);
      for (const toolCall of data.tool_calls) {
        console.log(`  - Tool name: ${toolCall.name || 'unnamed'}`);
        console.log(`  - Arguments: ${JSON.stringify(toolCall.arguments || {})}`);
        
        // Handle GetGasPrice tool call
        if (toolCall.name === 'GetGasPrice' && toolCall.arguments) {
          toolCallsFound = true;
          
          // Parse arguments
          let args;
          try {
            args = typeof toolCall.arguments === 'string' ? 
              JSON.parse(toolCall.arguments) : toolCall.arguments;
          } catch (e) {
            console.error('Error parsing tool arguments:', e);
            args = { network: 'ethereum' }; // Default to ethereum
          }
          
          const network = args.network || 'ethereum';
          
          // Execute the tool
          console.log(`🔧 Executing GetGasPrice tool for network: ${network}`);
          const gasPriceResult = await getGasPrice(network);
          
          // Prepare the data in a clean format
          const gasPriceData = prepareGasPriceData(network, gasPriceResult);
          
          // Build a new prompt with the gas price data
          let dataPrompt;
          
          if (gasPriceData.error) {
            dataPrompt = `You tried to check gas prices for ${network} but encountered an error: ${gasPriceData.error}. Respond to the user's request about gas prices by explaining this issue in your character's style.`;
          } else {
            // Create a data description for the model
            dataPrompt = `Current gas prices for ${network.charAt(0).toUpperCase() + network.slice(1)}:\n` +
              `- Base fee: ${gasPriceData.baseFee}\n` +
              (gasPriceData.low ? `- Low priority: ${gasPriceData.low}\n` : '') +
              (gasPriceData.medium ? `- Medium priority: ${gasPriceData.medium}\n` : '') +
              (gasPriceData.high ? `- High priority: ${gasPriceData.high}\n` : '') +
              (gasPriceData.instant ? `- Instant: ${gasPriceData.instant}\n` : '') +
              `\nRespond to the user's request about gas prices by conveying this information in your character's style. Include all the price levels shown above.`;
          }
          
          // Create a new prompt for the model to generate a response with the data
          const dataRoleplayPrompt = buildRoleplayPromptWithData(
            character_data, 
            userName, 
            prompt, 
            chat_history,
            dataPrompt
          );
          
          // Send a new request to generate a response with the data
          const dataOllamaRequest = {
            model: model,
            prompt: dataRoleplayPrompt,
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9
            }
          };
          
          console.log('🚀 Sending follow-up request with gas data to Ollama');
          
          const dataOllamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataOllamaRequest),
          });
          
          if (!dataOllamaResponse.ok) {
            console.error('❌ Failed to generate response with gas data');
            // Continue with the original response
          } else {
            // Use the new response
            const dataResponseJson = await dataOllamaResponse.json();
            const cleanedDataResponse = cleanRoleplayResponse(dataResponseJson.response, character_data.name);
            
            // Replace the model's response with the new one
            enhancedResponse.response = cleanedDataResponse;
          }
          
          // Add tool metadata
          enhancedResponse.tool_used = "GetGasPrice";
          enhancedResponse.tool_args = args;
          enhancedResponse.tool_response = gasPriceResult;
        }
      }
    } else {
      console.log('🔧 No tool calls found in the response');
      
      // Check if the response text contains a gas price query intent
      // This is a fallback for models that don't properly use function calling
      const responseText = data.response || '';
      const gasPriceMatch = responseText.match(gasQueryPatterns.intentInResponse);
      
      if (gasPriceMatch) {
        const network = gasPriceMatch[1].toLowerCase();
        console.log(`🔍 Detected gas price intent in response for network: ${network}`);
        
        // Check if the network is valid
        if (NETWORK_IDS[network]) {
          console.log(`🔧 Using regex fallback to execute GetGasPrice tool for: ${network}`);
          
          // Execute the tool
          const gasPriceResult = await getGasPrice(network);
          
          // Prepare the data in a clean format
          const gasPriceData = prepareGasPriceData(network, gasPriceResult);
          
          // Build a new prompt with the gas price data
          let dataPrompt;
          
          if (gasPriceData.error) {
            dataPrompt = `You tried to check gas prices for ${network} but encountered an error: ${gasPriceData.error}. Respond to the user's request about gas prices by explaining this issue in your character's style.`;
          } else {
            // Create a data description for the model
            dataPrompt = `Current gas prices for ${network.charAt(0).toUpperCase() + network.slice(1)}:\n` +
              `- Base fee: ${gasPriceData.baseFee}\n` +
              (gasPriceData.low ? `- Low priority: ${gasPriceData.low}\n` : '') +
              (gasPriceData.medium ? `- Medium priority: ${gasPriceData.medium}\n` : '') +
              (gasPriceData.high ? `- High priority: ${gasPriceData.high}\n` : '') +
              (gasPriceData.instant ? `- Instant: ${gasPriceData.instant}\n` : '') +
              `\nRespond to the user's request about gas prices by conveying this information in your character's style. Include all the price levels shown above.`;
          }
          
          // Create a new prompt for the model to generate a response with the data
          const dataRoleplayPrompt = buildRoleplayPromptWithData(
            character_data, 
            userName, 
            prompt, 
            chat_history,
            dataPrompt
          );
          
          // Send a new request to generate a response with the data
          const dataOllamaRequest = {
            model: model,
            prompt: dataRoleplayPrompt,
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9
            }
          };
          
          console.log('🚀 Sending follow-up request with gas data to Ollama');
          
          const dataOllamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataOllamaRequest),
          });
          
          if (!dataOllamaResponse.ok) {
            console.error('❌ Failed to generate response with gas data');
            // Continue with the original response
          } else {
            // Use the new response
            const dataResponseJson = await dataOllamaResponse.json();
            const cleanedDataResponse = cleanRoleplayResponse(dataResponseJson.response, character_data.name);
            
            // Replace the model's response with the new one
            enhancedResponse.response = cleanedDataResponse;
            enhancedResponse.tool_used = "GetGasPrice";
            enhancedResponse.tool_args = { network };
            enhancedResponse.tool_response = gasPriceResult;
            toolCallsFound = true;
          }
        }
      }
    }
    
    // Process the response to clean up any AI framing language if no tool was used
    if (!toolCallsFound) {
      let cleanedResponse = cleanRoleplayResponse(data.response, character_data.name);
      
      // Log a preview of the response for debugging
      const responsePreview = cleanedResponse.length > 100 
        ? cleanedResponse.substring(0, 100) + '...'
        : cleanedResponse;
      console.log('👤 Cleaned roleplay response preview:', responsePreview);
      
      enhancedResponse.response = cleanedResponse;
    }
    
    return response.send(enhancedResponse);
  } catch (error) {
    console.error('❌ Ollama roleplay error:', error);
    return response.status(500).send({ error: error.message });
  }
});

// Get available models
router.get('/models', async (request, response) => {
  try {
    console.log('⚡ Received models request');
    const ollamaUrl = 'http://127.0.0.1:11434';
    
    // Forward the request to Ollama
    const ollamaResponse = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('❌ Ollama models error:', ollamaResponse.status, errorText);
      return response.status(ollamaResponse.status).send(errorText);
    }
    
    // Return the Ollama response
    const data = await ollamaResponse.json();
    console.log('✅ Ollama models response received');
    
    return response.send(data);
  } catch (error) {
    console.error('❌ Ollama models error:', error);
    return response.status(500).send({ error: error.message });
  }
});

export default router;