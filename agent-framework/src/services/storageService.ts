import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

// Base directory for storing state
const STATE_DIR = process.env.STATE_DIR || './data';
const AGENT_DIR = path.join(STATE_DIR, 'agents');
const CONNECTION_DIR = path.join(STATE_DIR, 'connections');
const MESSAGE_DIR = path.join(STATE_DIR, 'messages');

// Add character cache directory
const CHARACTER_DIR = path.join(STATE_DIR, 'characters');

// Ensure directories exist
if (!fs.existsSync(STATE_DIR)) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}
if (!fs.existsSync(AGENT_DIR)) {
  fs.mkdirSync(AGENT_DIR, { recursive: true });
}
if (!fs.existsSync(CONNECTION_DIR)) {
  fs.mkdirSync(CONNECTION_DIR, { recursive: true });
}
if (!fs.existsSync(MESSAGE_DIR)) {
  fs.mkdirSync(MESSAGE_DIR, { recursive: true });
}

// Ensure character directory exists
if (!fs.existsSync(CHARACTER_DIR)) {
  fs.mkdirSync(CHARACTER_DIR, { recursive: true });
}

/**
 * Agent information interface
 */
export interface AgentInfo {
  characterId: string;
  accountId: string;
  privateKey: string;
  inboundTopicId: string;
  outboundTopicId?: string;
  connections?: string[];
  characterData?: CharacterData;
}

/**
 * Connection information interface
 */
export interface ConnectionInfo {
  connectionTopicId: string;
  userAccountId: string;
  agentAccountId: string;
  characterId: string;
  createdAt: string;
  lastMessageAt?: string;
}

/**
 * Add character data interface
 */
export interface CharacterData {
  name: string;
  description: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  traits?: Record<string, any>;
  [key: string]: any; // Allow any other character properties
}

// In-memory cache of character data
const characterCache = new Map<string, CharacterData>();

/**
 * Store agent information
 */
export const saveAgentInfo = async (agentInfo: AgentInfo): Promise<void> => {
  try {
    const filePath = path.join(AGENT_DIR, `${agentInfo.characterId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(agentInfo, null, 2));
    logger.info('STORAGE', `Stored agent info for character ${agentInfo.characterId}`);
  } catch (error) {
    logger.error('STORAGE', `Failed to store agent info: ${error}`, error);
    throw error;
  }
};

/**
 * Get agent information for a character
 */
export const getAgentInfoForCharacter = async (
  characterId: string
): Promise<AgentInfo | null> => {
  try {
    const filePath = path.join(AGENT_DIR, `${characterId}.json`);
    
    if (!fs.existsSync(filePath)) {
      logger.info('STORAGE', `No agent info found for character ${characterId}`);
      return null;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('STORAGE', `Failed to get agent info: ${error}`, error);
    throw error;
  }
};

/**
 * Get agent information by inbound topic ID
 */
export const getAgentInfoByInboundTopic = async (
  inboundTopicId: string
): Promise<AgentInfo | null> => {
  try {
    // List all agent files
    const files = fs.readdirSync(AGENT_DIR);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(AGENT_DIR, file);
        const data = fs.readFileSync(filePath, 'utf8');
        const agentInfo = JSON.parse(data);
        
        if (agentInfo.inboundTopicId === inboundTopicId) {
          return agentInfo;
        }
      }
    }
    
    logger.info('STORAGE', `No agent found with inbound topic ${inboundTopicId}`);
    return null;
  } catch (error) {
    logger.error('STORAGE', `Failed to get agent by inbound topic: ${error}`, error);
    throw error;
  }
};

/**
 * Store connection information
 */
export const saveConnection = async (connectionInfo: ConnectionInfo): Promise<void> => {
  try {
    // Create directories if they don't exist
    const connectionDir = path.join(CONNECTION_DIR, connectionInfo.characterId);
    if (!fs.existsSync(connectionDir)) {
      fs.mkdirSync(connectionDir, { recursive: true });
    }
    
    const filePath = path.join(connectionDir, `${connectionInfo.connectionTopicId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(connectionInfo, null, 2));
    
    // Update agent's connections list
    const agentInfo = await getAgentInfoForCharacter(connectionInfo.characterId);
    if (agentInfo) {
      if (!agentInfo.connections) {
        agentInfo.connections = [];
      }
      
      if (!agentInfo.connections.includes(connectionInfo.connectionTopicId)) {
        agentInfo.connections.push(connectionInfo.connectionTopicId);
        await saveAgentInfo(agentInfo);
      }
    }
    
    logger.info('STORAGE', `Stored connection ${connectionInfo.connectionTopicId} for character ${connectionInfo.characterId}`);
  } catch (error) {
    logger.error('STORAGE', `Failed to store connection: ${error}`, error);
    throw error;
  }
};

/**
 * Get connection by topic ID
 */
export const getConnectionByTopicId = async (
  connectionTopicId: string
): Promise<ConnectionInfo | null> => {
  try {
    // Search all character directories
    const characterDirs = fs.readdirSync(CONNECTION_DIR);
    
    for (const characterId of characterDirs) {
      const characterDir = path.join(CONNECTION_DIR, characterId);
      
      if (fs.statSync(characterDir).isDirectory()) {
        const filePath = path.join(characterDir, `${connectionTopicId}.json`);
        
        if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath, 'utf8');
          return JSON.parse(data);
        }
      }
    }
    
    logger.info('STORAGE', `No connection found with topic ID ${connectionTopicId}`);
    return null;
  } catch (error) {
    logger.error('STORAGE', `Failed to get connection by topic ID: ${error}`, error);
    return null;
  }
};

