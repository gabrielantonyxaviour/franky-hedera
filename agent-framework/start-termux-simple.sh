#!/bin/bash

# Simplified startup script for Termux
echo "🚀 Starting SillyTavern with Ollama in Termux..."

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

# Get device IP for external access
IP=$(ip addr show | grep -E "inet .* scope global" | grep -oE "([0-9]{1,3}\.){3}[0-9]{1,3}" | head -1)
echo "🌐 Device IP: $IP (use this for Postman)"

# Start SillyTavern with explicit data path
echo "🧩 Starting SillyTavern..."
node server.js --dataRoot="$PWD/data" --listen --port=8000 --enableCorsProxy

# Note: The server will keep running in the foreground.
# Press Ctrl+C to stop it. 