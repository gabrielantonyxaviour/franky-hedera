import * as dotenv from 'dotenv';
import { Character } from '../types';
import { logger } from './logger';

dotenv.config();

export interface AppConfig {
  // LLM settings
  useHybridModel: boolean;
  openaiApiKey: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  
  // Character mode settings
  characterMode: boolean;
  characterFile: string | null;
  
  // Hedera settings
  hederaAccountId: string;
  hederaPrivateKey: string;
  hederaNetwork: 'mainnet' | 'testnet' | 'previewnet';
}

// Default configuration with environment variable fallbacks
export const config: AppConfig = {
  // LLM settings - default to true for useHybridModel unless explicitly set to 'false'
  useHybridModel: process.env.USE_HYBRID_MODEL !== 'false',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
  
  // Character mode settings (disabled by default)
  characterMode: process.env.CHARACTER_MODE === 'true',
  characterFile: process.env.CHARACTER_FILE || null,
  
  // Hedera settings
  hederaAccountId: process.env.HEDERA_ACCOUNT_ID || '',
  hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY || '',
  hederaNetwork: (process.env.HEDERA_NETWORK || 'testnet') as 'mainnet' | 'testnet' | 'previewnet',
};

// Log the configuration settings on startup, especially the hybrid model setting
logger.info('Config', 'Configuration initialized', { 
  useHybridModel: config.useHybridModel,
  hybridEnvValue: process.env.USE_HYBRID_MODEL,
  ollamaModel: config.ollamaModel
});

/**
 * Updates a configuration value
 * @param key The configuration key to update
 * @param value The new value
 */
export function updateConfig<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
  logger.info('Config', `Updating config: ${key}`, { newValue: value });
  config[key] = value;
}

/**
 * Gets the current character mode state
 * @returns Object with characterMode and characterFile
 */
export function getCharacterModeState(): { enabled: boolean; filename: string | null } {
  return {
    enabled: config.characterMode,
    filename: config.characterFile
  };
}

/**
 * Enables character mode with the specified character file
 * @param characterFile The character file to use
 */
export function enableCharacterMode(characterFile: string): void {
  updateConfig('characterMode', true);
  updateConfig('characterFile', characterFile);
  logger.info('Config', 'Character mode enabled', { characterFile });
}

/**
 * Disables character mode
 */
export function disableCharacterMode(): void {
  updateConfig('characterMode', false);
  logger.info('Config', 'Character mode disabled');
} 