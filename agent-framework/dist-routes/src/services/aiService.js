"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCharacterResponse = void 0;
const logger_1 = require("../utils/logger");
// Initialize logger
const logger = logger_1.Logger.getInstance({
    level: process.env.LOG_LEVEL || 'info',
    module: 'ai',
});
/**
 * Generate a response from a character based on its traits
 */
const generateCharacterResponse = async (prompt, characterData) => {
    try {
        // Extract character information
        const { name, description, traits } = characterData;
        // Build system prompt based on character data
        const systemPrompt = `You are ${name}, ${description}. ` +
            `Your personality traits include: ${JSON.stringify(traits || {})}. ` +
            `Respond in character to the user's message.`;
        // If OpenAI API key is configured, use it
        if (process.env.OPENAI_API_KEY) {
            return await callOpenAI(systemPrompt, prompt);
        }
        // Otherwise, use a fallback mock response
        logger.warn('No OpenAI API key configured. Using mock response generator.');
        return mockResponseGenerator(prompt, characterData);
    }
    catch (error) {
        logger.error(`Error generating character response: ${error}`);
        return "I'm sorry, I couldn't process your message right now.";
    }
};
exports.generateCharacterResponse = generateCharacterResponse;
/**
 * Call OpenAI API to generate a response
 */
async function callOpenAI(systemPrompt, userPrompt) {
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
        return data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    }
    catch (error) {
        logger.error(`Error calling OpenAI API: ${error}`);
        throw error;
    }
}
/**
 * Generate a mock response for testing without API
 */
function mockResponseGenerator(prompt, characterData) {
    const { name } = characterData;
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
