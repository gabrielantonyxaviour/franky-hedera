#!/bin/bash

API_URL="http://localhost:8080"

# Test if the API is up
echo "Testing API status..."
curl -s $API_URL/status | jq .

# List available characters
echo -e "\nListing available characters..."
curl -s $API_URL/characters | jq .

# Test 1: Simple greeting (should use Ollama)
echo -e "\n[TEST 1] Simple greeting (should use Ollama)..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello there!"}' \
  $API_URL/chat | jq .

# Test 2: Complex greeting (should route to OpenAI)
echo -e "\n[TEST 2] Complex greeting (should route to OpenAI)..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello there! I was wondering if you could help me understand something about blockchain technology."}' \
  $API_URL/chat | jq .

# Test 3: Direct Hedera term mention (should route to OpenAI)
echo -e "\n[TEST 3] Direct Hedera term mention (should route to OpenAI)..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"What is HBAR?"}' \
  $API_URL/chat | jq .

# Test 4: Complex question without blockchain terms (should route to OpenAI)
echo -e "\n[TEST 4] Complex question without blockchain terms (should route to OpenAI)..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"Could you explain how deductive reasoning works in solving crimes?"}' \
  $API_URL/chat | jq .

# Test 5: Blockchain operation (should route to OpenAI)
echo -e "\n[TEST 5] Blockchain operation (should route to OpenAI)..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"What is my HBAR balance?"}' \
  $API_URL/chat | jq .

# Test 6: Check for response length limit
echo -e "\n[TEST 6] Check for response length limit..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi"}' \
  $API_URL/chat | jq '.response | length' 