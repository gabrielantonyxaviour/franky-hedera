import { isOllamaAvailable, queryOllama } from '../src/utils/ollama-client';
import { logger, LogLevel } from '../src/utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

// Set log level to DEBUG
logger.setLogLevel(LogLevel.DEBUG);

async function testOllama() {
  console.log('Testing Ollama connectivity...');
  
  // Check if Ollama is available
  const available = await isOllamaAvailable();
  
  if (!available) {
    console.log('❌ Ollama is not available. Make sure it\'s running at', 
      process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434');
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
    const response = await queryOllama('What is Hedera Hashgraph?');
    console.log('\nOllama response:');
    console.log('---------------');
    console.log(response);
    console.log('---------------');
    console.log('✅ Ollama query test successful!');
  } catch (error) {
    console.log('❌ Error querying Ollama:', error);
  }
}

testOllama().catch(console.error); 