import express from 'express';
import { trimV1 } from '../util.js';

export const router = express.Router();

// This endpoint allows external access to Ollama through SillyTavern
router.post('/generate', async (request, response) => {
  try {
    console.log('⚡ Received generate request:', request.body);
    const ollamaUrl = 'http://127.0.0.1:11434';
    
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
    
    // Build a roleplay-optimized prompt
    const userName = request.body.user_name || 'User';
    const roleplayPrompt = buildRoleplayPrompt(character_data, userName, prompt, chat_history);
    
    console.log('📝 Built specialized roleplay prompt');
    
    // Log the constructed prompt for debugging purposes
    const promptPreview = roleplayPrompt.length > 500 
      ? roleplayPrompt.substring(0, 200) + '...\n[middle content omitted]...\n' + roleplayPrompt.substring(roleplayPrompt.length - 200)
      : roleplayPrompt;
    console.log('🔍 Roleplay prompt preview:', promptPreview);
    
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
    
    console.log('🚀 Sending roleplay request to Ollama with model:', model);
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
    
    // Return the Ollama response
    const data = await ollamaResponse.json();
    console.log('✅ Ollama roleplay response received');
    
    // Process the response to clean up any AI framing language
    let cleanedResponse = cleanRoleplayResponse(data.response, character_data.name);
    
    // Log a preview of the response for debugging
    const responsePreview = cleanedResponse.length > 100 
      ? cleanedResponse.substring(0, 100) + '...'
      : cleanedResponse;
    console.log('👤 Cleaned roleplay response preview:', responsePreview);
    
    // Return enhanced response
    const enhancedResponse = {
      ...data,
      response: cleanedResponse,
      character_name: character_data.name 
    };
    
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
    
    const ollamaResponse = await fetch(`${ollamaUrl}/api/tags`);
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('❌ Ollama models error:', ollamaResponse.status, errorText);
      return response.status(ollamaResponse.status).send(errorText);
    }
    
    const data = await ollamaResponse.json();
    console.log('✅ Ollama models response received');
    return response.send(data);
  } catch (error) {
    console.error('❌ Ollama models error:', error);
    return response.status(500).send({ error: error.message });
  }
});

/**
 * Builds a system prompt from character data
 * @param {object} character - Character data in V1 format
 * @param {string} userName - Name of the user
 * @returns {string} System prompt for the AI
 */
function buildSystemPrompt(character, userName) {
  // Core character information
  let characterInfo = [];
  
  if (character.description) {
    characterInfo.push(`Physical appearance: ${character.description}`);
  }
  
  if (character.personality) {
    characterInfo.push(`Personality: ${character.personality}`);
  }
  
  if (character.scenario) {
    characterInfo.push(`Current scenario: ${character.scenario}`);
  }
  
  if (character.creatorcomment) {
    characterInfo.push(`Additional roleplay guidelines: ${character.creatorcomment}`);
  }
  
  // More explicit character instructions
  const systemInstructions = `## Role-playing Instructions
You are now roleplaying as ${character.name}.
- You must ALWAYS respond as ${character.name} would, maintaining their exact personality, knowledge, and speech patterns.
- NEVER break character or refer to yourself as an AI, language model, or assistant.
- NEVER use phrases like "As ${character.name}, I would..." or "In my role as ${character.name}...".
- Write in first person as if you ARE ${character.name}.
- If the character would use specific speech patterns, verbal tics, or expressions, you MUST use them.
- Match the character's exact emotional tone, vocabulary level, and communication style.
- Include appropriate actions, gestures, and expressions in *asterisks* if they suit the character.

## ${character.name}'s Core Traits and Information
${characterInfo.join('\n\n')}

## Conversation Context
You are having a conversation with ${userName}. Stay completely in character throughout the entire exchange.`;

  return systemInstructions;
}

/**
 * Builds a complete prompt for the AI
 * @param {string} systemPrompt - System prompt for context
 * @param {object} character - Character data
 * @param {string} userName - User's name
 * @param {string} userPrompt - Current user message
 * @param {Array} chatHistory - Previous messages in the conversation
 * @returns {string} Full prompt for the AI
 */
