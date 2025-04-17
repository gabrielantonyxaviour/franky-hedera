#!/bin/bash

# Termux startup script for SillyTavern with Ollama
# Make this script executable with: chmod +x start-termux.sh

echo "🚀 Starting SillyTavern with Ollama integration in Termux..."

# Create a directory for Ollama data if it doesn't exist
OLLAMA_HOME="$HOME/.ollama"
if [ ! -d "$OLLAMA_HOME" ]; then
    mkdir -p "$OLLAMA_HOME"
    echo "✅ Created Ollama home directory: $OLLAMA_HOME"
fi

# Check if Ollama is already running
if pgrep -x "ollama" > /dev/null; then
    echo "✅ Ollama is already running"
else
    echo "📦 Starting Ollama server..."
    # Start Ollama in the background
    ollama serve > ollama.log 2>&1 &
    OLLAMA_PID=$!
    echo "🔄 Waiting for Ollama to initialize (this may take a moment)..."
    sleep 5
fi

# Check if Ollama is running properly
for i in {1..5}; do
    if curl -s http://127.0.0.1:11434/api/tags > /dev/null; then
        echo "✅ Ollama server is running at http://127.0.0.1:11434"
        break
    else
        echo "⏳ Waiting for Ollama server to start... ($i/5)"
        sleep 3
        if [ $i -eq 5 ]; then
            echo "❌ Failed to start Ollama server after multiple attempts"
            # Don't exit as SillyTavern will handle this error
        fi
    fi
done

# Get the IP address for accessing from other devices
DEVICE_IP=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)
if [ -z "$DEVICE_IP" ]; then
    # Try alternative method in case ifconfig is not available
    DEVICE_IP=$(ip addr show 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)
fi

# If we still don't have an IP, use localhost
if [ -z "$DEVICE_IP" ]; then
    DEVICE_IP="localhost"
fi

echo "🌐 Your device IP is: $DEVICE_IP (use this for Postman requests from other devices)"

# Start SillyTavern with our custom script
echo "🧩 Starting SillyTavern with Ollama integration..."
node start-ollama-proxy.js

# When SillyTavern exits, ask if we should shut down Ollama too
read -p "❓ Do you want to shut down Ollama server? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pkill -f ollama
    echo "✅ Ollama server has been shut down"
else
    echo "ℹ️ Ollama server is still running"
fi

echo "👋 Exiting..." 