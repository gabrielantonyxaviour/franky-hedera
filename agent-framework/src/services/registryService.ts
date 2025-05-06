import { Logger, logger } from '../utils/logger';
import { getHederaClient } from './hederaService';

let registryTopicId: string | null = null;

/**
 * Initialize or get the agent registry topic
 */
export const setupCharacterRegistry = async (): Promise<string> => {
  try {
    // Check if we have an existing registry topic ID in environment variables
    if (process.env.CHARACTER_REGISTRY_TOPIC_ID) {
      registryTopicId = process.env.CHARACTER_REGISTRY_TOPIC_ID;
      logger.info('REGISTRY', `Using existing agent registry topic from env: ${registryTopicId}`);
      return registryTopicId;
    }

    // If no environment variable is set, use the constant value
    registryTopicId = '0.0.5949688';
    logger.info('REGISTRY', `Using default agent registry topic: ${registryTopicId}`);
    
    // There's no need to create a new topic, but you may want to validate that this topic exists
    // This validation is optional, and you can remove it if you don't want to check topic existence
    try {
      const client = await getHederaClient();
      // We could add a validation check here if needed
      logger.info('REGISTRY', `Agent registry topic set to ${registryTopicId}`);
    } catch (validationError) {
      logger.warn('REGISTRY', `Could not validate registry topic. Will use it anyway.`, validationError);
    }
    
    return registryTopicId;
  } catch (error) {
    logger.error('REGISTRY', `Failed to setup agent registry: ${error}`, error);
    throw error;
  }
};

/**
 * Get the agent registry topic ID
 */
export const getCharacterRegistryTopicId = async (): Promise<string> => {
  if (!registryTopicId) {
    return await setupCharacterRegistry();
  }
  return registryTopicId;
};

/**
 * Register a character agent in the registry with full character details
 */
export const registerCharacterInRegistry = async (
  characterId: string,
  characterData: {
    name: string;
    description?: string;
    accountId: string;
    inboundTopicId: string;
    outboundTopicId: string;
    imageUrl?: string;
    traits?: Record<string, any>;
    personality?: string;
    scenario?: string;
    first_mes?: string;
    mes_example?: string;
    creatorcomment?: string;
    tags?: string[];
    talkativeness?: number;
    [key: string]: any; // Allow any other character properties
  }
): Promise<void> => {
  try {
    const client = await getHederaClient();
    const topicId = await getCharacterRegistryTopicId();
    
    // Prepare registration data with full character details
    const registrationData = {
      type: 'agent_registration',
      characterId,
      name: characterData.name,
      description: characterData.description || `Character agent for ${characterData.name}`,
      agentAccountId: characterData.accountId,
      inboundTopicId: characterData.inboundTopicId,
      outboundTopicId: characterData.outboundTopicId,
      imageUrl: characterData.imageUrl,
      // Include all character details
      personality: characterData.personality,
      scenario: characterData.scenario,
      first_mes: characterData.first_mes,
      mes_example: characterData.mes_example,
      creatorcomment: characterData.creatorcomment,
      tags: characterData.tags || [],
      talkativeness: characterData.talkativeness,
      traits: characterData.traits || {},
      // Include any other custom fields from characterData
      ...Object.entries(characterData)
        .filter(([key]) => !['name', 'description', 'accountId', 'inboundTopicId', 'outboundTopicId', 'imageUrl', 'traits', 'personality', 'scenario', 'first_mes', 'mes_example', 'creatorcomment', 'tags', 'talkativeness'].includes(key))
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}),
      registrationTimestamp: Date.now()
    };
    
    // Send registration data to registry topic
    await client.sendMessage(
      topicId,
      JSON.stringify(registrationData),
      `Agent Registration: ${characterId}`
    );
    
    logger.info('REGISTRY', `Registered character agent ${characterId} in registry, mapped to agent ${characterData.accountId}`);
  } catch (error) {
    logger.error('REGISTRY', `Failed to register character agent in registry: ${error}`, error);
    throw error;
  }
};

/**
 * Get a character from the agent registry by ID
 */
export const getCharacterFromRegistry = async (characterId: string): Promise<any | null> => {
  try {
    const client = await getHederaClient();
    const topicId = await getCharacterRegistryTopicId();
    
    // Get all messages from the registry topic
    const { messages } = await client.getMessages(topicId);
    
    // Find the most recent registration for this character ID
    let characterData = null;
    let latestTimestamp = 0;
    
    for (const message of messages) {
      try {
        const data = JSON.parse(message.data as string);
        
        // Check if this is an agent registration message for our target character
        if ((data.type === 'agent_registration' || data.type === 'character_registration') && data.characterId === characterId) {
          // If this is more recent than our current data, update it
          if (data.registrationTimestamp > latestTimestamp) {
            characterData = data;
            latestTimestamp = data.registrationTimestamp;
          }
        }
      } catch (e) {
        // Skip messages that can't be parsed
        logger.error('REGISTRY', `Error parsing registry message: ${e}`, e);
      }
    }
    
    return characterData;
  } catch (error) {
    logger.error('REGISTRY', `Failed to get character from registry: ${error}`, error);
    throw error;
  }
};

/**
 * Get all characters from the agent registry
 */
export const getAllCharactersFromRegistry = async (): Promise<any[]> => {
  try {
    const client = await getHederaClient();
    const topicId = await getCharacterRegistryTopicId();
    
    // Get all messages from the registry topic
    const { messages } = await client.getMessages(topicId);
    
    // Map to track the most recent data for each character
    const characterMap = new Map<string, any>();
    
    // Process all messages
    for (const message of messages) {
      try {
        const data = JSON.parse(message.data as string);
        
        // Check if this is an agent registration message
        if ((data.type === 'agent_registration' || data.type === 'character_registration') && data.characterId) {
          const characterId = data.characterId;
          
          // If we don't have this character yet, or this is more recent
          if (!characterMap.has(characterId) || 
              characterMap.get(characterId).registrationTimestamp < data.registrationTimestamp) {
            characterMap.set(characterId, data);
          }
        }
      } catch (e) {
        // Skip messages that can't be parsed
        logger.error('REGISTRY', `Error parsing registry message: ${e}`, e);
      }
    }
    
    // Convert the map to an array of character data
    return Array.from(characterMap.values());
  } catch (error) {
    logger.error('REGISTRY', `Failed to get characters from registry: ${error}`, error);
    return [];
  }
}; 