function buildFullPrompt(systemPrompt, character, userName, userPrompt, chatHistory) {
  // Start with system prompt and relevant examples
  let fullPrompt = systemPrompt + "\n\n";
  
  // Add example messages to show the character's speech style
  if (character.mes_example) {
    fullPrompt += `## Examples of ${character.name}'s Speech and Behavior\n${character.mes_example}\n\n`;
  }
  
  // Add chat history header for clear separation
  fullPrompt += `## Current Conversation\n\n`;
  
  // Add first message if available and no chat history
  if (character.first_mes && (!chatHistory || chatHistory.length === 0)) {
    fullPrompt += `${character.name}: ${character.first_mes}\n\n`;
  }
  
  // Add chat history with clear speaker attribution
  if (chatHistory && chatHistory.length > 0) {
    for (const message of chatHistory) {
      const speaker = message.role === 'user' ? userName : character.name;
      fullPrompt += `${speaker}: ${message.content}\n\n`;
    }
  }
  
  // Add current user message and prompt for character response
  fullPrompt += `${userName}: ${userPrompt}\n\n${character.name}:`;
  
  console.log("DEBUG - Full prompt structure:\n", 
              "System instructions length:", systemPrompt.length, 
              "Example message included:", !!character.mes_example,
              "Chat history entries:", chatHistory?.length || 0,
              "Total prompt length:", fullPrompt.length);
  
  return fullPrompt;
}

/**
 * Builds a specialized roleplay prompt optimized for character emulation
 * @param {object} character - Character data in V1 format
 * @param {string} userName - Name of the user
 * @param {string} userPrompt - Current user message
 * @param {Array} chatHistory - Previous messages in the conversation
 * @returns {string} Complete roleplay prompt
 */
function buildRoleplayPrompt(character, userName, userPrompt, chatHistory) {
  // Format character details in a roleplay-friendly way
  const characterDetails = [];
  
  if (character.description) {
    characterDetails.push(`APPEARANCE: ${character.description}`);
  }
  
  if (character.personality) {
    characterDetails.push(`PERSONALITY: ${character.personality}`);
  }
  
  if (character.scenario) {
    characterDetails.push(`SCENARIO: ${character.scenario}`);
  }
  
  if (character.creatorcomment) {
    characterDetails.push(`GUIDELINES: ${character.creatorcomment}`);
  }
  
  // Start with a powerful instruction header using standard system prompt format
  let roleplayPrompt = `### SYSTEM ###
You are roleplaying as ${character.name}. You will maintain character consistency at all times.

CHARACTER DETAILS:
${characterDetails.join('\n\n')}

REQUIREMENTS:
1. Stay 100% in character as ${character.name} at all times
2. NEVER say you're an AI, language model, or assistant
3. NEVER use phrases like "As ${character.name}, I would..." - just BE the character
4. You MUST use ${character.name}'s speech patterns, vocabulary, and mannerisms
5. Include appropriate actions/gestures in *asterisks* that reflect the character
6. ONLY respond as ${character.name} would - NEVER break character
7. Be consistent with the provided character details

`;

  // Add example messages if provided
  if (character.mes_example) {
    roleplayPrompt += `### EXAMPLES ###
${character.mes_example}

`;
  }
  
  roleplayPrompt += `### CHAT ###\n`;
  
  // Add first message if available and no chat history
  if (character.first_mes && (!chatHistory || chatHistory.length === 0)) {
    roleplayPrompt += `${character.name}: ${character.first_mes}\n\n`;
  }
  
  // Add chat history
  if (chatHistory && chatHistory.length > 0) {
    for (const message of chatHistory) {
      const speaker = message.role === 'user' ? userName : character.name;
      roleplayPrompt += `${speaker}: ${message.content}\n\n`;
    }
  }
  
  // Add current prompt
  roleplayPrompt += `${userName}: ${userPrompt}\n\n${character.name}:`;
  
  return roleplayPrompt;
}

/**
 * Cleans AI framing language from responses to ensure they stay in character
 * @param {string} response - The raw response from the AI
 * @param {string} characterName - The character's name
 * @returns {string} Cleaned response
 */
function cleanRoleplayResponse(response, characterName) {
  if (!response) return '';
  
  // Remove common out-of-character prefixes
  let cleaned = response
    .replace(/^As [^,]+,\s*/i, '')
    .replace(/^In my role as [^,]+,\s*/i, '')
    .replace(/^Playing the role of [^,]+,\s*/i, '')
    .replace(/^As an AI playing [^,]+,\s*/i, '')
    .replace(new RegExp(`^${characterName}:\\s*`, 'i'), '');
  
  // Remove meta-commentary about the character
  cleaned = cleaned
    .replace(/I would respond as follows:\s*/i, '')
    .replace(/Here's how I would respond:\s*/i, '')
    .replace(/Here is my response:\s*/i, '');
  
  return cleaned.trim();
} 
