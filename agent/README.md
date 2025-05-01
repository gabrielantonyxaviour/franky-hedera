# Hedera Agent with MCP Server and OpenAI Integration

This project implements a Model-Context-Protocol (MCP) server that enables OpenAI models to interact with Hedera blockchain tools.

## Overview

The implementation follows the MCP architecture:

1. **MCP Server**: An Express.js server that exposes tool functionality via REST API
2. **OpenAI Client**: A client that generates tool calls and processes responses
3. **HederaAgentKit**: A simple SDK wrapper for Hedera operations
4. **Tools**: LangChain-compatible tools for Hedera operations

## Features

- **Simple Addition Tool**: Demo tool that adds two numbers
- **OpenAI Integration**: Uses standard OpenAI models to generate tool calls
- **Tool Call Extraction**: Parses standard text responses to extract tool calls
- **Interactive CLI**: Chat interface for direct interaction with the agent
- **Conversation Memory**: Maintains context between message exchanges
- **Context-Aware Responses**: The agent remembers previous interactions and can refer back to them

## Getting Started

### Prerequisites

1. Node.js (v16 or higher)
2. A Hedera testnet account with account ID and private key
3. An OpenAI API key

### Installation

1. Install dependencies:

```bash
cd agent
npm install
```

2. Make sure your `.env` file is configured with the required environment variables:

```ini
HEDERA_ACCOUNT_ID=0.0.XXXXX
HEDERA_PRIVATE_KEY=XXXXX
HEDERA_NETWORK=testnet
HEDERA_NETWORK_TYPE=testnet
OPENAI_API_KEY=sk-XXXXX
MCP_SERVER_PORT=3000
OPENAI_MODEL=gpt-3.5-turbo
```

### Running the MCP Server

Run the full MCP server with OpenAI integration:

```bash
node index.js
```

This will:
1. Initialize the HederaAgentKit
2. Create the MCP server with available tools
3. Start the server on the configured port
4. Start an interactive chat session

### Usage Examples

When the chat interface starts, you can interact with it directly:

1. **Adding Numbers**:
   ```
   You: Add 5 and 7
   ```

2. **Context Memory**:
   ```
   You: My name is Alice
   Assistant: Nice to meet you, Alice!
   
   You: What's my name?
   Assistant: Your name is Alice.
   ```

3. **Special Commands**:
   ```
   You: clear
   ```
   This clears the conversation history.
   
   ```
   You: exit
   ```
   This exits the chat.

## Architecture

The implementation consists of several key components:

1. **hedera-agent-kit.js**: Simple SDK wrapper for Hedera operations
2. **tools.js**: Defines LangChain-compatible tools
3. **mcp-adapter.js**: Converts tools to MCP-compatible format
4. **mcp-server.js**: Express server exposing tool endpoints
5. **mcp-openai.js**: OpenAI client for generating and processing tool calls
6. **index.js**: Main entry point and chat interface

## Extending

To add new tools:

1. Add new methods to `HederaAgentKit` class
2. Create a new tool class in `tools.js`
3. Add the tool to the `createHederaTools` function

## License

This project is licensed under the MIT License. 