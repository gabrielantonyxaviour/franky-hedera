import { Logger, logger } from '../utils/logger';

const CONTEXT_AI = 'AI';

/**
 * Generate a response from a character based on its traits and personality
 */
export const generateCharacterResponse = async (
  prompt: string,
  characterData: any
): Promise<string> => {
  try {
    // Extract character information from the full data structure
    const { name, description, personality, scenario, first_mes, traits } = characterData;
    
    // Build system prompt based on complete character data
    const systemPrompt = 
      `You are ${name}, ${description}. ` +
      (personality ? `Your personality: ${personality}. ` : '') +
      (scenario ? `Scenario: ${scenario}. ` : '') +
      `Your personality traits include: ${JSON.stringify(traits || {})}. ` +
      `Respond in character to the user's message.`;
    
    logger.debug(CONTEXT_AI, 'Generated system prompt for character', { name, systemPrompt });
    
    // If OpenAI API key is configured, use it
    if (process.env.OPENAI_API_KEY) {
      return await callOpenAI(systemPrompt, prompt);
    }
    
    // Otherwise, use a fallback mock response
    logger.warn(CONTEXT_AI, 'No OpenAI API key configured. Using mock response generator.');
    return mockResponseGenerator(prompt, characterData);
  } catch (error) {
    logger.error(CONTEXT_AI, `Error generating character response`, error);
    return "I'm sorry, I couldn't process your message right now.";
  }
};

/**
 * Call OpenAI API to generate a response
 */
async function callOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  try {
    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    logger.debug(CONTEXT_AI, 'Calling OpenAI API', { userPrompt });
    
    // Use fetch to call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });
    
    // Parse response
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }
    
    // Return the generated text
    const generatedResponse = data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    logger.debug(CONTEXT_AI, 'Received response from OpenAI', { responseLength: generatedResponse.length });
    return generatedResponse;
  } catch (error) {
    logger.error(CONTEXT_AI, `Error calling OpenAI API`, error);
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