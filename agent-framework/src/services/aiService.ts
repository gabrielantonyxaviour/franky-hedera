import { Logger, logger } from '../utils/logger';
import { Character } from '../types';
import { 
  generateResponse as responseGeneratorFunction,
  enhancedToolDetection,
  queryOllamaWithFallback,
  createCharacterPrompt
} from '../utils/response-generator';

const CONTEXT_AI = 'AI';

/**
 * Generate a response from a character based on its traits and personality
 * This is a wrapper around the more comprehensive response-generator functionality
 */
export const generateCharacterResponse = async (
  prompt: string,
  characterData: any
): Promise<string> => {
  try {
    logger.info(CONTEXT_AI, 'Generating character response', { promptLength: prompt.length });
    
    // Convert character data to the expected Character format if needed
    const character: Character = {
      name: characterData.name || 'Assistant',
      description: characterData.description || 'A helpful AI assistant',
      personality: characterData.personality || '',
      scenario: characterData.scenario || '',
      first_mes: characterData.first_mes || '',
      mes_example: characterData.mes_example || '',
      ...characterData
    };
    
    // Try to use the comprehensive response generator
    try {
      // This uses the advanced response generator with proper routing between Ollama and OpenAI
      const response = await responseGeneratorFunction(prompt, character);
      
      // Extract just the response part if it has a prefix like "Character: "
      if (response.includes(':')) {
        const parts = response.split(':', 2);
        if (parts.length === 2) {
          return parts[1].trim();
        }
      }
      
      // If Blockchain result prefix, keep that
      if (response.startsWith('Blockchain Result:')) {
        return response;
      }
      
      return response;
    } catch (genError) {
      logger.error(CONTEXT_AI, 'Error using comprehensive response generator, falling back', genError);
      
      // Fall back to simplified method if the comprehensive one fails
      // Determine if we should use Ollama or OpenAI based on complexity
      const requiresTools = enhancedToolDetection(prompt);
      
      if (requiresTools && process.env.OPENAI_API_KEY) {
        // Use OpenAI for complex queries
        logger.info(CONTEXT_AI, 'Using OpenAI for complex query');
        return await callOpenAI(createSystemPrompt(character), prompt);
      } else if (process.env.OLLAMA_BASE_URL) {
        // Use Ollama for simple queries
        logger.info(CONTEXT_AI, 'Using Ollama for simple query');
        try {
          return await queryOllamaWithFallback(prompt, character);
        } catch (ollamaError) {
          // Fall back to OpenAI if Ollama fails and OpenAI is available
          if (process.env.OPENAI_API_KEY) {
            logger.info(CONTEXT_AI, 'Ollama failed, falling back to OpenAI');
            return await callOpenAI(createSystemPrompt(character), prompt);
          }
          throw ollamaError;
        }
      } else if (process.env.OPENAI_API_KEY) {
        // Use OpenAI if Ollama is not available
        logger.info(CONTEXT_AI, 'Ollama not available, using OpenAI');
        return await callOpenAI(createSystemPrompt(character), prompt);
      } else {
        // No API available, use mock response
        logger.warn(CONTEXT_AI, 'No API key configured. Using mock response generator.');
        return mockResponseGenerator(prompt, character);
      }
    }
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