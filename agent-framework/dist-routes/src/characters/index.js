"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCharacter = loadCharacter;
exports.listCharacters = listCharacters;
exports.listCharactersWithInfo = listCharactersWithInfo;
exports.findCharacterById = findCharacterById;
exports.createCharacterPrompt = createCharacterPrompt;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
// Directory where character JSON files are stored
const CHARACTERS_DIR = path_1.default.join(process.cwd(), 'characters');
/**
 * Loads a character by filename
 * @param filename The filename of the character JSON file
 * @returns The character object
 */
function loadCharacter(filename) {
    try {
        // Make sure the characters directory exists
        if (!fs_1.default.existsSync(CHARACTERS_DIR)) {
            fs_1.default.mkdirSync(CHARACTERS_DIR, { recursive: true });
            logger_1.logger.info('CharacterManager', 'Created characters directory');
        }
        const filePath = path_1.default.join(CHARACTERS_DIR, filename);
        // Check if the file exists
        if (!fs_1.default.existsSync(filePath)) {
            logger_1.logger.error('CharacterManager', `Character file not found: ${filePath}`);
            throw new Error(`Character file not found: ${filename}`);
        }
        const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
        const character = JSON.parse(fileContent);
        // If the character doesn't have an ID, generate one and save it back to the file
        if (!character.id) {
            character.id = (0, uuid_1.v4)();
            logger_1.logger.info('CharacterManager', `Generated missing ID for character: ${character.name}`);
            // Save the updated character with ID
            fs_1.default.writeFileSync(filePath, JSON.stringify(character, null, 4), 'utf-8');
            logger_1.logger.info('CharacterManager', `Updated character file with generated ID`);
        }
        logger_1.logger.info('CharacterManager', `Loaded character: ${character.name} (ID: ${character.id})`);
        return character;
    }
    catch (error) {
        logger_1.logger.error('CharacterManager', 'Error loading character', error);
        throw error;
    }
}
/**
 * Lists all available character files
 * @returns Array of character filenames
 */
function listCharacters() {
    try {
        // Make sure the characters directory exists
        if (!fs_1.default.existsSync(CHARACTERS_DIR)) {
            fs_1.default.mkdirSync(CHARACTERS_DIR, { recursive: true });
            logger_1.logger.info('CharacterManager', 'Created characters directory');
            return [];
        }
        const files = fs_1.default.readdirSync(CHARACTERS_DIR)
            .filter(file => file.endsWith('.json'));
        logger_1.logger.info('CharacterManager', `Found ${files.length} character files`);
        return files;
    }
    catch (error) {
        logger_1.logger.error('CharacterManager', 'Error listing characters', error);
        throw error;
    }
}
/**
 * Lists all characters with their IDs and names
 * @returns Array of character objects with id, name, and filename
 */
function listCharactersWithInfo() {
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
            }
            catch (error) {
                logger_1.logger.error('CharacterManager', `Error loading character info for ${filename}`, error);
                return null;
            }
        }).filter(Boolean);
        return characters;
    }
    catch (error) {
        logger_1.logger.error('CharacterManager', 'Error listing characters with info', error);
        return [];
    }
}
/**
 * Finds a character by its ID
 * @param id The UUID of the character to find
 * @returns The character object or null if not found
 */
function findCharacterById(id) {
    try {
        const files = listCharacters();
        for (const filename of files) {
            try {
                const character = loadCharacter(filename);
                if (character.id === id) {
                    logger_1.logger.info('CharacterManager', `Found character with ID ${id}: ${character.name}`);
                    return character;
                }
            }
            catch (error) {
                logger_1.logger.error('CharacterManager', `Error checking character ${filename} for ID match`, error);
                continue;
            }
        }
        logger_1.logger.warn('CharacterManager', `No character found with ID: ${id}`);
        return null;
    }
    catch (error) {
        logger_1.logger.error('CharacterManager', `Error finding character by ID: ${id}`, error);
        return null;
    }
}
/**
 * Creates a character prompt from a character object and user message
 * @param character The character object
 * @param userMessage The user's message
 * @returns A formatted prompt for the LLM
 */
function createCharacterPrompt(character, userMessage) {
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
