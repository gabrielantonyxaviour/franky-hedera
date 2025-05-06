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
const ollama_client_1 = require("../src/utils/ollama-client");
const logger_1 = require("../src/utils/logger");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Set log level to DEBUG
logger_1.logger.setLogLevel(logger_1.LogLevel.DEBUG);
async function testOllama() {
    console.log('Testing Ollama connectivity...');
    // Check if Ollama is available
    const available = await (0, ollama_client_1.isOllamaAvailable)();
    if (!available) {
        console.log('❌ Ollama is not available. Make sure it\'s running at', process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434');
        console.log('Troubleshooting tips:');
        console.log('1. Make sure Ollama is installed and running');
        console.log('2. Verify the model has been pulled: ollama pull qwen2.5:14b (or your selected model)');
        console.log('3. Check if the URL is correct in your .env file');
        console.log('4. Ensure no firewall is blocking the connection');
        return;
    }
    console.log('✅ Ollama is available!');
    // Test a query
    try {
        console.log('Testing Ollama query...');
        const response = await (0, ollama_client_1.queryOllama)('What is Hedera Hashgraph?');
        console.log('\nOllama response:');
        console.log('---------------');
        console.log(response);
        console.log('---------------');
        console.log('✅ Ollama query test successful!');
    }
    catch (error) {
        console.log('❌ Error querying Ollama:', error);
    }
}
testOllama().catch(console.error);
