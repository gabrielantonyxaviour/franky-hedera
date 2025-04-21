#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Franky Agent Framework Test Runner ===${NC}"
echo "Starting test sequence..."

# Check if .env.test exists and copy it to .env for testing
if [ -f ".env.test" ]; then
  echo -e "${GREEN}✓${NC} Found .env.test file"
  cp .env.test .env
  echo -e "${GREEN}✓${NC} Copied .env.test to .env for testing"
else
  echo -e "${RED}✗${NC} .env.test file not found. Please create it first."
  exit 1
fi

# Check if Ollama is running
echo "Checking if Ollama is running..."
curl -s http://localhost:11434/api/tags > /dev/null
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Ollama is running"
else
  echo -e "${YELLOW}!${NC} Ollama is not running. Some tests might fail."
fi

# Run the test script
echo -e "\n${GREEN}=== Running Tests ===${NC}"
echo "Using Node.js to run the test script..."
node test-flow.js

# Check the result
if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}=== All Tests Passed ===${NC}"
else
  echo -e "\n${RED}=== Some Tests Failed. Please check the output above. ===${NC}"
fi

echo "Test run complete."

# Restore original .env if it existed
if [ -f ".env.backup" ]; then
  mv .env.backup .env
  echo -e "${GREEN}✓${NC} Restored original .env file"
fi

exit 0 