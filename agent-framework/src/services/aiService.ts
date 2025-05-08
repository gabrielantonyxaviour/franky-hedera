import { Logger, logger } from '../utils/logger';
import { Character } from '../types';
import { 
  generateResponse as responseGeneratorFunction,
  initializeMCPState,
  checkOllamaModel,
  MCPState,
  enhancedToolDetection
} from '../utils/response-generator';
import { MCPOpenAIClient } from '../utils/mcp-openai';

const CONTEXT_AI = 'AI';

// Global state to track if the response generator is initialized
let isResponseGeneratorInitialized = false;
// Track our OpenAI client for reinitialization
let activeOpenAIClient: MCPOpenAIClient | null = null;
// Track Ollama availability
let ollamaAvailableState = false;

/**
 * Initialize the response generator service with required clients
 * This should be called before generating any responses
 */
export const initializeResponseGenerator = async (
  openAIClient: MCPOpenAIClient,
  ollamaAvailable: boolean,
  character: Character | null
): Promise<void> => {
  try {
    // Store values for later reinitialization
    activeOpenAIClient = openAIClient;
    ollamaAvailableState = ollamaAvailable;
    
    // Initialize the state for response generator
    initializeMCPState(openAIClient, ollamaAvailable, character);
    isResponseGeneratorInitialized = true;
    logger.info(CONTEXT_AI, 'Response generator initialized successfully');
  } catch (error) {
    logger.error(CONTEXT_AI, 'Failed to initialize response generator', error);
    isResponseGeneratorInitialized = false;
  }
};

/**
 * Generate a response from a character based on its traits and personality
 * This directly uses the comprehensive response-generator functionality
 */
export const generateCharacterResponse = async (
  prompt: string,
  characterData: any
): Promise<string> => {
  try {
    logger.info(CONTEXT_AI, 'Generating character response', { promptLength: prompt.length });
    
    // Check if this is a complex query or requires tools
    const requiresTools = enhancedToolDetection(prompt);
    if (requiresTools) {
      logger.info(CONTEXT_AI, 'Query detected as complex or requiring tools');
    } else {
      logger.info(CONTEXT_AI, 'Query detected as simple conversation');
    }
    
    // Convert character data to the expected Character format
    const character: Character = {
      name: characterData.name || 'Assistant',
      description: characterData.description || 'A helpful AI assistant',
      personality: characterData.personality || '',
      scenario: characterData.scenario || '',
      first_mes: characterData.first_mes || '',
      mes_example: characterData.mes_example || '',
      traits: characterData.traits || {},
      ...characterData
    };
    
    // Check if response generator is initialized
    if (!isResponseGeneratorInitialized) {
      logger.warn(CONTEXT_AI, 'Response generator not initialized, checking Ollama availability');
      
      // Check Ollama availability
      const ollamaCheckResult = await checkOllamaModel();
      const ollamaAvailable = ollamaCheckResult.available;
      ollamaAvailableState = ollamaAvailable;
      
      if (ollamaCheckResult.fallbackModel) {
        process.env.OLLAMA_FALLBACK_MODEL = ollamaCheckResult.fallbackModel;
      }

      // Try to initialize with default settings if OpenAI API key is available
      if (process.env.OPENAI_API_KEY) {
        try {
          const openAIClient = new MCPOpenAIClient(
            process.env.OPENAI_API_KEY,
            process.env.MCP_SERVER_URL || 'http://localhost:3001',
            process.env.OPENAI_MODEL || 'gpt-4.1'
          );
          
          activeOpenAIClient = openAIClient;
          await initializeResponseGenerator(openAIClient, ollamaAvailable, character);
        } catch (initError) {
          logger.error(CONTEXT_AI, 'Failed to auto-initialize response generator', initError);
        }
      }
    } else if (activeOpenAIClient) {
      // If already initialized, update the active character in the mcpState
      // This ensures the character is available throughout the response generation process
      initializeMCPState(activeOpenAIClient, ollamaAvailableState, character);
      logger.debug(CONTEXT_AI, 'Updated active character in MCP state');
    }
    
    // Set a global flag for the response generator to use
    // This is a workaround since we can't modify the function signature
    if (requiresTools) {
      process.env.FORCE_USE_TOOLS = 'true';
    } else {
      delete process.env.FORCE_USE_TOOLS;
    }
    
    // Use the comprehensive response generator to handle all logic
      const response = await responseGeneratorFunction(prompt, character);
    
    // Reset the global flag
    delete process.env.FORCE_USE_TOOLS;
      
      // Extract just the response part if it has a prefix like "Character: "
      if (response.includes(':')) {
        const parts = response.split(':', 2);
      if (parts.length === 2 && parts[0].trim() === character.name) {
          return parts[1].trim();
        }
      }
      
      // If Blockchain result prefix, keep that
      if (response.startsWith('Blockchain Result:')) {
        return response;
      }
      
      return response;
  } catch (error) {
    logger.error(CONTEXT_AI, `Error generating character response`, error);
    return "I'm sorry, I couldn't process your message right now.";
  }
};

/**
 * Create a system prompt based on character data
 */
function createSystemPrompt(character: Character): string {
  return `You are ${character.name}, ${character.description}. ` +
    (character.personality ? `Your personality: ${character.personality}. ` : '') +
    (character.scenario ? `Scenario: ${character.scenario}. ` : '') +
    `Your personality traits include: ${JSON.stringify(character.traits || {})}. ` +
    `Respond in character to the user's message.`;
}

/**
 * Call OpenAI API to generate a response
 */
async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    // Use fetch to call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    // Parse response
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }
    
    // Return the generated text
    return data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    logger.error(CONTEXT_AI, `Error calling OpenAI API: ${error}`);
    throw error;
  }
}

/**
 * Generate a mock response for testing without API
 */
function mockResponseGenerator(
  prompt: string,
  characterData: any
): string {
  const { name, first_mes } = characterData;
  
  // If the character has a first_mes, use it as basis for the first response
  if (first_mes && Math.random() > 0.8) {
    return first_mes;
  }
  
  const responses = [
    `As ${name}, I find your question about "${prompt.substring(0, 20)}..." quite interesting.`,
    `Well, let me think about that... ${prompt.substring(0, 15)}? I'd say it depends on the context.`,
    `That's an excellent point about "${prompt.substring(0, 25)}...". I would add that perspective matters.`,
    `I'm glad you asked me about ${prompt.substring(0, 30)}. It's something I've thought about before.`,
    `Hmm, "${prompt.substring(0, 20)}..." is a complex topic. Let me share my thoughts.`
  ];
  
  // Return a random response
  return responses[Math.floor(Math.random() * responses.length)];
} 