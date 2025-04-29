#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default settings
API_PORT=8080
API_HOST="0.0.0.0"  # Bind to all interfaces by default
USE_NGROK=true

# Parse command line arguments
while getopts "p:h:n" opt; do
  case $opt in
    p) API_PORT=$OPTARG ;;
    h) API_HOST=$OPTARG ;;
    n) USE_NGROK=false ;;
    *) 
      echo -e "${RED}Invalid option: -$OPTARG${NC}" 
      echo "Usage: $0 [-p port] [-h host] [-n]"
      echo "  -p port: Specify the port to use (default: 8080)"
      echo "  -h host: Specify the host address to bind to (default: 0.0.0.0)"
      echo "  -n: Do not start ngrok"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}Starting Franky Agent API Server on ${API_HOST}:${API_PORT}${NC}"

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
TEST_SERVER_WALLET_KEY=fake_private_key_for_testing
API_PORT=${API_PORT}
API_HOST=${API_HOST}
EOL
    echo -e "${YELLOW}Please edit the .env file with your actual credentials${NC}"
    exit 1
fi

# Add API_PORT and API_HOST to .env if they don't exist
if ! grep -q "API_PORT" .env; then
    echo -e "\nAPI_PORT=${API_PORT}" >> .env
    echo -e "${YELLOW}Added API_PORT=${API_PORT} to .env${NC}"
fi

if ! grep -q "API_HOST" .env; then
    echo -e "\nAPI_HOST=${API_HOST}" >> .env
    echo -e "${YELLOW}Added API_HOST=${API_HOST} to .env${NC}"
fi

# Function to handle cleanup
cleanup() {
    echo -e "\n${YELLOW}Shutting down server...${NC}"
    if [ -n "$NGROK_PID" ]; then
        echo "Stopping ngrok (PID: $NGROK_PID)"
        kill $NGROK_PID
    fi
    exit 0
}

# Set up trap to catch Ctrl+C and other signals
trap cleanup SIGINT SIGTERM

# Optional: Check for ngrok if you want to expose the API
NGROK_PID=""
if $USE_NGROK && command -v ngrok &> /dev/null; then
    echo -e "${GREEN}Starting ngrok to expose API...${NC}"
    ngrok http ${API_PORT} > /dev/null 2>&1 &
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
elif $USE_NGROK; then
    echo -e "${YELLOW}ngrok not found. API will not be exposed externally.${NC}"
    echo -e "${YELLOW}Install ngrok with 'npm install -g ngrok' or download from https://ngrok.com${NC}"
fi

# Run the API server
echo -e "${GREEN}Starting API server on ${API_HOST}:${API_PORT}...${NC}"
API_PORT=${API_PORT} API_HOST=${API_HOST} npx ts-node --transpile-only tests/character-mcp-api.ts

# This part will only execute if the server exits normally
cleanup 