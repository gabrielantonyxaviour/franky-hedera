# Hedera Character MCP API

This API provides a way to interact with the Hedera Agent Kit in a character-driven conversation mode through an HTTP interface. It combines the power of local LLMs for character responses with OpenAI for blockchain operations.

## Features

- Character-based conversation using local Ollama models
- Blockchain operations using Hedera tools through MCP (Model-Call-Protocol)
- Automatic model fallback detection for Ollama
- Simple REST API for easy integration

## Prerequisites

- Node.js (v16+)
- Ollama installed and running
- At least one Ollama model installed (any model will work)
- Hedera account and private key
- OpenAI API key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1

HEDERA_ACCOUNT_ID=0.0.XXXXXX
HEDERA_PRIVATE_KEY=your_private_key
HEDERA_PUBLIC_KEY=your_public_key
HEDERA_NETWORK_TYPE=testnet

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=your_preferred_model

API_PORT=8080
LOG_LEVEL=0
```

## Starting the API Server

Run the following command to start the API server:

```bash
./scripts/start-api.sh
```

The server will start on port 8080 (or the port specified in the API_PORT environment variable).

## API Endpoints

### Status

Get the current status of the API server.

```
GET /status
```

Response:
```json
{
  "status": "online",
  "ollamaAvailable": true,
  "activeCharacter": "Sherlock Holmes",
  "availableCharacters": ["sherlock.json"]
}
```

### List Characters

Get a list of available characters.

```
GET /characters
```

Response:
```json
{
  "characters": ["sherlock.json"]
}
```

### Select Character

Select a character to interact with.

```
POST /character
```

Request Body:
```json
{
  "characterName": "sherlock"
}
```

Response:
```json
{
  "status": "success",
  "message": "Character \"Sherlock Holmes\" loaded successfully!",
  "greeting": "I observe that you've come to me with an inquiry..."
}
```

### Chat

Send a message to the current character.

```
POST /chat
```

Request Body:
```json
{
  "message": "Hello! How are you today?"
}
```

Response:
```json
{
  "response": "Sherlock Holmes: I perceive your greeting as routine and unremarkable, indicating no urgency or importance in our current interaction. However, I am always prepared for a case that may offer subtle hints of intrigue."
}
```

### Blockchain Operations

For blockchain operations, simply include blockchain-related terms in your message:

```
POST /chat
```

Request Body:
```json
{
  "message": "What is my HBAR balance?"
}
```

Response:
```json
{
  "response": "Blockchain Result: I've checked your HBAR balance. Your account 0.0.XXXXXX currently has 100 HBAR."
}
```

## Adding New Characters

Create a new JSON file in the `characters` directory with the following structure:

```json
{
  "name": "Character Name",
  "description": "Brief description",
  "personality": "Personality traits",
  "scenario": "Background scenario",
  "first_mes": "Initial greeting message",
  "mes_example": "Example of how this character typically responds",
  "creator_notes": "Notes for character creation",
  "system_prompt": "System prompt for the LLM"
}
```

## Troubleshooting

- **Ollama model not found**: The API will automatically try to use available models if your configured model is not found.
- **Blockchain operations not working**: Make sure your Hedera account ID and private key are correctly set in the .env file.
- **API not starting**: Check if the port is already in use. You can change the port by setting the API_PORT environment variable.

## Technical Details

This API is built on top of:
- Express.js for the API server
- Ollama for local LLM inference (for simple greetings only)
- OpenAI for complex conversations and blockchain operations
- Hedera SDK for blockchain operations
- MCP (Model-Call-Protocol) for tool integration with OpenAI

### Request Routing Logic

The API routes requests to different models based on their complexity:

1. **Ollama** (Local LLM) is used ONLY for:
   - Simple greetings (e.g., "Hello", "Hi", "How are you")
   - Very basic interactions under 30 characters

2. **OpenAI** is used for:
   - Anything containing blockchain/Hedera-related terms
   - Complex questions or statements
   - Any request that might require tools
   - As a fallback if Ollama fails

### Response Length

- Ollama responses are limited to 512 characters
- OpenAI responses have no length limitation

## Testing

The API includes a comprehensive test script that demonstrates the routing behavior:

```bash
./scripts/comprehensive-test.sh
```

This script tests different types of queries to verify they are routed to the appropriate model. 