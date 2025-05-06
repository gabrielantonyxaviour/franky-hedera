"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCharacter = exports.addCharacter = exports.getCharacterDetails = exports.listCharacters = void 0;
const logger_1 = require("../utils/logger");
const registryService_1 = require("../services/registryService");
const storageService_1 = require("../services/storageService");
// Initialize logger
const logger = logger_1.Logger.getInstance({
    level: process.env.LOG_LEVEL || 'info',
    module: 'characterController',
});
/**
 * List all available characters
 */
const listCharacters = async (req, res) => {
    try {
        logger.info('Listing all characters');
        // Get all characters from registry
        const characters = await (0, registryService_1.getAllCharactersFromRegistry)();
        // Format the response
        const formattedCharacters = characters.map(character => ({
            characterId: character.characterId,
            name: character.name,
            description: character.description,
            imageUrl: character.imageUrl,
            traits: character.traits || {}
        }));
        res.json({
            success: true,
            characters: formattedCharacters
        });
    }
    catch (error) {
        logger.error(`Error listing characters: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
exports.listCharacters = listCharacters;
/**
 * Get character details by ID
 */
const getCharacterDetails = async (req, res) => {
    try {
        const characterId = req.params.characterId;
        logger.info(`Getting details for character ${characterId}`);
        // Get character data from registry
        const character = await (0, registryService_1.getCharacterFromRegistry)(characterId);
        if (!character) {
            return res.status(404).json({
                success: false,
                error: `Character ${characterId} not found`
            });
        }
        // Format the response
        const characterDetails = {
            characterId: character.characterId,
            name: character.name,
            description: character.description,
            imageUrl: character.imageUrl,
            traits: character.traits || {},
            registrationTimestamp: character.registrationTimestamp
        };
        res.json({
            success: true,
            character: characterDetails
        });
    }
    catch (error) {
        logger.error(`Error getting character details: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
exports.getCharacterDetails = getCharacterDetails;
/**
 * Add a new character to the registry
 */
const addCharacter = async (req, res) => {
    try {
        // Validate request body
        const { characterId, name, description, imageUrl, traits } = req.body;
        if (!characterId || !name) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: characterId and name are required'
            });
        }
        logger.info(`Adding new character ${characterId}: ${name}`);
        // Check if character already exists
        const existingCharacter = await (0, registryService_1.getCharacterFromRegistry)(characterId);
        if (existingCharacter) {
            return res.status(400).json({
                success: false,
                error: `Character with ID ${characterId} already exists`
            });
        }
        // Check if we already have an agent for this character
        const existingAgent = await (0, storageService_1.getAgentInfoForCharacter)(characterId);
        // Prepare character data
        let characterData = {
            name,
            description: description || `Character agent for ${name}`,
            imageUrl,
            traits: traits || {}
        };
        if (existingAgent) {
            // If we already have an agent, use its information
            characterData.accountId = existingAgent.accountId;
            characterData.inboundTopicId = existingAgent.inboundTopicId;
            characterData.outboundTopicId = existingAgent.outboundTopicId;
            logger.info(`Using existing agent ${existingAgent.accountId} for new character ${characterId}`);
        }
        else {
            // We'll create an agent later when initializing
            logger.info(`No existing agent for character ${characterId}, will create during initialization`);
        }
        // Register the character in the registry
        await (0, registryService_1.registerCharacterInRegistry)(characterId, characterData);
        res.json({
            success: true,
            character: {
                characterId,
                name,
                description: characterData.description,
                imageUrl,
                traits: characterData.traits
            }
        });
    }
    catch (error) {
        logger.error(`Error adding character: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
exports.addCharacter = addCharacter;
/**
 * Delete a character from the registry
 * Note: This doesn't actually delete from the HCS topic (that's not possible),
 * but it can mark the character as deleted for future registry retrievals
 */
const deleteCharacter = async (req, res) => {
    try {
        const characterId = req.params.characterId;
        logger.info(`Marking character ${characterId} as deleted`);
        // Get character data from registry
        const character = await (0, registryService_1.getCharacterFromRegistry)(characterId);
        if (!character) {
            return res.status(404).json({
                success: false,
                error: `Character ${characterId} not found`
            });
        }
        // Register a "deleted" entry in the registry
        // This will override previous entries when retrieving from the registry
        await (0, registryService_1.registerCharacterInRegistry)(characterId, {
            name: character.name,
            description: character.description,
            imageUrl: character.imageUrl,
            traits: character.traits,
            isDeleted: true,
            deletedTimestamp: Date.now()
        });
        res.json({
            success: true,
            message: `Character ${characterId} marked as deleted`
        });
    }
    catch (error) {
        logger.error(`Error deleting character: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
exports.deleteCharacter = deleteCharacter;
