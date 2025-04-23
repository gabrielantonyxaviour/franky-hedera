# Hedera Agent Kit

Welcome to the **Hedera Agent Kit**! This project aims to provide a LangChain-compatible toolkit for interacting with the Hedera Network. The focus is on a minimal, easy-to-use set of functions, while staying flexible for future enhancements.

## Overview

- **Agent Interaction**: Make on-chain calls to Hedera (e.g., create tokens, post messages to consensus).
- **Lightweight**: Designed to get you started quickly with a minimal set of features.
- **Community-Driven**: We encourage developers of all skill levels to contribute.

## Current Features

1. **Native Hedera Token Service (HTS)**:
    - Create fungible tokens with minimal parameters (name, symbol, decimals, supply, etc.).
    - Mint additional tokens to existing token accounts.

2. **Token Operations**:
    - **Create Fungible Tokens (FT)**: Easily create and configure new fungible tokens.
    - **Create Non-fungible Tokens (NFT)**: Easily create and configure new non-fungible tokens.
    - **Transfer Tokens**: Transfer tokens between accounts.
    - **Associate / Dissociate Tokens**: Associate a token to an account or dissociate it as needed.
    - **Reject Tokens**: Reject a token from an account.

3. **HBAR Transactions**:
    - Transfer HBAR between accounts.

4. **Airdrop Management**:
    - Airdrop tokens to multiple recipients.
    - Claim a pending airdrop.

5. **Token Balance Queries**:
    - Get HBAR balances of an account.
    - Get HTS token balances for a specific token ID.
    - Retrieve all token balances for an account.
    - Get token holders for a specific token.

6. **Topic Management (HCS)**:
    - **Create Topics**: Create new topics for Hedera Consensus Service (HCS).
    - **Delete Topics**: Delete an existing topic.
    - **Submit Topic Messages**: Send messages to a specific topic.
    - **Get Topic Info**: Retrieve information about a specific topic.
    - **Get Topic Messages**: Fetch messages from a specific topic.

### Note
The methods in the HederaAgentKit class are fully implemented and functional for interacting with the Hedera network (e.g., creating tokens, transferring assets, managing airdrops). However, Langchain tools for most of these methods and operations are not implemented by default.

### Details
For further details check [HederaAgentKit Readme](./src/agent/README.md).

## Getting Started

```bash
npm i hedera-agent-kit
```

LangChain/ LangGraph quick start:

```js
import { HederaAgentKit, createHederaTools } from 'hedera-agent-kit';
import { ToolNode } from '@langchain/langgraph/prebuilt';

const hederaAgentKit = new HederaAgentKit(
  '0.0.12345', // Replace with your account ID
  '0x.......', // Replace with your private key
  'testnet',   // Replace with your selected network
);
const hederaAgentKitTools = createHederaTools(hederaAgentKit);
const toolsNode = new ToolNode(tools);

```
- `hederaAgentKitTools` is an array of `Tool` instances
  (from `@langchain/core/tools`).
- `toolsNode` can be used in any LangGraph workflow,
  for example `workflow.addNode('toolsNode', toolsNode)`.

## Local development

1. **Clone** the repo:

```bash
git clone https://github.com/hedera-dev/hedera-agent-kit.git
```

2. Install dependencies:

```bash
cd hedera-agent-kit
npm install
```

3. Configure environment variables (e.g., `OPENAI_API_KEY`, `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`) in a `.env` file.

4. Test the kit:

```bash
 npm run test
```

## Hybrid Mode

The kit implements a hybrid approach to using language models:

1. **Local Ollama Model**: Used for general knowledge questions and non-blockchain queries
2. **OpenAI (o3-mini)**: Used specifically for blockchain operations that require specialized tools

This hybrid approach helps reduce API costs while maintaining high-quality responses for specialized blockchain operations. The system automatically routes queries to the appropriate model based on content analysis.

### Configuration:

```
# In your .env file
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:14b
# Set to 'false' to disable hybrid mode and use OpenAI for all queries
USE_HYBRID_MODEL=true
```

### Testing Hybrid Mode:

1. Make sure Ollama is running: `npm run test-ollama`
2. Run the main test interface: `npm run test`
3. Try both general queries and blockchain-specific queries to see routing in action

## Model Context Protocol (MCP) Mode

The kit now includes a Model Context Protocol implementation that allows OpenAI to interact with Hedera tools in a standardized way. This approach creates a REST API that serves as an intermediary between OpenAI and the blockchain tools.

### MCP Features:

1. **API Server**: Exposes all Hedera tools via a REST API
2. **OpenAPI Schema**: Generates an OpenAPI schema for all tools
3. **OpenAI Integration**: Provides a simple client for OpenAI to interact with tools

### Configuration:

```
# In your .env file
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
MCP_SERVER_PORT=3000
```

### Testing MCP Mode:

1. Run the MCP test interface: `npm run test-mcp`
2. Interact with the AI which now has access to all Hedera tools through the MCP server

The MCP implementation provides a cleaner separation between the LLM and tools, making it easier to switch between different LLM providers while maintaining the same tool functionality.

## Character Mode

The kit now supports a character roleplay mode for the Ollama LLM, similar to SillyTavern. This feature allows:

1. **Character-Based Responses**: The Ollama model can respond as different characters.
2. **Hybrid Approach**: General queries go to Ollama (with character mode), while blockchain operations still use OpenAI.
3. **Configuration**: Characters are defined in JSON files in the `characters/` directory.

### Character JSON Format

```json
{
    "name": "Character Name",
    "description": "Physical appearance description",
    "personality": "Personality traits",
    "scenario": "Background setting",
    "first_mes": "First message in chat",
    "mes_example": "Example messages",
    "creator_notes": "Notes from creator",
    "system_prompt": "System instructions for AI"
}
```

### Using Character Mode

1. Place character JSON files in the `characters/` directory.
2. Run `npm run test` and choose the "character" mode.
3. Select a character from the list.
4. Start chatting with the character!

The character mode is only applied to Ollama responses, while OpenAI remains focused on blockchain operations.

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](https://github.com/hedera-dev/hedera-agent-kit/blob/main/CONTRIBUTING.md) for details on our process, how to get started, and how to sign your commits under the DCO.

## Roadmap

For details on upcoming features, check out our [ROADMAP.md](https://github.com/hedera-dev/hedera-agent-kit/blob/main/ROADMAP.md). If you'd like to tackle one of the tasks, look at the open issues on GitHub or create a new one if you don't see what you're looking for.

## License

Apache 2.0

# Private Key Formatting

When using this project with Hedera, it's crucial to ensure your private keys are in the correct format:

1. **Remove any `0x` prefix**: Hedera SDK expects private keys as raw hex strings without the `0x` prefix that's common in Ethereum.

2. **Use the correct key type**: Set `HEDERA_KEY_TYPE=ECDSA` in your .env file if using ECDSA keys.

3. **Common errors**: If you encounter an `INVALID_SIGNATURE` error, check your private key format first.

Example of correct format in `.env`:
```
HEDERA_PRIVATE_KEY=f22ee3d62bfc11b720a635d8d09c9a1c974e08a5f9bd875a6058ddfbe62415bf
```

NOT:
```
HEDERA_PRIVATE_KEY=0xf22ee3d62bfc11b720a635d8d09c9a1c974e08a5f9bd875a6058ddfbe62415bf
```
