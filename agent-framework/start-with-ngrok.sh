#!/bin/bash

# Startup script for SillyTavern with Ollama and ngrok support
echo "🚀 Starting SillyTavern with Ollama and ngrok support..."

# Create data directory if it doesn't exist
mkdir -p data
mkdir -p data/user
mkdir -p data/characters
mkdir -p data/chats
mkdir -p data/groups
mkdir -p data/themes

# Check if Ollama is already running
if curl -s http://127.0.0.1:11434/api/tags > /dev/null; then
    echo "✅ Ollama server is running"
else
    echo "❌ Ollama is not running. Starting Ollama..."
    # Start Ollama in the background
    ollama serve > ollama.log 2>&1 &
    
    # Wait for Ollama to start
    for i in {1..10}; do
        if curl -s http://127.0.0.1:11434/api/tags > /dev/null; then
            echo "✅ Ollama server started successfully"
            break
        else
            echo "⏳ Waiting for Ollama to start... ($i/10)"
            sleep 2
            
            if [ $i -eq 10 ]; then
                echo "❌ Failed to start Ollama after multiple attempts"
                exit 1
            fi
        fi
    done
fi

# Get available models from Ollama
MODELS=$(curl -s http://127.0.0.1:11434/api/tags | grep -o '"name":"[^"]*' | cut -d'"' -f4 | tr '\n' ', ')
echo "📋 Available models: $MODELS"

# Check if the ollama-proxy.js file exists
if [ ! -f "src/endpoints/ollama-proxy.js" ]; then
    echo "⚠️ ollama-proxy.js file not found. Creating it..."
    
    # Create the directory if it doesn't exist
    mkdir -p src/endpoints
    
    # Create the ollama-proxy.js file
    cat > src/endpoints/ollama-proxy.js << 'EOL'
import express from 'express';
import { trimV1 } from '../util.js';

export const router = express.Router();

// This endpoint allows external access to Ollama through SillyTavern
router.post('/generate', async (request, response) => {
  try {
    console.log('⚡ Received generate request:', request.body);
    const ollamaUrl = 'http://127.0.0.1:11434';
    
    // Forward the request to Ollama
    const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('❌ Ollama proxy error:', ollamaResponse.status, errorText);
      return response.status(ollamaResponse.status).send(errorText);
    }
    
    // Return the Ollama response
    const data = await ollamaResponse.json();
    console.log('✅ Ollama generate response received');
    return response.send(data);
  } catch (error) {
    console.error('❌ Ollama proxy error:', error);
    return response.status(500).send({ error: error.message });
  }
});

// Get available models
router.get('/models', async (request, response) => {
  try {
    console.log('⚡ Received models request');
    const ollamaUrl = 'http://127.0.0.1:11434';
    
    const ollamaResponse = await fetch(`${ollamaUrl}/api/tags`);
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('❌ Ollama models error:', ollamaResponse.status, errorText);
      return response.status(ollamaResponse.status).send(errorText);
    }
    
    const data = await ollamaResponse.json();
    console.log('✅ Ollama models response received');
    return response.send(data);
  } catch (error) {
    console.error('❌ Ollama models error:', error);
    return response.status(500).send({ error: error.message });
  }
});
EOL
    echo "✅ Created ollama-proxy.js"
fi

# Update server-startup.js to include our ollama-proxy endpoint
if ! grep -q "ollamaProxyRouter" src/server-startup.js; then
    echo "⚠️ ollamaProxyRouter not found in server-startup.js. Adding it..."
    
    # Add the import
    sed -i "1s|^|import { router as ollamaProxyRouter } from './endpoints/ollama-proxy.js';\n|" src/server-startup.js
    
    # Add the endpoint registration
    sed -i "/app\.use('\/api\/azure', azureRouter);/a \ \ \ \ app.use('/api/ollama-proxy', ollamaProxyRouter);" src/server-startup.js
    
    echo "✅ Updated server-startup.js"
fi

# Get device IP for external access
IP=$(ip addr show | grep -E "inet .* scope global" | grep -oE "([0-9]{1,3}\.){3}[0-9]{1,3}" | head -1)
echo "🌐 Local device IP: $IP"

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "⚠️ ngrok is not installed or not in PATH"
    echo "Please install ngrok or make sure it's in your PATH"
else
    # Start ngrok in a new terminal if it's not already running
    if ! curl -s http://127.0.0.1:4040/api/tunnels > /dev/null; then
        echo "🔄 Starting ngrok tunnel for port 8000..."
        ngrok http 8000 > ngrok.log 2>&1 &
        
        # Wait for ngrok to start
        sleep 5
        
        # Get the ngrok URL
        NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o '"public_url":"[^"]*' | cut -d'"' -f4 | head -1)
        if [ -n "$NGROK_URL" ]; then
            echo "🌍 ngrok tunnel URL: $NGROK_URL"
            echo "📝 API endpoint for Postman: $NGROK_URL/api/ollama-proxy/generate"
        else
            echo "⚠️ Could not get ngrok URL. Is ngrok running properly?"
        fi
    else
        # Get the ngrok URL if it's already running
        NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o '"public_url":"[^"]*' | cut -d'"' -f4 | head -1)
        if [ -n "$NGROK_URL" ]; then
            echo "🌍 ngrok tunnel already running at: $NGROK_URL"
            echo "📝 API endpoint for Postman: $NGROK_URL/api/ollama-proxy/generate"
        else
            echo "⚠️ ngrok is running but could not get URL"
        fi
    fi
fi

echo "----------------------------"
echo "📌 Example POST request body:"
echo '{
  "model": "'$(echo $MODELS | cut -d',' -f1)'",
  "prompt": "What is the capital of France?",
  "stream": false
}'
echo "----------------------------"

# Start SillyTavern with explicit data path and CORS disabled
echo "🧩 Starting SillyTavern..."
node server.js --dataRoot="$PWD/data" --listen --port=8000 --enableCorsProxy --disableCsrf

# Note: The server will keep running in the foreground.
# Press Ctrl+C to stop it. 