/**
 * Get all connections for a character
 */
export const getConnectionsForCharacter = async (
  characterId: string
): Promise<ConnectionInfo[]> => {
  try {
    const connectionDir = path.join(CONNECTION_DIR, characterId);
    
    if (!fs.existsSync(connectionDir)) {
      return [];
    }
    
    const files = fs.readdirSync(connectionDir);
    const connections: ConnectionInfo[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(connectionDir, file);
        const data = fs.readFileSync(filePath, 'utf8');
        connections.push(JSON.parse(data));
      }
    }
    
    return connections;
  } catch (error) {
    logger.error('STORAGE', `Failed to get connections for character: ${error}`, error);
    return [];
  }
};

/**
 * Store message information
 */
export const saveMessage = async (
  messageId: string,
  topicId: string,
  message: any
): Promise<void> => {
  try {
    const filePath = path.join(MESSAGE_DIR, `${messageId}.json`);
    fs.writeFileSync(filePath, JSON.stringify({
      messageId,
      topicId,
      message,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    logger.info('STORAGE', `Stored message ${messageId} for topic ${topicId}`);
  } catch (error) {
    logger.error('STORAGE', `Failed to store message: ${error}`, error);
    throw error;
  }
};

/**
 * Update connection with last message timestamp
 */
export const updateConnectionLastMessage = async (
  connectionTopicId: string,
  timestamp: string = new Date().toISOString()
): Promise<void> => {
  try {
    const connection = await getConnectionByTopicId(connectionTopicId);
    
    if (connection) {
      connection.lastMessageAt = timestamp;
      await saveConnection(connection);
      logger.info('STORAGE', `Updated last message timestamp for connection ${connectionTopicId}`);
    }
  } catch (error) {
    logger.error('STORAGE', `Failed to update connection last message: ${error}`, error);
    throw error;
  }
};

/**
 * Store character data in storage and cache
 */
export const saveCharacterData = async (
  characterId: string, 
  characterData: CharacterData
): Promise<void> => {
  try {
    // Save to file
    const filePath = path.join(CHARACTER_DIR, `${characterId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(characterData, null, 2));
    
    // Save to cache
    characterCache.set(characterId, characterData);
    
    logger.info('STORAGE', `Stored character data for ${characterId}`);
  } catch (error) {
    logger.error('STORAGE', `Failed to store character data: ${error}`, error);
    throw error;
  }
};

/**
 * Get character data from cache or storage
 */
export const getCharacterData = async (
  characterId: string
): Promise<CharacterData | null> => {
  try {
    // Check cache first
    if (characterCache.has(characterId)) {
      return characterCache.get(characterId)!;
    }
    
    // Try to load from file
    const filePath = path.join(CHARACTER_DIR, `${characterId}.json`);
    
    if (!fs.existsSync(filePath)) {
      // Try alternate format with underscores instead of dots
      const altFilePath = path.join(CHARACTER_DIR, `${characterId.replace(/\./g, '_')}.json`);
      
      if (!fs.existsSync(altFilePath)) {
        // Check if character data is in the agent info
        const agentInfo = await getAgentInfoForCharacter(characterId);
        
        if (agentInfo && agentInfo.characterData) {
          characterCache.set(characterId, agentInfo.characterData);
          return agentInfo.characterData;
        }
        
        logger.info('STORAGE', `No character data found for ${characterId}`);
        return null;
      }
      
      const data = fs.readFileSync(altFilePath, 'utf8');
      const characterData = JSON.parse(data);
      
      // Save to cache
      characterCache.set(characterId, characterData);
      
      return characterData;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    const characterData = JSON.parse(data);
    
    // Save to cache
    characterCache.set(characterId, characterData);
    
    return characterData;
  } catch (error) {
    logger.error('STORAGE', `Failed to get character data: ${error}`, error);
    return null;
  }
}; 