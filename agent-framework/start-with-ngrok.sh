#!/bin/bash

# Franky - Combined script for SillyTavern with Ollama, ngrok, and wallet creation
# Usage: franky start

# Install all dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"

# Install ethers specifically
echo "📦 Installing ethers v5.5.1..."
npm install ethers@5.5.1
echo "✅ Ethers v5.5.1 installed"

# Function to start SillyTavern with Ollama and ngrok
start_sillytavern() {
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
    node server.js --dataRoot="$PWD/data" --listen --port=8000 --enableCorsProxy --disableCsrf &
    SERVER_PID=$!
    
    # Wait for server to start
    echo "⏳ Waiting for SillyTavern to start..."
    sleep 5
    
    # Now proceed with wallet creation
    create_wallet
}

# Function to create wallet
create_wallet() {
    echo "💰 Starting wallet creation process..."
    
    # Ensure the wallet script exists
    WALLET_SCRIPT="createWalletWithSalt.cjs"
    if [ ! -f "$WALLET_SCRIPT" ]; then
        echo "❌ Wallet script not found: $WALLET_SCRIPT"
        exit 1
    fi

    # Ensure required packages are installed
    if command -v pkg &> /dev/null; then
        echo "📦 Updating packages..."
        pkg update
        pkg install -y nodejs qrencode termux-api jq
    else
        echo "⚠️ pkg command not found. Assuming we're not in Termux environment."
        # Check for required commands
        for cmd in node qrencode jq; do
            if ! command -v $cmd &> /dev/null; then
                echo "❌ Required command not found: $cmd"
                echo "Please install the required packages"
                exit 1
            fi
        done
    fi

    # Generate salt based on device characteristics
    echo "🔑 Generating device-specific salt..."
    
    # Try to get device model
    DEVICE_MODEL=""
    if command -v getprop &> /dev/null; then
        DEVICE_MODEL=$(getprop ro.product.model)
    elif [ -f "/sys/devices/virtual/dmi/id/product_name" ]; then
        DEVICE_MODEL=$(cat /sys/devices/virtual/dmi/id/product_name)
    else
        DEVICE_MODEL=$(uname -n)
    fi
    echo "📱 Device Model: $DEVICE_MODEL"

    # Get RAM info
    RAM=""
    if command -v free &> /dev/null; then
        RAM=$(free -h | awk '/Mem:/ {print $2}')
    else
        RAM="Unknown"
    fi
    echo "🧠 RAM: $RAM"

    # Get storage info
    STORAGE=""
    if command -v df &> /dev/null; then
        STORAGE=$(df -h / | awk '/\// {print $2}')
    else
        STORAGE="Unknown"
    fi
    echo "💾 Storage: $STORAGE"

    # Get CPU info
    CPU="Unknown"
    if [ -f "/proc/cpuinfo" ]; then
        CPU=$(cat /proc/cpuinfo | grep -m 1 "Hardware" | cut -d: -f2 | sed 's/^[[:space:]]*//')
        if [ -z "$CPU" ]; then
            CPU=$(cat /proc/cpuinfo | grep -m 1 "model name" | cut -d: -f2 | sed 's/^[[:space:]]*//')
        fi
    fi
    echo "🔄 CPU: $CPU"

    # Create a deterministic salt from device details
    SALT=$(echo "$DEVICE_MODEL$RAM$STORAGE$CPU" | md5sum | cut -d' ' -f1)
    echo "🧂 Generated Salt: $SALT"

    # Prepare device details string for bytes32 conversion
    DEVICE_BYTES32=$(printf "%s%s%s%s" "$DEVICE_MODEL" "$RAM" "$STORAGE" "$CPU" | xxd -p -c 32 | head -n 1)
    echo "📊 Device Bytes32: $DEVICE_BYTES32"

    # Generate wallet
    echo "💼 Generating wallet..."
    WALLET_OUTPUT=$(node "$WALLET_SCRIPT" "$SALT")

    # Extract wallet details
    WALLET_ADDRESS=$(echo "$WALLET_OUTPUT" | grep "Address:" | cut -d: -f2 | tr -d ' ')
    PRIVATE_KEY=$(echo "$WALLET_OUTPUT" | grep "Private Key:" | cut -d: -f2 | tr -d ' ')
    MNEMONIC=$(echo "$WALLET_OUTPUT" | grep "Mnemonic" | sed -E 's/.*\((12|24) words\): //')

    # Sign the device details bytes32
    echo "✍️ Signing device details..."
    SIGNATURE_OUTPUT=$(node "$WALLET_SCRIPT" "$SALT" --sign "$DEVICE_BYTES32")
    SIGNATURE=$(echo "$SIGNATURE_OUTPUT" | grep "Signature:" | cut -d: -f2 | tr -d ' ')

    # Get ngrok URL if available
    if [ -z "$NGROK_URL" ]; then
        NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o '"public_url":"[^"]*' | cut -d'"' -f4 | head -1)
        if [ -z "$NGROK_URL" ]; then
            NGROK_URL="https://example.ngrok.app"
            echo "⚠️ Could not get ngrok URL, using placeholder"
        fi
    fi

    # URL encode the parameters
    echo "🔄 URL encoding parameters..."
    if command -v jq &> /dev/null; then
        ENCODED_DEVICE_MODEL=$(printf "%s" "$DEVICE_MODEL" | jq -sRr @uri)
        ENCODED_RAM=$(printf "%s" "$RAM" | jq -sRr @uri)
        ENCODED_STORAGE=$(printf "%s" "$STORAGE" | jq -sRr @uri)
        ENCODED_CPU=$(printf "%s" "$CPU" | jq -sRr @uri)
        ENCODED_SIGNATURE=$(printf "%s" "$SIGNATURE" | jq -sRr @uri)
    else
        # Fallback to simple URL encoding
        ENCODED_DEVICE_MODEL=$(printf "%s" "$DEVICE_MODEL" | sed 's/ /%20/g')
        ENCODED_RAM=$(printf "%s" "$RAM" | sed 's/ /%20/g')
        ENCODED_STORAGE=$(printf "%s" "$STORAGE" | sed 's/ /%20/g')
        ENCODED_CPU=$(printf "%s" "$CPU" | sed 's/ /%20/g')
        ENCODED_SIGNATURE=$(printf "%s" "$SIGNATURE" | sed 's/ /%20/g')
    fi

    # Construct the full URL with URL-encoded parameters
    FULL_URL="https://franky-six.vercel.app/deploy-device?deviceModel=${ENCODED_DEVICE_MODEL}&ram=${ENCODED_RAM}&storage=${ENCODED_STORAGE}&cpu=${ENCODED_CPU}&ngrokLink=${NGROK_URL}&walletAddress=${WALLET_ADDRESS}&bytes32Data=${DEVICE_BYTES32}&signature=${ENCODED_SIGNATURE}"

    # Print out all details for verification
    echo "=== Wallet Details ==="
    echo "Salt: $SALT"
    echo "Address: $WALLET_ADDRESS"
    echo "Private Key: $PRIVATE_KEY"
    echo "Mnemonic: $MNEMONIC"
    echo

    echo "=== Device Details ==="
    echo "Device Model: $DEVICE_MODEL"
    echo "RAM: $RAM"
    echo "Storage: $STORAGE"
    echo "CPU: $CPU"
    echo "Bytes32 Data: $DEVICE_BYTES32"
    echo

    echo "=== Signature Details ==="
    echo "Signature: $SIGNATURE"
    echo

    echo "=== Generated URL ==="
    echo "$FULL_URL"
    echo

    # Generate QR Code
    echo "📱 Generating QR code..."
    if command -v qrencode &> /dev/null; then
        qrencode -o qr_code.png -s 10 "$FULL_URL"
        echo "✅ QR code generated: qr_code.png"
        
        # Share the QR code using Termux:API if available
        if command -v termux-share &> /dev/null; then
            echo "📤 Sharing QR code..."
            termux-share qr_code.png
        else
            echo "⚠️ termux-share not available. QR code saved to qr_code.png"
        fi
    else
        echo "❌ qrencode not available. Cannot generate QR code."
    fi
    
    echo "✅ Wallet creation process completed!"
    echo "🚀 SillyTavern is running with Ollama integration and wallet has been created."
    echo "Press Ctrl+C to stop the server when you're done."
    
    # Wait for the server process to complete
    wait $SERVER_PID
}

# Main script logic
case "$1" in
    start)
        start_sillytavern
        ;;
    *)
        echo "Usage: franky start"
        exit 1
        ;;
esac