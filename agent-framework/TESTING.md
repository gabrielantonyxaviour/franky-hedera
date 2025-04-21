# Franky Agent Framework Testing Guide

This document provides comprehensive instructions for testing the Franky Agent Framework, ensuring all components work properly together.

## Prerequisites

Before running the tests, make sure you have:

1. A running instance of the Franky Agent Framework server
2. Ollama running locally with the required models
3. A valid test agent setup in the system
4. Credentials configured in `.env.test`

## Test Setup

The testing infrastructure consists of:

- **test-agent-flow.js**: Main test script that tests all components
- **run-tests.sh**: Helper script to run tests with proper environment setup
- **.env.test**: Test environment configuration

### Configuring Test Environment

Edit the `.env.test` file to include proper test credentials:

```
# Test Environment Variables
DEVICE_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
LILYPAD_API_TOKEN=your_lilypad_token_here
```

### Configure Test Agent

For proper testing, you need to:

1. Set up a test agent in the system
2. Update the `TEST_AGENT_ID` and `TEST_API_KEY` in `test-agent-flow.js`

```javascript
// Configuration
const TEST_AGENT_ID = '0x1234567890abcdef1234567890abcdef12345678'; // Replace with actual agent ID
const TEST_API_KEY = 'test_api_key'; // Replace with actual API key
```

## Running the Tests

### Option 1: Using the test runner script

The easiest way to run tests is using the provided script:

```bash
./run-tests.sh
```

The script will:
1. Check if all prerequisites are running
2. Ask for confirmation before proceeding
3. Run the test suite with proper environment setup
4. Display the test results with color-coded output

### Option 2: Manual execution

You can also run the tests manually:

```bash
# Set test environment
NODE_ENV=test node test-agent-flow.js
```

## Test Stages

The test suite runs through several stages:

1. **Agent Data Fetching**: Tests the retrieval of agent data
2. **API Key Validation**: Tests API key authentication
3. **Payment Processing**: Tests TFIL payment handling
4. **Ollama Integration**: Tests response generation with Ollama
5. **Lilypad Integration**: Tests response generation with Lilypad
6. **Chat History Storage**: Tests persistent conversation history
7. **Tool Calls**: Tests tool calling functionality

## Troubleshooting

### Common Issues

#### Test Agent Data Issues
- Make sure the test agent exists and has the proper configuration
- Check that the agent ID and API key are correct in the test script

#### Ollama Connection Issues
- Verify Ollama is running with `curl http://127.0.0.1:11434/api/version`
- Make sure required models are pulled with `ollama list`

#### Payment Testing Issues
- The test environment simulates both successful and failed payments
- No actual TFIL transfers occur during testing

## Modifying Tests

To add or modify tests:

1. Edit the test function in `test-agent-flow.js`
2. Add new test functions following the same pattern as existing ones
3. Add the new test function to the `runAllTests()` function

Example of adding a new test:

```javascript
async function testNewFeature() {
  console.log(`\n=== TEST STAGE ${currentStage}: New Feature ===`);
  
  try {
    // Test implementation here
    // ...
    
    await logTestResult('New feature test', true);
  } catch (error) {
    await logTestResult('New feature test', false, error.message);
  } finally {
    currentStage++;
  }
}

// Then add to runAllTests:
async function runAllTests() {
  // ...existing code
  await testNewFeature(); // Add your new test here
  // ...existing code
}
```

## Special Test Modes

The test infrastructure supports special test modes via headers:

- `x-test-mode: insufficient_balance`: Simulates insufficient TFIL balance
- `x-test-mode: sufficient_balance`: Simulates successful payment 

These modes allow testing payment flows without actual blockchain transactions. 