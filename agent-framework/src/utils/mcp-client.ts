import fetch from 'node-fetch';
import { logger } from './logger';
import { Character } from '../types';
import { createCharacterPrompt } from '../characters';
import * as dotenv from 'dotenv';

dotenv.config();

// MCP configuration
const MCP_API_URL = process.env.MCP_API_URL || 'http://localhost:8000/api/chat';
const MCP_DEFAULT_MODEL = process.env.MCP_DEFAULT_MODEL || 'gpt-4.1';
const MCP_API_KEY = process.env.MCP_API_KEY;

/**
 * Interface for MCP request message
 */
interface MCPMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Interface for MCP chat completion request
 */
interface MCPRequest {
  messages: MCPMessage[];
  model: string;
  stream?: boolean;
  context?: Record<string, any>;
}

/**
 * Interface for MCP chat completion response
 */
interface MCPResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Queries the MCP API with the given messages
 * @param userInput The user input
 * @param systemPrompt Optional system prompt
 * @param character Optional character for roleplay mode
 * @param modelName Optional model name to use
 * @param context Optional context to pass to the MCP API
 * @returns The response from the MCP API
 */
export async function queryMCP(
  userInput: string,
  systemPrompt?: string,
  character?: Character,
  modelName: string = MCP_DEFAULT_MODEL,
  context?: Record<string, any>
): Promise<string> {
  const startTime = Date.now();
  
  // Build messages array
  const messages: MCPMessage[] = [];
  
  // Add system prompt if provided or use character prompt
  if (character) {
    // Format character prompt
    const characterSystem = `${character.system_prompt}

You are role-playing as ${character.name}.
${character.description}
${character.personality}

Background: ${character.scenario}

Here's how you typically respond: 
${character.mes_example}`;
    
    messages.push({ role: 'system', content: characterSystem });
  } else if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  // Add user message
  messages.push({ role: 'user', content: userInput });
  
  logger.info('MCPClient', 'Querying MCP API', {
    apiUrl: MCP_API_URL,
    model: modelName,
    promptLength: userInput.length,
    characterMode: !!character,
    characterName: character?.name,
    hasSystemPrompt: !!systemPrompt
  });
  
  // Log model usage
  logger.modelUsage(modelName, 'Query started', {
    promptLength: userInput.length,
    characterMode: !!character
  });

  try {
    // Build request
    const mcpRequest: MCPRequest = {
      messages,
      model: modelName,
      stream: false,
      context
    };
    
    // Make request
    const response = await fetch(MCP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(MCP_API_KEY ? { 'Authorization': `Bearer ${MCP_API_KEY}` } : {})
      },
      body: JSON.stringify(mcpRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('MCPClient', `HTTP error ${response.status}`, {
        errorText,
        status: response.status
      });
      throw new Error(`MCP API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as MCPResponse;
    const elapsedTime = Date.now() - startTime;
    
    const responseContent = data.choices[0]?.message?.content || '';
    
    logger.info('MCPClient', 'MCP response received', {
      executionTimeMs: elapsedTime,
      responseLength: responseContent.length,
      characterMode: !!character,
      tokenUsage: data.usage
    });
    
    // Log model usage completion
    logger.modelUsage(modelName, 'Query completed', {
      executionTimeMs: elapsedTime,
      responseLength: responseContent.length,
      characterMode: !!character,
      tokenUsage: data.usage
    });
    
    return responseContent;
  } catch (error) {
    logger.error('MCPClient', 'Error querying MCP API', error);
    throw error;
  }
}

/**
 * Checks if the MCP API is available
 * @returns True if the MCP API is available, false otherwise
 */
export async function isMCPAvailable(): Promise<boolean> {
  try {
    logger.debug('MCPClient', 'Checking MCP API availability');
    const response = await fetch(`${MCP_API_URL}/status`, {
      method: 'GET',
      headers: MCP_API_KEY ? { 'Authorization': `Bearer ${MCP_API_KEY}` } : {}
    });
    
    if (response.ok) {
      logger.info('MCPClient', 'MCP API is available');
      return true;
    }
    
    logger.warn('MCPClient', 'MCP API is not available', {
      status: response.status
    });
    return false;
  } catch (error: any) {
    logger.warn('MCPClient', 'Error checking MCP API availability', {
      error: error.message || String(error)
    });
    return false;
  }
} 