# Franky Agent Framework using HCS-10 Standard

This repository implements the [HCS-10 standard](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HCS/0010-hcs10-connecting-agents.md) for AI agent interactions on Hedera. It provides a standardized way for users to interact with character agents through Hedera Consensus Service topics.

## Overview

The framework provides:

- **Character-based Agents**: Create and manage AI characters with unique personalities
- **Fee-based Interactions**: Monetize agent interactions using HIP-991 fee-collection
- **Secure Communication**: Establish secure communication channels between users and agents
- **Registry System**: Discover and select available character agents
- **Standardized Protocol**: Based on the HCS-10 standard for agent communication

## Architecture

The system follows a standardized architecture based on the HCS-10 protocol:

1. **Registry Topic**: A central topic that stores all character-agent mappings
2. **Inbound Topics**: Each agent has a fee-based topic where users can send connection requests
3. **Outbound Topics**: Each agent has a topic to confirm connections
4. **Connection Topics**: Dedicated topics for secure user-agent communication

## Prerequisites

- Node.js 16 or later
- Hedera Testnet or Mainnet account
- Hedera account ID and private key

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/franky-hedera.git
   cd franky-hedera/agent-framework
```

2. Install dependencies:
   ```
npm install
```

3. Configure environment variables:
   ```
   cp sample.env .env
   ```
   
   Then edit `.env` with your Hedera account details:
   ```
   HEDERA_NETWORK=testnet
   HEDERA_ACCOUNT_ID=YOUR_ACCOUNT_ID
   HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY
   OPENAI_API_KEY=YOUR_OPENAI_API_KEY
   ```

## Running the Server

1. Build the project:
   ```
   npm run build
   ```

2. Start the server:
   ```
   npm start
   ```

The server will start on port 3000 by default (configurable in `.env`).

## API Endpoints

### Character Management

- **GET /characters** - List all available characters
- **GET /characters/:characterId** - Get details about a specific character
- **POST /admin/characters** - Add a new character
- **DELETE /admin/characters/:characterId** - Mark a character as deleted

Example: Adding a new character
```json
POST /admin/characters
{
  "characterId": "sherlock-holmes",
  "name": "Sherlock Holmes",
  "description": "A brilliant detective known for his logical reasoning",
  "imageUrl": "https://example.com/sherlock.jpg",
  "traits": {
    "personality": ["analytical", "observant", "intelligent"],
    "background": "Private detective from London",
    "speaking_style": "Precise and formal"
  }
}
```

### Agent Interaction

- **POST /initialize** - Initialize an agent for interaction
- **POST /chat** - Send a message to an agent
- **GET /viewresponse/:messageId** - View a response to a message
- **POST /destruct** - Cleanup an agent connection

All endpoints requiring a user account ID should include an `account-id` header.

Example: Initializing an agent
```json
POST /initialize
Headers: account-id: 0.0.12345
{
  "characterId": "sherlock-holmes"
}
```

Example: Sending a message
```json
POST /chat
Headers: account-id: 0.0.12345
{
  "characterId": "sherlock-holmes",
  "message": "Can you help me solve a mystery?"
}
```

Example: View a response
```
GET /viewresponse/550e8400-e29b-41d4-a716-446655440000
Headers: account-id: 0.0.12345
```

Example: Cleanup
```json
POST /destruct
Headers: account-id: 0.0.12345
{
  "characterId": "sherlock-holmes"
}
```

## Message Flow

1. **User Initialization**:
   - User selects a character agent
   - System creates or reuses an agent for the character
   - System establishes a connection topic for communication

2. **Conversation**:
   - User sends messages to the connection topic
   - Agent monitors the connection topic for new messages
   - Agent generates responses and sends them to the same topic
   - User retrieves responses from the connection topic

3. **Cleanup**:
   - User requests to end the conversation
   - System sends a close message to the connection topic
   - System stops monitoring the connection

## Development

### Project Structure

```
agent-framework/
├── src/
│   ├── controllers/    - API endpoint controllers
│   ├── services/       - Business logic services
│   ├── utils/          - Utility functions
│   ├── routes/         - API route definitions
│   ├── index.ts        - Main application entry point
├── data/               - Storage for agent state
├── dist/               - Compiled JavaScript files
├── .env                - Environment configuration
└── package.json        - Project dependencies
```

### Adding New Features

1. **Create a New Character**:
   - Add a character to the registry using the `/admin/characters` endpoint
   - The character will be available for users to initialize

2. **Custom Response Generation**:
   - Modify the `aiService.ts` file to customize how character responses are generated
   - You can integrate different AI models or custom logic

3. **Custom Fee Structure**:
   - Adjust the `getDefaultFeeAmount` function in `hederaService.ts`
   - Modify the fee configuration in `agentController.ts`

## Troubleshooting

- **Connection Issues**: Make sure your Hedera account has enough HBAR for transactions
- **Missing Responses**: Check that the agent monitoring service is running correctly
- **Fee Errors**: Ensure the user account has enough balance to pay fees

## License

Apache 2.0

## Acknowledgments

This project is based on the [HCS-10 standard](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HCS/0010-hcs10-connecting-agents.md) and uses the [standards-sdk](https://github.com/hashgraphonline/standards-sdk) for Hedera communication.

# Agent Framework with Fee-Gated Connection Topics

This implementation provides a framework for agent-based interactions using Hedera's Consensus Service (HCS), with support for fee-gated connection topics. The system follows a specific architecture to ensure that initial connection requests are free, while ongoing conversations require a fee payment.

## Architecture

### Free Inbound Topics & Fee-Gated Connection Topics

The implementation uses a clear distinction between different types of topics:

1. **Inbound Topics**: Free topics that any user can post to. These are used solely for connection requests to establish a conversation with an agent.

2. **Connection Topics**: Fee-gated topics for ongoing conversations. Once a connection is established, users must pay a fee to post messages to these topics.

### Fee Structure Implementation

The system implements a fee structure based on the following components:

- **FeeConfigBuilder**: A utility class for creating fee configurations with customizable properties like fee amount, collector account, and exempt accounts.

- **MonitorService**: Responsible for tracking fee-gated connections and verifying fee payments when messages are processed.

- **HCS10Client**: Enhanced client for creating and managing fee-gated topics, with support for creating HIP-991 fee schedules.

### Connection Flow

The connection flow follows this sequence:

1. User sends a connection request to the agent's free inbound topic.
2. Agent processes the request and creates a fee-gated connection topic.
3. Agent sends a confirmation message with the connection topic ID.
4. User and agent communicate through the fee-gated connection topic.

### Fee Verification

When messages are received on a fee-gated connection topic:

1. The system checks if the topic is registered as fee-gated.
2. If the sender is not in the exempt accounts list, the fee payment is verified.
3. If the fee is not paid, the message is rejected.

## API Endpoints

The framework provides the following API endpoints:

- `POST /api/agents/initialize`: Initialize an agent for a character
- `POST /api/agents/connect`: Connect to an agent by inbound topic ID
- `POST /api/agents/message`: Send a message to an agent on a connection topic
- `POST /api/agents/monitor`: Start monitoring for an agent
- `POST /api/agents/fee-config`: Create a fee configuration

## Usage Example

Here's an example of how to use the system:

1. **Initialize an Agent**
   ```javascript
   // Create an agent for a character
   fetch('/api/agents/initialize', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       characterId: 'character-123',
       accountId: 'agent-account-id',
       privateKey: 'agent-private-key'
     })
   });
   ```

2. **Connect to an Agent**
   ```javascript
   // Connect to an agent using its inbound topic
   fetch('/api/agents/connect', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       inboundTopicId: 'agent-inbound-topic-id',
       userAccountId: 'user-account-id',
       userPrivateKey: 'user-private-key'
     })
   });
   ```

3. **Send a Message**
   ```javascript
   // Send a message to the connection topic (with fee payment)
   fetch('/api/agents/message', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       connectionTopicId: 'connection-topic-id',
       message: 'Hello agent!',
       userAccountId: 'user-account-id',
       userPrivateKey: 'user-private-key'
     })
   });
   ```

## HIP-991 Support

The system includes support for HIP-991 fee schedules, allowing for standardized fee management. The `createHip991FeeSchedule` method in the `HCS10Client` class creates fee schedules according to the HIP-991 standard.

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the server: `npm start`

## Configuration

The system can be configured through environment variables:

- `PORT`: Server port (default: 3000)
- `HEDERA_NETWORK`: Hedera network to use (default: testnet)
- `LOG_LEVEL`: Logging level (default: info)

## Future Enhancements

Future versions could include:

- Complete implementation of HIP-991 fee schedules
- Improved fee verification using Hedera Record API
- Support for token-based fees
- Enhanced message encryption and privacy features
