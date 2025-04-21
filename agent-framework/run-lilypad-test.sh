#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Franky Agent Framework - Lilypad Integration Test ===${NC}"
echo "Starting Lilypad test..."

# Check if .env.test exists and copy it to .env for testing
if [ -f ".env.test" ]; then
  echo -e "${GREEN}✓${NC} Found .env.test file"
  cp .env.test .env
  echo -e "${GREEN}✓${NC} Copied .env.test to .env for testing"
else
  echo -e "${RED}✗${NC} .env.test file not found. Please create it first with your Lilypad API token."
  echo "The file should contain: LILYPAD_API_TOKEN=your_token_here"
  exit 1
fi

# Run the test script
echo -e "\n${GREEN}=== Running Lilypad Tests ===${NC}"
echo "Using Node.js to run the test script..."
node lilypad-test.js

# Check the result
if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}=== All Lilypad Tests Completed ===${NC}"
else
  echo -e "\n${RED}=== Some Lilypad Tests Failed. Please check the output above. ===${NC}"
fi

echo "Test run complete."

# Restore original .env if it existed
if [ -f ".env.backup" ]; then
  mv .env.backup .env
  echo -e "${GREEN}✓${NC} Restored original .env file"
fi

exit 0 