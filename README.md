# Franky
Monetize your old devices by powering efficient AI agents.

![Franky Logo](https://github.com/user-attachments/assets/e903a068-3bea-4c29-9f9c-049ce820ff92)

## Description

Not sure what to do with your OLD mobile? Franky helps you to run Local LLM Inference right in your device and **MONETIZE** your compute with **$HBAR** tokens. Device Owners could contribute their old devices to run LLMs locally and host AI agents on top of them to earn **$HBAR** tokens. Agent creators could choose a device of their choice to build their Agent from scratch with its very own custom characteristics and generate an API key to interact with them. Agents could also be made publicly available by the Agent Creator for others to use them and in-turn earn **$HBAR** tokens. Agent developers could build plugins in our AI Agent Framework to build custom functionalities. Each Agent has their VERY OWN custom subdomain which makes it readable and convenient to interact with.

## How it's made

The application is built on **Hedera Testnet** and uses native **$HBAR** tokens for API credits and consumption. We integrated **Wallet Connect** for onboarding and server wallets to manage operations in the backend.


An LLM runs locally in the mobile phone and the Agent Framework implemented for Franky Agents uses Hedera AgentKit tooling and use **HIP991** topics for monetization.

## Key Features

- **Repurpose Old Devices**: Turn unused smartphones into revenue-generating AI compute nodes
- **Custom AI Agents**: Create personalized agents with unique characteristics
- **ENS Integration**: Each agent gets its own subdomain (e.g., eliza.frankyagent.xyz)
- **Token Economics**: Earn $HBAR tokens by hosting agents or making your agents available in the marketplace
- **Custom Agent Framework**: Build plugins and extend agent functionality
- **Decentralized Infrastructure**: Fully decentralized solution for AI agent hosting

## Getting Started

### 1. Contributing a Device

1. **Go to [Franky](https://frankyagent.xyz)**
2. **Connect Your Wallet**: Use MetaMask to create your Hedera Testnet wallet
3. **Set Up Your Device**: Visit the [deploy device page](https://frankyagent.xyz/deploy-device) and follow the instructions there.

Once set up, your device becomes part of the Franky network and will automatically start processing agent requests.

### 2. Creating Your Own Agent

1. Visit the **[Device Marketplace](https://frankyagent.xyz/marketplace)** and choose a device you want to use.
2. **Create Your Agent**:
   - Enter a name for your agent, it will be minted as a subdomain (yourname.frankyagent.xyz)
   - Customize personality traits and knowledge areas can be included in the character content.
   - Your secrets are encrypted with lit and are stored safely on IPFS.
   - Set agent pricing for public usage.
3. **Deploy Your Agent**:
   - Agent character data is stored on IPFS with hash saved on Hedera.
   - HIP-991 topics are created for agent communication.


## How to Interact with Our Agents

Franky agents use a HIP-991 compliant API built on Hedera's consensus service. All communication happens via monetized Hedera topics with $HBAR micropayments for each interaction.

### Endpoints

#### 1. GET `/status`
Check if the agent framework is online and view available characters.
```json
// Response
{
  "status": "online",
  "ollamaAvailable": true,
  "activeCharacter": "Franky",
  "availableCharacters": ["franky.json", "eliza.json"]
}
```

#### 2. POST `/initialize`
Initialize an agent with a specific character. Creates two Hedera topics: one for user messages (monetized) and one for agent responses.

**Headers:**
- `account-id`: Hedera account ID or EVM address
- `agent-address`: Custom agent address

```json
// Response
{
  "status": "success",
  "message": "Agent initialized with character Franky",
  "agent": {
    "agentAddress": "0x123...",
    "characterName": "Franky",
    "inboundTopicId": "0.0.12345",
    "outboundTopicId": "0.0.12346",
    "greeting": "Hello! I'm Franky, your personal AI assistant.",
    "feePerMessage": 0.5
  }
}
```

#### 3. POST `/chat`
Send a message to an agent. The message is published to the inbound Hedera topic with a micropayment in $HBAR.

**Headers:**
- `account-id`: Hedera account ID or EVM address

**Body:**
```json
{
  "message": "What can you tell me about Hedera?"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Message sent successfully",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "responseId": "550e8400-e29b-41d4-a716-446655440001",
  "outboundTopicId": "0.0.12346",
  "characterName": "Franky"
}
```

#### 4. GET `/viewresponse/:messageId`
Retrieve an agent's response message by its ID.

**Headers:**
- `account-id`: Hedera account ID or EVM address

**Response:**
```json
{
  "status": "success",
  "message": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "response": "Hedera is a public distributed ledger that uses the hashgraph consensus algorithm...",
    "prompt_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": 1689245871000
  }
}
```

#### 5. POST `/destruct`
Clean up and destroy an agent instance.

**Headers:**
- `account-id`: Hedera account ID or EVM address

**Response:**
```json
{
  "status": "success",
  "message": "Agent destroyed successfully"
}
```

#### 6. GET `/characters`
List all available character configurations.

**Response:**
```json
{
  "characters": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Franky",
      "description": "A helpful AI assistant.",
      "first_mes": "Hello! I'm Franky, your personal AI assistant."
    }
  ]
}
```

#### 7. GET `/wallet-status`
Check the status of a server wallet and associated agent.

**Headers:**
- `account-id`: Hedera account ID or EVM address

**Response:**
```json
{
  "accountId": "0x123...",
  "resolvedAccountId": "0.0.12345",
  "serverWalletConfigured": true,
  "serverWalletAddress": "0x456...",
  "hasEncryptedKey": true,
  "hasActiveAgent": true,
  "agentInfo": {
    "characterName": "Franky",
    "characterId": "550e8400-e29b-41d4-a716-446655440000",
    "inboundTopicId": "0.0.12345",
    "outboundTopicId": "0.0.12346"
  }
}
```

### Behind the Scenes

When you interact with a Franky agent:

1. Your request is authenticated using your Hedera wallet
2. For chat messages, a HIP-991 monetized topic receives your message and fee
3. The agent processes your query using either:
   - Local Ollama LLM inference running on the device.
   - OpenAI fallback for advanced queries.
4. For blockchain-related requests, HederaAgentKit tools are used
5. The agent's response is published to your dedicated outbound topic
6. Fees in $HBAR are distributed to device owners and agent creators

## Hedera Consensus Service for Device Reputation Scores

Franky's DePIN (Decentralized Physical Infrastructure Network) architecture leverages Hedera Consensus Service (HCS) to create a transparent, tamper-proof reputation system for devices contributing computational resources.

### Reputation Architecture

1. **HCS Registry Topics**: Each device and checker has dedicated registry topics that establish identity and tracking
   - Device Registry Topic: `0.0.xxxxx`
   - Checker Registry Topic: `0.0.yyyyy`

2. **Decentralized Verification**: Multiple independent checker nodes evaluate device performance and availability
   - Each check transaction is submitted to HCS with a cryptographic signature
   - Every evaluation becomes part of an immutable audit trail

3. **Performance Metrics**: Devices are evaluated using key performance indicators:
   - **Availability**: Uptime, response time, consistency over time
   - **Performance**: Throughput (requests/sec), error rate, latency (p50, p95, p99)
   - **Security**: TLS version, certificate validity
   - **Reliability**: Success rate for AI inference operations

   ```json
   // Sample device performance metrics recorded in HCS
   {
     "deviceAddress": "0x123abc...",
     "checkerId": "0.0.5868472",
     "timestamp": "2023-08-15T14:22:33.456Z",
     "reputationScore": 87,
     "retrievalStats": {
       "successRate": 0.95,
       "averageResponseTime": 320,
       "consistency": 0.92,
       "totalChecks": 24,
       "lastSeen": "2023-08-15T14:20:12.345Z"
     },
     "performance": {
       "throughput": 8.2,
       "errorRate": 0.05,
       "latency": {
         "p50": 285,
         "p95": 420,
         "p99": 580
       }
     },
     "security": {
       "tlsVersion": "TLS 1.3",
       "certificateValid": true,
       "lastUpdated": "2023-08-15T00:00:00.000Z"
     }
   }
   ```

### Decentralized Consensus

1. **Multi-Checker Validation**: Device reputation derives from multiple independent checkers:
   - Each checker submits its evaluations independently to HCS
   - Consensus algorithm weighs reports based on checker reputation
   - Outlier detection prevents manipulation by malicious checkers

2. **Mirror Node Integration**:
   - Reputation data is queried directly from Hedera mirror nodes
   - Global state is constructed by aggregating all HCS messages
   - Applications display consensus reputation via `/api/device-checker` endpoint

3. **Transparency**:
   - All device reputation data visible on [Device Reputation](https://frankyagent.xyz/device-reputation) dashboard
   - Full audit trail accessible through Hedera mirror nodes
   - Historical performance tracking enables identification of performance trends

This HCS-based reputation system creates the foundation for Franky's trust layer, ensuring users can rely on device performance metrics when selecting hosts for their AI agents while rewarding reliable device operators with more opportunities to earn $HBAR.
