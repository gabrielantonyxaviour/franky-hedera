import fs from 'fs';
import path from 'path';
import { Character } from '../types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Directory where character JSON files are stored
const CHARACTERS_DIR = path.join(process.cwd(), 'characters');

/**
 * Loads a character by filename
 * @param filename The filename of the character JSON file
 * @returns The character object
 */
export function loadCharacter(filename: string): Character {
  try {
    // Make sure the characters directory exists
    if (!fs.existsSync(CHARACTERS_DIR)) {
      fs.mkdirSync(CHARACTERS_DIR, { recursive: true });
      logger.info('CharacterManager', 'Created characters directory');
    }

    const filePath = path.join(CHARACTERS_DIR, filename);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      logger.error('CharacterManager', `Character file not found: ${filePath}`);
      throw new Error(`Character file not found: ${filename}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const character = JSON.parse(fileContent) as Character;
    
    // If the character doesn't have an ID, generate one and save it back to the file
    if (!character.id) {
      character.id = uuidv4();
      logger.info('CharacterManager', `Generated missing ID for character: ${character.name}`);
      
      // Save the updated character with ID
      fs.writeFileSync(filePath, JSON.stringify(character, null, 4), 'utf-8');
      logger.info('CharacterManager', `Updated character file with generated ID`);
    }
    
    logger.info('CharacterManager', `Loaded character: ${character.name} (ID: ${character.id})`);
    return character;
  } catch (error) {
    logger.error('CharacterManager', 'Error loading character', error);
    throw error;
  }
}

/**
 * Lists all available character files
 * @returns Array of character filenames
 */
export function listCharacters(): string[] {
  try {
    // Make sure the characters directory exists
    if (!fs.existsSync(CHARACTERS_DIR)) {
      fs.mkdirSync(CHARACTERS_DIR, { recursive: true });
      logger.info('CharacterManager', 'Created characters directory');
      return [];
    }
    
    const files = fs.readdirSync(CHARACTERS_DIR)
      .filter(file => file.endsWith('.json'));
    
    logger.info('CharacterManager', `Found ${files.length} character files`);
    return files;
  } catch (error) {
    logger.error('CharacterManager', 'Error listing characters', error);
    throw error;
  }
}

/**
 * Lists all characters with their IDs and names
 * @returns Array of character objects with id, name, and filename
 */
export function listCharactersWithInfo(): Array<{id: string, name: string, filename: string}> {
  try {
    const files = listCharacters();
    const characters = files.map(filename => {
      try {
        const character = loadCharacter(filename);
        return {
          id: character.id,
          name: character.name,
          filename
        };
      } catch (error) {
        logger.error('CharacterManager', `Error loading character info for ${filename}`, error);
        return null;
      }
    }).filter(Boolean) as Array<{id: string, name: string, filename: string}>;
    
    return characters;
  } catch (error) {
    logger.error('CharacterManager', 'Error listing characters with info', error);
    return [];
  }
}

/**
 * Finds a character by its ID
 * @param id The UUID of the character to find
 * @returns The character object or null if not found
 */
export function findCharacterById(id: string): Character | null {
  try {
    const files = listCharacters();
    
    for (const filename of files) {
      try {
        const character = loadCharacter(filename);
        if (character.id === id) {
          logger.info('CharacterManager', `Found character with ID ${id}: ${character.name}`);
          return character;
        }
      } catch (error) {
        logger.error('CharacterManager', `Error checking character ${filename} for ID match`, error);
        continue;
      }
    }
    
    logger.warn('CharacterManager', `No character found with ID: ${id}`);
    return null;
  } catch (error) {
    logger.error('CharacterManager', `Error finding character by ID: ${id}`, error);
    return null;
  }
}

/**
 * Creates a character prompt from a character object and user message
 * @param character The character object
 * @param userMessage The user's message
 * @returns A formatted prompt for the LLM
 */
export function createCharacterPrompt(character: Character, userMessage: string): string {
  return `${character.system_prompt}

You are role-playing as ${character.name}.
${character.description}
${character.personality}

Background: ${character.scenario}

Here's how you typically respond: 
${character.mes_example}

USER: ${userMessage}
${character.name}:`;
} 