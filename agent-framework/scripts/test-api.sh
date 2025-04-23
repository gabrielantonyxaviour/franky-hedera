#!/bin/bash

API_URL="http://localhost:8080"

# Test if the API is up
echo "Testing API status..."
curl -s $API_URL/status | jq .

# List available characters
echo -e "\nListing available characters..."
curl -s $API_URL/characters | jq .

# Send a general chat message
echo -e "\nSending a general message..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello! How are you today?"}' \
  $API_URL/chat | jq .

# Send a blockchain-related message
echo -e "\nSending a blockchain-related message..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"What is my HBAR balance?"}' \
  $API_URL/chat | jq . 