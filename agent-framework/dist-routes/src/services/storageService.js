"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeConnectionData = exports.getMessageInfo = exports.storeMessageInfo = exports.getConnectionTopicId = exports.storeConnectionTopicId = exports.getAgentInfoForCharacter = exports.storeAgentInfoForCharacter = void 0;
const logger_1 = require("../utils/logger");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Initialize logger
const logger = logger_1.Logger.getInstance({
    level: process.env.LOG_LEVEL || 'info',
    module: 'storage',
});
// Base directory for storing state
const STATE_DIR = process.env.STATE_DIR || './data';
const AGENT_DIR = path_1.default.join(STATE_DIR, 'agents');
const CONNECTION_DIR = path_1.default.join(STATE_DIR, 'connections');
const MESSAGE_DIR = path_1.default.join(STATE_DIR, 'messages');
// Ensure directories exist
if (!fs_1.default.existsSync(STATE_DIR)) {
    fs_1.default.mkdirSync(STATE_DIR, { recursive: true });
}
if (!fs_1.default.existsSync(AGENT_DIR)) {
    fs_1.default.mkdirSync(AGENT_DIR, { recursive: true });
}
if (!fs_1.default.existsSync(CONNECTION_DIR)) {
    fs_1.default.mkdirSync(CONNECTION_DIR, { recursive: true });
}
if (!fs_1.default.existsSync(MESSAGE_DIR)) {
    fs_1.default.mkdirSync(MESSAGE_DIR, { recursive: true });
}
/**
 * Store agent information for a character
 */
const storeAgentInfoForCharacter = async (characterId, agentInfo) => {
    try {
        const filePath = path_1.default.join(AGENT_DIR, `${characterId}.json`);
        fs_1.default.writeFileSync(filePath, JSON.stringify(agentInfo, null, 2));
        logger.info(`Stored agent info for character ${characterId}`);
    }
    catch (error) {
        logger.error(`Failed to store agent info: ${error}`);
        throw error;
    }
};
exports.storeAgentInfoForCharacter = storeAgentInfoForCharacter;
/**
 * Get agent information for a character
 */
const getAgentInfoForCharacter = async (characterId) => {
    try {
        const filePath = path_1.default.join(AGENT_DIR, `${characterId}.json`);
        if (!fs_1.default.existsSync(filePath)) {
            logger.info(`No agent info found for character ${characterId}`);
            return null;
        }
        const data = fs_1.default.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        logger.error(`Failed to get agent info: ${error}`);
        throw error;
    }
};
exports.getAgentInfoForCharacter = getAgentInfoForCharacter;
/**
 * Store connection topic ID for a user-character pair
 */
const storeConnectionTopicId = async (userId, characterId, connectionTopicId) => {
    try {
        // Ensure directory exists
        const userDir = path_1.default.join(CONNECTION_DIR, userId);
        if (!fs_1.default.existsSync(userDir)) {
            fs_1.default.mkdirSync(userDir, { recursive: true });
        }
        const filePath = path_1.default.join(userDir, `${characterId}.json`);
        fs_1.default.writeFileSync(filePath, JSON.stringify({
            connectionTopicId,
            created: new Date().toISOString()
        }, null, 2));
        logger.info(`Stored connection topic ${connectionTopicId} for user ${userId} and character ${characterId}`);
    }
    catch (error) {
        logger.error(`Failed to store connection topic: ${error}`);
        throw error;
    }
};
exports.storeConnectionTopicId = storeConnectionTopicId;
/**
 * Get connection topic ID for a user-character pair
 */
const getConnectionTopicId = async (userId, characterId) => {
    try {
        const filePath = path_1.default.join(CONNECTION_DIR, userId, `${characterId}.json`);
        if (!fs_1.default.existsSync(filePath)) {
            logger.info(`No connection found for user ${userId} and character ${characterId}`);
            return null;
        }
        const data = fs_1.default.readFileSync(filePath, 'utf8');
        const connection = JSON.parse(data);
        return connection.connectionTopicId;
    }
    catch (error) {
        logger.error(`Failed to get connection topic: ${error}`);
        return null;
    }
};
exports.getConnectionTopicId = getConnectionTopicId;
/**
 * Store message information
 */
const storeMessageInfo = async (messageId, messageInfo) => {
    try {
        const filePath = path_1.default.join(MESSAGE_DIR, `${messageId}.json`);
        fs_1.default.writeFileSync(filePath, JSON.stringify(messageInfo, null, 2));
        logger.info(`Stored message info for message ${messageId}`);
    }
    catch (error) {
        logger.error(`Failed to store message info: ${error}`);
        throw error;
    }
};
exports.storeMessageInfo = storeMessageInfo;
/**
 * Get message information
 */
const getMessageInfo = async (messageId) => {
    try {
        const filePath = path_1.default.join(MESSAGE_DIR, `${messageId}.json`);
        if (!fs_1.default.existsSync(filePath)) {
            logger.info(`No message info found for message ${messageId}`);
            return null;
        }
        const data = fs_1.default.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        logger.error(`Failed to get message info: ${error}`);
        return null;
    }
};
exports.getMessageInfo = getMessageInfo;
/**
 * Remove connection data for a user-character pair
 */
const removeConnectionData = async (userId, characterId) => {
    try {
        const filePath = path_1.default.join(CONNECTION_DIR, userId, `${characterId}.json`);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            logger.info(`Removed connection data for user ${userId} and character ${characterId}`);
            return true;
        }
        return false;
    }
    catch (error) {
        logger.error(`Failed to remove connection data: ${error}`);
        return false;
    }
};
exports.removeConnectionData = removeConnectionData;
