"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCharactersFromRegistry = exports.getCharacterFromRegistry = exports.registerCharacterInRegistry = exports.getCharacterRegistryTopicId = exports.setupCharacterRegistry = void 0;
const logger_1 = require("../utils/logger");
const hederaService_1 = require("./hederaService");
// Initialize logger
const logger = logger_1.Logger.getInstance({
    level: process.env.LOG_LEVEL || 'info',
    module: 'registry',
});
let registryTopicId = null;
/**
 * Initialize or get the character registry topic
 */
const setupCharacterRegistry = async () => {
    try {
        // Check if we have an existing registry topic ID in environment variables
        if (process.env.CHARACTER_REGISTRY_TOPIC_ID) {
            registryTopicId = process.env.CHARACTER_REGISTRY_TOPIC_ID;
            logger.info(`Using existing character registry topic: ${registryTopicId}`);
            return registryTopicId;
        }
        // Get HCS10 client
        const client = await (0, hederaService_1.getHederaClient)();
        // Create a new registry topic
        logger.info('Creating new character registry topic');
        const topicId = await client.createTopic("Character Agent Registry", true, // Use operator key as admin key
        true // Use operator key as submit key
        );
        registryTopicId = topicId;
        logger.info(`Created character registry topic: ${registryTopicId}`);
        return registryTopicId;
    }
    catch (error) {
        logger.error(`Failed to setup character registry: ${error}`);
        throw error;
    }
};
exports.setupCharacterRegistry = setupCharacterRegistry;
/**
 * Get the character registry topic ID
 */
const getCharacterRegistryTopicId = async () => {
    if (!registryTopicId) {
        return await (0, exports.setupCharacterRegistry)();
    }
    return registryTopicId;
};
exports.getCharacterRegistryTopicId = getCharacterRegistryTopicId;
/**
 * Register a character in the registry
 */
const registerCharacterInRegistry = async (characterId, characterData) => {
    try {
        const client = await (0, hederaService_1.getHederaClient)();
        const topicId = await (0, exports.getCharacterRegistryTopicId)();
        // Prepare registration data
        const registrationData = {
            type: 'character_registration',
            characterId,
            name: characterData.name,
            description: characterData.description || `Character agent for ${characterData.name}`,
            agentAccountId: characterData.accountId,
            inboundTopicId: characterData.inboundTopicId,
            outboundTopicId: characterData.outboundTopicId,
            imageUrl: characterData.imageUrl,
            traits: characterData.traits || {},
            registrationTimestamp: Date.now()
        };
        // Send registration data to registry topic
        await client.sendMessage(topicId, JSON.stringify(registrationData), `Character Registration: ${characterId}`);
        logger.info(`Registered character ${characterId} in registry, mapped to agent ${characterData.accountId}`);
    }
    catch (error) {
        logger.error(`Failed to register character in registry: ${error}`);
        throw error;
    }
};
exports.registerCharacterInRegistry = registerCharacterInRegistry;
/**
 * Get a character from the registry by ID
 */
const getCharacterFromRegistry = async (characterId) => {
    try {
        const client = await (0, hederaService_1.getHederaClient)();
        const topicId = await (0, exports.getCharacterRegistryTopicId)();
        // Get all messages from the registry topic
        const { messages } = await client.getMessages(topicId);
        // Find the most recent registration for this character ID
        let characterData = null;
        let latestTimestamp = 0;
        for (const message of messages) {
            try {
                const data = JSON.parse(message.data);
                // Check if this is a character registration message for our target character
                if (data.type === 'character_registration' && data.characterId === characterId) {
                    // If this is more recent than our current data, update it
                    if (data.registrationTimestamp > latestTimestamp) {
                        characterData = data;
                        latestTimestamp = data.registrationTimestamp;
                    }
                }
            }
            catch (e) {
                // Skip messages that can't be parsed
                logger.error(`Error parsing registry message: ${e}`);
            }
        }
        return characterData;
    }
    catch (error) {
        logger.error(`Failed to get character from registry: ${error}`);
        throw error;
    }
};
exports.getCharacterFromRegistry = getCharacterFromRegistry;
/**
 * Get all characters from the registry
 */
const getAllCharactersFromRegistry = async () => {
    try {
        const client = await (0, hederaService_1.getHederaClient)();
        const topicId = await (0, exports.getCharacterRegistryTopicId)();
        // Get all messages from the registry topic
        const { messages } = await client.getMessages(topicId);
        // Map to track the most recent data for each character
        const characterMap = new Map();
        // Process all messages
        for (const message of messages) {
            try {
                const data = JSON.parse(message.data);
                // Check if this is a character registration message
                if (data.type === 'character_registration' && data.characterId) {
                    const characterId = data.characterId;
                    // If we don't have this character yet, or this is more recent
                    if (!characterMap.has(characterId) ||
                        characterMap.get(characterId).registrationTimestamp < data.registrationTimestamp) {
                        characterMap.set(characterId, data);
                    }
                }
            }
            catch (e) {
                // Skip messages that can't be parsed
                logger.error(`Error parsing registry message: ${e}`);
            }
        }
        // Convert the map to an array of character data
        return Array.from(characterMap.values());
    }
    catch (error) {
        logger.error(`Failed to get characters from registry: ${error}`);
        return [];
    }
};
exports.getAllCharactersFromRegistry = getAllCharactersFromRegistry;
