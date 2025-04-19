// Custom SillyTavern startup script with Ollama API proxy
import fs from 'node:fs';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration settings
const OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'mario:latest'; // Updated to match your available model
const SERVER_PORT = 8000;
const DATA_DIR = join(__dirname, 'data'); // Define the data directory path

// Create necessary directories
function ensureDirectoriesExist() {
  // Create main data directory if it doesn't exist
  if (!fs.existsSync(DATA_DIR)) {
    console.log('📁 Creating data directory...');
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // Create other required subdirectories
  const requiredDirs = [
    join(DATA_DIR, 'user'),
    join(DATA_DIR, 'avatars'),
    join(DATA_DIR, 'backgrounds'),
    join(DATA_DIR, 'characters'),
    join(DATA_DIR, 'chats'),
    join(DATA_DIR, 'groups'),
    join(DATA_DIR, 'world_info'),
    join(DATA_DIR, 'themes')
  ];
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      console.log(`📁 Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  console.log('✅ Data directories verified');
}

// First, check if Ollama is running
async function checkOllamaRunning() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Ollama is running with ${data.models.length} models available`);
      
      // Check if the default model is available
      const modelExists = data.models.some(model => model.name === DEFAULT_MODEL);
      if (!modelExists) {
        console.warn(`⚠️ Default model '${DEFAULT_MODEL}' not found in Ollama. Available models: ${data.models.map(m => m.name).join(', ')}`);
        
        // If we have at least one model, use the first one
        if (data.models.length > 0) {
          console.log(`ℹ️ Using '${data.models[0].name}' as the default model instead`);
          
          // Update the config.yaml file with the available model
          const configPath = join(__dirname, 'config.yaml');
          let configContent = fs.readFileSync(configPath, 'utf8');
          configContent = configContent.replace(/default_model: ".*"/, `default_model: "${data.models[0].name}"`);
          fs.writeFileSync(configPath, configContent);
        }
      }
      return true;
    }
  } catch (err) {
    console.error('❌ Ollama is not running or not accessible at', OLLAMA_URL);
    return false;
  }
}

// Create a proxy API endpoint file for external access
function createProxyEndpoint() {
  const proxyFilePath = join(__dirname, 'src', 'endpoints', 'ollama-proxy.js');
  
  const proxyCode = `
import express from 'express';
import { trimV1 } from '../util.js';

export const router = express.Router();

// This endpoint allows external access to Ollama through SillyTavern
router.post('/generate', async (request, response) => {
  try {
    const ollamaUrl = 'http://127.0.0.1:11434';
    
    // Forward the request to Ollama
    const ollamaResponse = await fetch(\`\${ollamaUrl}/api/generate\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('Ollama proxy error:', ollamaResponse.status, errorText);
      return response.status(ollamaResponse.status).send(errorText);
    }
    
    // Return the Ollama response
    const data = await ollamaResponse.json();
    return response.send(data);
  } catch (error) {
    console.error('Ollama proxy error:', error);
    return response.status(500).send({ error: error.message });
  }
});

// Get available models
router.get('/models', async (request, response) => {
  try {
    const ollamaUrl = 'http://127.0.0.1:11434';
    
    const ollamaResponse = await fetch(\`\${ollamaUrl}/api/tags\`);
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('Ollama models error:', ollamaResponse.status, errorText);
      return response.status(ollamaResponse.status).send(errorText);
    }
    
    const data = await ollamaResponse.json();
    return response.send(data);
  } catch (error) {
    console.error('Ollama models error:', error);
    return response.status(500).send({ error: error.message });
  }
});
`;

  fs.writeFileSync(proxyFilePath, proxyCode);
  console.log('✅ Created Ollama proxy endpoint for external access');
}

// Update server.js to register the new endpoint
function updateServerConfig() {
  const serverStartupPath = join(__dirname, 'src', 'server-startup.js');
  let content = fs.readFileSync(serverStartupPath, 'utf8');
  
  // Check if our import is already added
  if (!content.includes('import { router as ollamaProxyRouter }')) {
    // Find the imports section
    const importMatch = content.match(/import.*from '\.\/endpoints\/.*\.js';/g);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      const newImport = lastImport + '\nimport { router as ollamaProxyRouter } from \'./endpoints/ollama-proxy.js\';';
      content = content.replace(lastImport, newImport);
    }
    
    // Find where endpoints are set up
    if (content.includes('app.use(\'/api/')) {
      // Add our new route after the last API route
      const routeMatch = content.match(/app\.use\('\/api\/.*',.*Router\);/g);
      if (routeMatch) {
        const lastRoute = routeMatch[routeMatch.length - 1];
        const newRoute = lastRoute + '\n    app.use(\'/api/ollama-proxy\', ollamaProxyRouter);';
        content = content.replace(lastRoute, newRoute);
      }
    }
    
    fs.writeFileSync(serverStartupPath, content);
    console.log('✅ Updated server configuration to include the proxy endpoint');
  } else {
    console.log('ℹ️ Server already configured with Ollama proxy');
  }
}

async function main() {
  console.log('🚀 Starting SillyTavern with Ollama integration...');
  
  // Ensure the data directory exists
  ensureDirectoriesExist();
  
  const ollamaRunning = await checkOllamaRunning();
  if (!ollamaRunning) {
    console.error('❌ Please start Ollama before running this script');
    process.exit(1);
  }
  
  // Create the proxy endpoint
  createProxyEndpoint();
  
  // Update server configuration
  updateServerConfig();
  
  // Update the example with your actual available model
  const exampleModel = DEFAULT_MODEL;
  
  console.log(`✅ Configuration complete! Starting SillyTavern on port ${SERVER_PORT}...`);
  console.log(`📝 API endpoint for Postman: http://localhost:${SERVER_PORT}/api/ollama-proxy/generate`);
  console.log('📌 Example POST request body:');
  console.log(JSON.stringify({
    model: exampleModel,
    prompt: "What is the capital of France?",
    stream: false
  }, null, 2));
  
  // Start the server with the explicit data root path
  const serverCmd = `node server.js --dataRoot="${DATA_DIR}"`;
  console.log(`🖥️ Running command: ${serverCmd}`);
  
  const serverProcess = exec(serverCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    console.log(`stdout: ${stdout}`);
  });
  
  // Forward stdout and stderr to console
  if (serverProcess && serverProcess.stdout) {
    serverProcess.stdout.on('data', (data) => {
      console.log(data);
    });
  }
  
  if (serverProcess && serverProcess.stderr) {
    serverProcess.stderr.on('data', (data) => {
      console.error(data);
    });
  }
}

main(); 