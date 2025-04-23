#!/bin/bash

# Load environment variables
if [ -f .env ]; then
  echo "Loading environment from .env file"
  export $(cat .env | grep -v '^#' | xargs)
fi

# Set default API port if not set
if [ -z "$API_PORT" ]; then
  export API_PORT=8080
  echo "Setting default API_PORT=8080"
fi

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
  echo "ngrok is not installed. Please install it first:"
  echo "  - Using Homebrew (macOS): brew install ngrok"
  echo "  - Using npm: npm install -g ngrok"
  echo "  - Or download from https://ngrok.com/download"
  echo "Starting API server without ngrok..."
  npx ts-node --transpile-only tests/character-mcp-api.ts
  exit 0
fi

# Check if ngrok is authenticated
if ! ngrok config check &> /dev/null; then
  echo "ngrok is not authenticated. Please run 'ngrok config add-authtoken YOUR_TOKEN' first."
  echo "You can get your authtoken at https://dashboard.ngrok.com/get-started/your-authtoken"
  echo "Starting API server without ngrok..."
  npx ts-node --transpile-only tests/character-mcp-api.ts
  exit 0
fi

# Check if jq is installed (needed for parsing JSON)
if ! command -v jq &> /dev/null; then
  echo "jq is not installed. We'll use a simpler method to extract the ngrok URL."
  JQ_INSTALLED=false
else
  JQ_INSTALLED=true
fi

# Function to handle script termination
cleanup() {
  echo "Shutting down API server and ngrok..."
  if [ -n "$NGROK_PID" ]; then
    kill $NGROK_PID 2>/dev/null
  fi
  if [ -n "$API_PID" ]; then
    kill $API_PID 2>/dev/null
  fi
  exit 0
}

# Set up trap to catch termination signals
trap cleanup SIGINT SIGTERM

# Start the API server in the background
echo "Starting API server with ts-node..."
npx ts-node --transpile-only tests/character-mcp-api.ts > api_server.log 2>&1 &
API_PID=$!

# Wait for API server to start and verify it's running
check_api_running() {
  local retries=0
  local max_retries=10
  local wait_time=1
  local success=false
  
  echo "Waiting for API server to start..."
  
  while [ $retries -lt $max_retries ]; do
    # Check if process is still running
    if ! ps -p $API_PID > /dev/null; then
      echo "API server process terminated unexpectedly. Check api_server.log for details."
      cat api_server.log
      cleanup
      exit 1
    fi
    
    # Try to connect to the API
    if curl -s http://localhost:$API_PORT/status > /dev/null 2>&1; then
      echo "API server is up and running on port $API_PORT!"
      success=true
      break
    fi
    
    retries=$((retries+1))
    echo "Waiting for API server to start (attempt $retries/$max_retries)..."
    sleep $wait_time
  done
  
  if [ "$success" = false ]; then
    echo "API server did not start properly after $max_retries attempts."
    echo "Last few lines of the log:"
    tail -n 20 api_server.log
    cleanup
    exit 1
  fi
}

check_api_running

# Start ngrok in the background
echo "Starting ngrok tunnel to port $API_PORT..."
ngrok http $API_PORT > /dev/null 2>&1 &
NGROK_PID=$!

# Extract and display the ngrok URL from the ngrok API
extract_ngrok_url() {
  local retries=0
  local max_retries=5
  local wait_time=2
  
  while [ $retries -lt $max_retries ]; do
    echo "Fetching ngrok public URL (attempt $((retries+1))/$max_retries)..."
    
    if [ "$JQ_INSTALLED" = true ]; then
      # Use jq for better JSON parsing if available
      NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
    else
      # Fallback without jq
      NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | head -n1 | cut -d'"' -f4)
    fi
    
    if [ -n "$NGROK_URL" ] && [ "$NGROK_URL" != "null" ]; then
      return 0
    fi
    
    retries=$((retries+1))
    sleep $wait_time
  done
  
  return 1
}

extract_ngrok_url
if [ -n "$NGROK_URL" ] && [ "$NGROK_URL" != "null" ]; then
  echo "==================================================="
  echo "🚀 Hedera Character API is now LIVE!"
  echo "Public URL: $NGROK_URL"
  echo "Local URL:  http://localhost:$API_PORT"
  echo "==================================================="
  
  # Log URLs to a file for reference
  echo "$(date): $NGROK_URL" >> ngrok_urls.log
  
  # Print some helpful info
  echo "Available API endpoints:"
  echo "  - Status:     $NGROK_URL/status"
  echo "  - Characters: $NGROK_URL/characters"
  echo "  - Chat:       $NGROK_URL/chat (POST)"
else
  echo "Could not determine ngrok URL. Make sure ngrok is running properly."
  echo "You can check ngrok status at http://localhost:4040/"
  echo "The API is still running locally at http://localhost:$API_PORT"
fi

# Keep running until user terminates
echo "Press Ctrl+C to stop the server"
wait $API_PID
cleanup 