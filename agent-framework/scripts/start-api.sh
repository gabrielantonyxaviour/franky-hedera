#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Franky Agent API Server${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}No .env file found. Creating a basic one for you...${NC}"
    cat > .env << EOL
# Basic environment configuration
OPENAI_API_KEY=your_openai_api_key_here
HEDERA_ACCOUNT_ID=your_hedera_account_id_here
HEDERA_PRIVATE_KEY=your_hedera_private_key_here
HEDERA_PUBLIC_KEY=your_hedera_public_key_here
HEDERA_KEY_TYPE=ECDSA
HEDERA_NETWORK=testnet
HEDERA_NETWORK_TYPE=testnet
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
USE_HYBRID_MODEL=true
LOG_LEVEL=0
TEMP_AUTH_PRIVATE_KEY=your_temp_auth_private_key_here
TEST_SERVER_WALLET_KEY=fake_private_key_for_testing
EOL
    echo -e "${YELLOW}Please edit the .env file with your actual credentials${NC}"
    exit 1
fi

# Optional: Check for ngrok if you want to expose the API
if command -v ngrok &> /dev/null; then
    echo -e "${GREEN}Starting ngrok to expose API...${NC}"
    ngrok http 8080 > /dev/null 2>&1 &
    NGROK_PID=$!
    
    # Wait a moment for ngrok to start
    sleep 3
    
    # Get the ngrok URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | head -n1 | cut -d'"' -f4)
    if [ -n "$NGROK_URL" ]; then
        echo -e "${GREEN}Ngrok URL: ${NGROK_URL}${NC}"
    else
        echo -e "${YELLOW}Could not get ngrok URL. Make sure ngrok is properly configured.${NC}"
    fi
fi

# Run the API server
echo -e "${GREEN}Starting API server...${NC}"
npx ts-node --transpile-only tests/character-mcp-api.ts

# Cleanup ngrok if it was started
if [ -n "$NGROK_PID" ]; then
    kill $NGROK_PID
fi 