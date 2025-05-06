"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.updateConfig = updateConfig;
exports.getCharacterModeState = getCharacterModeState;
exports.enableCharacterMode = enableCharacterMode;
exports.disableCharacterMode = disableCharacterMode;
const dotenv = __importStar(require("dotenv"));
const logger_1 = require("./logger");
dotenv.config();
// Default configuration with environment variable fallbacks
exports.config = {
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
    hederaNetwork: (process.env.HEDERA_NETWORK || 'testnet'),
};
// Log the configuration settings on startup, especially the hybrid model setting
logger_1.logger.info('Config', 'Configuration initialized', {
    useHybridModel: exports.config.useHybridModel,
    hybridEnvValue: process.env.USE_HYBRID_MODEL,
    ollamaModel: exports.config.ollamaModel
});
/**
 * Updates a configuration value
 * @param key The configuration key to update
 * @param value The new value
 */
function updateConfig(key, value) {
    logger_1.logger.info('Config', `Updating config: ${key}`, { newValue: value });
    exports.config[key] = value;
}
/**
 * Gets the current character mode state
 * @returns Object with characterMode and characterFile
 */
function getCharacterModeState() {
    return {
        enabled: exports.config.characterMode,
        filename: exports.config.characterFile
    };
}
/**
 * Enables character mode with the specified character file
 * @param characterFile The character file to use
 */
function enableCharacterMode(characterFile) {
    updateConfig('characterMode', true);
    updateConfig('characterFile', characterFile);
    logger_1.logger.info('Config', 'Character mode enabled', { characterFile });
}
/**
 * Disables character mode
 */
function disableCharacterMode() {
    updateConfig('characterMode', false);
    logger_1.logger.info('Config', 'Character mode disabled');
}
