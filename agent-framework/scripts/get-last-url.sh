#!/bin/bash

# Check if the log file exists
if [ ! -f "ngrok_urls.log" ]; then
  echo "No ngrok URLs have been logged yet."
  echo "Run './scripts/start-api.sh' to start the API with ngrok."
  exit 1
fi

# Get the last URL from the log file
LAST_URL=$(tail -n 1 ngrok_urls.log)

echo "Last ngrok URL:"
echo "$LAST_URL"

# Extract just the URL part
URL_ONLY=$(echo "$LAST_URL" | awk '{print $2}')

echo ""
echo "Available API endpoints:"
echo "  - Status:     $URL_ONLY/status"
echo "  - Characters: $URL_ONLY/characters" 
echo "  - Chat:       $URL_ONLY/chat (POST)" 