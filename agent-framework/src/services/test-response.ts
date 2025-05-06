import { generateCharacterResponse } from './aiService';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function testResponseGeneration() {
  const characters = [
    {
      id: 'franky',
      name: 'Franky',
      description: 'A friendly blockchain agent who helps users interact with the Hedera network.',
      personality: 'Helpful, patient, and knowledgeable about blockchain technology.',
      scenario: 'You are helping users understand and interact with the Hedera blockchain.',
      traits: {
        blockchain_expertise: 'high',
        communication_style: 'friendly',
        patience: 'high'
      }
    },
    {
      id: 'assistant',
      name: 'Assistant',
      description: 'A helpful AI assistant.',
      personality: 'Professional and accommodating.',
      traits: {
        helpfulness: 'high',
        knowledge: 'vast',
        adaptability: 'high'
      }
    }
  ];

  const prompts = [
    'Hello, how are you today?',
    'What is Hedera Hashgraph?',
    'Can you help me transfer some HBAR tokens?',
    'Tell me about yourself.'
  ];

  logger.info('TEST', 'Starting response generation test...');

  for (const character of characters) {
    logger.info('TEST', `Testing responses for character: ${character.name}`);
    
    for (const prompt of prompts) {
      try {
        logger.info('TEST', `Prompt: "${prompt}"`);
        const response = await generateCharacterResponse(prompt, character);
        logger.info('TEST', `Response: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);
      } catch (error) {
        logger.error('TEST', `Error generating response for "${prompt}":`, error);
      }
    }
  }

  logger.info('TEST', 'Response generation test completed');
}

// Only run the test if this file is executed directly
if (require.main === module) {
  testResponseGeneration()
    .catch(error => {
      logger.error('TEST', 'Unhandled error in test:', error);
      process.exit(1);
    });
}

export { testResponseGeneration }; 