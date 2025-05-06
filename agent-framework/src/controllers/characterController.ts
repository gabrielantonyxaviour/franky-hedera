import { Request, Response } from 'express';
import { Logger, logger } from '../utils/logger';
import { 
  getAllCharactersFromRegistry, 
  getCharacterFromRegistry,
  registerCharacterInRegistry
} from '../services/registryService';
import { getAgentInfoForCharacter } from '../services/storageService';
import * as fs from 'fs';
import * as path from 'path';

const CONTEXT_CHARACTER = 'CHARACTER';

/**
 * List all available characters
 */
export const listCharacters = async (req: Request, res: Response) => {
  try {
    logger.info(CONTEXT_CHARACTER, 'Listing all characters');
    
    // Get all characters from agent registry
    const characters = await getAllCharactersFromRegistry();
    
    // Format the response
    const formattedCharacters = characters.map(character => ({
      characterId: character.characterId,
      name: character.name,
      description: character.description,
      imageUrl: character.imageUrl,
      personality: character.personality,
      scenario: character.scenario,
      tags: character.tags || [],
      traits: character.traits || {}
    }));
    
    res.json({
      success: true,
      characters: formattedCharacters
    });
  } catch (error: any) {
    logger.error(CONTEXT_CHARACTER, `Error listing characters: ${error.message}`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get character details by ID
 */
export const getCharacterDetails = async (req: Request, res: Response) => {
  try {
    const characterId = req.params.characterId;
    logger.info(CONTEXT_CHARACTER, `Getting details for character ${characterId}`);
    
    // Get character data from registry
    const character = await getCharacterFromRegistry(characterId);
    
    if (!character) {
      return res.status(404).json({
        success: false,
        error: `Character ${characterId} not found`
      });
    }
    
    // Format the response - include all character details for the UI
    const characterDetails = {
      characterId: character.characterId,
      name: character.name,
      description: character.description,
      imageUrl: character.imageUrl,
      personality: character.personality,
      scenario: character.scenario,
      first_mes: character.first_mes,
      mes_example: character.mes_example,
      creatorcomment: character.creatorcomment,
      tags: character.tags || [],
      talkativeness: character.talkativeness,
      traits: character.traits || {},
      registrationTimestamp: character.registrationTimestamp
    };
    
    res.json({
      success: true,
      character: characterDetails
    });
  } catch (error: any) {
    logger.error(CONTEXT_CHARACTER, `Error getting character details: ${error.message}`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Add a new character to the registry
 */
export const addCharacter = async (req: Request, res: Response) => {
  try {
    // Validate request body - allow full character structure
    const { 
      characterId, 
      name, 
      description, 
      imageUrl,
      personality,
      scenario,
      first_mes, 
      mes_example,
      creatorcomment,
      tags,
      talkativeness,
      traits
    } = req.body;
    
    if (!characterId || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: characterId and name are required'
      });
    }
    
    logger.info(CONTEXT_CHARACTER, `Adding new character ${characterId}: ${name}`);
    
    // Check if character already exists
    const existingCharacter = await getCharacterFromRegistry(characterId);
    if (existingCharacter) {
      return res.status(400).json({
        success: false,
        error: `Character with ID ${characterId} already exists`
      });
    }
    
    // Check if we already have an agent for this character
    const existingAgent = await getAgentInfoForCharacter(characterId);
    
    // Prepare complete character data
    const characterData = {
      name,
      description: description || `Character agent for ${name}`,
      imageUrl,
      personality,
      scenario,
      first_mes,
      mes_example,
      creatorcomment,
      tags: tags || [],
      talkativeness: talkativeness || 0.7,
      traits: traits || {}
    };
    
    if (existingAgent) {
      // If we already have an agent, use its information
      characterData.accountId = existingAgent.accountId;
      characterData.inboundTopicId = existingAgent.inboundTopicId;
      characterData.outboundTopicId = existingAgent.outboundTopicId;
      
      logger.info(CONTEXT_CHARACTER, `Using existing agent ${existingAgent.accountId} for new character ${characterId}`);
    } else {
      // We'll create an agent later when initializing
      logger.info(CONTEXT_CHARACTER, `No existing agent for character ${characterId}, will create during initialization`);
    }
    
    // Register the character in the unified registry
    await registerCharacterInRegistry(characterId, characterData);
    
    res.json({
      success: true,
      character: {
        characterId,
        name,
        description: characterData.description,
        imageUrl,
        personality,
        scenario,
        first_mes,
        mes_example,
        traits: characterData.traits,
        tags: characterData.tags
      }
    });
  } catch (error: any) {
    logger.error(CONTEXT_CHARACTER, `Error adding character: ${error.message}`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Import a character from a JSON file in the characters directory
 */
export const importCharacter = async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Missing filename parameter'
      });
    }
    
    logger.info(CONTEXT_CHARACTER, `Importing character from file: ${filename}`);
    
    // Determine file path - ensure it's in the characters directory
    const charactersDir = path.join(process.cwd(), 'characters');
    const filePath = path.join(charactersDir, filename.endsWith('.json') ? filename : `${filename}.json`);
    
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: `Character file not found: ${filename}`
      });
    }
    
    // Read the character file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const characterJson = JSON.parse(fileContent);
    
    // Validate required fields
    if (!characterJson.id || !characterJson.name) {
      return res.status(400).json({
        success: false,
        error: 'Invalid character file: missing id or name'
      });
    }
    
    // Check if character already exists
    const existingCharacter = await getCharacterFromRegistry(characterJson.id);
    if (existingCharacter) {
      return res.status(400).json({
        success: false,
        error: `Character with ID ${characterJson.id} already exists`
      });
    }
    
    // Check if we already have an agent for this character
    const existingAgent = await getAgentInfoForCharacter(characterJson.id);
    
    // Prepare character data for registration
    const characterData = {
      name: characterJson.name,
      description: characterJson.description,
      personality: characterJson.personality,
      scenario: characterJson.scenario,
      first_mes: characterJson.first_mes,
      mes_example: characterJson.mes_example,
      creatorcomment: characterJson.creatorcomment,
      tags: characterJson.tags || [],
      talkativeness: characterJson.talkativeness || 0.7,
      traits: characterJson.traits || {},
      imageUrl: characterJson.imageUrl
    };
    
    if (existingAgent) {
      // If we already have an agent, use its information
      characterData.accountId = existingAgent.accountId;
      characterData.inboundTopicId = existingAgent.inboundTopicId;
      characterData.outboundTopicId = existingAgent.outboundTopicId;
      
      logger.info(CONTEXT_CHARACTER, `Using existing agent ${existingAgent.accountId} for character ${characterJson.id}`);
    } else {
      // We'll create an agent later when initializing
      logger.info(CONTEXT_CHARACTER, `No existing agent for character ${characterJson.id}, will create during initialization`);
    }
    
    // Register the character in the registry
    await registerCharacterInRegistry(characterJson.id, characterData);
    
    res.json({
      success: true,
      character: {
        characterId: characterJson.id,
        name: characterJson.name,
        description: characterJson.description,
        imageUrl: characterJson.imageUrl,
        traits: characterJson.traits || {}
      }
    });
  } catch (error: any) {
    logger.error(CONTEXT_CHARACTER, `Error importing character: ${error.message}`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete a character from the registry
 * Note: This doesn't actually delete from the HCS topic (that's not possible),
 * but it can mark the character as deleted for future registry retrievals
 */
export const deleteCharacter = async (req: Request, res: Response) => {
  try {
    const characterId = req.params.characterId;
    logger.info(CONTEXT_CHARACTER, `Marking character ${characterId} as deleted`);
    
    // Get character data from registry
    const character = await getCharacterFromRegistry(characterId);
    
    if (!character) {
      return res.status(404).json({
        success: false,
        error: `Character ${characterId} not found`
      });
    }
    
    // Build a modified character data object to mark as deleted
    const deleteCharacterData = {
      name: character.name,
      description: character.description,
      accountId: character.agentAccountId,
      inboundTopicId: character.inboundTopicId,
      outboundTopicId: character.outboundTopicId,
      imageUrl: character.imageUrl,
      personality: character.personality,
      scenario: character.scenario,
      traits: character.traits,
      isDeleted: true,
      deletedTimestamp: Date.now()
    };
    
    // Register the "deleted" entry in the registry
    // This will override previous entries when retrieving from the registry
    await registerCharacterInRegistry(characterId, deleteCharacterData);
    
    res.json({
      success: true,
      message: `Character ${characterId} marked as deleted`
    });
  } catch (error: any) {
    logger.error(CONTEXT_CHARACTER, `Error deleting character: ${error.message}`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 