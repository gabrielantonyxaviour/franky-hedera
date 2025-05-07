# Franky Hedera
![image](https://github.com/user-attachments/assets/f0c938d4-0667-4859-a839-4ec2d6f30e21)

FrankyAgent is a decentralized framework for deploying and monetizing local AI agents running directly on user devices (e.g. phones). It enables on-device inference using lightweight LLMs, tracks agent performance through a private Hedera Consensus Service, and incentivizes high-uptime nodes using \$HBAR. Agent ownership is recorded using NFTs minted via the Hedera Token Service.

## Contract Information

Franky is deployed on Hedera Testnet with the following contract details:

- **Franky Contract**: `0.0.5937360` [View on HashScan](https://hashscan.io/testnet/contract/0.0.5937360)
- **Implementation Address**: `0x2f2c723f79D40667E1f850Ec4f969BD08B143445` [View on HashScan](https://hashscan.io/testnet/address/0x2f2c723f79D40667E1f850Ec4f969BD08B143445)

## Table of Contents
- [Key Features](#-key-features)
- [Flow Overview](#-flow-overview)
- [Privacy & Security](#-privacy--security)
- [Use Cases](#-use-cases)
- [Technologies Used](#-technologies-used)
- [Roadmap](#-roadmap)
- [Getting Started](#-getting-started)
- [How to Interact with Our Agents](#how-to-interact-with-our-agents)
- [Hedera Consensus Service for Device Reputation Scores](#hedera-consensus-service-for-device-reputation-scores)
- [Hedera Line of Code](#hedera-line-of-code)

## 🧠 Key Features

* **♻️ Local LLM on Phones**
  Each device runs a lightweight agent using the **Hedera Agent Kit** for on-device inference and integration with Hedera services.

* **📡 Private Consensus Service for Validation**
  Devices publish their uptime, latency, and behavior metrics to a **self-hosted Consensus Service** on Hedera, enabling efficient and verifiable performance tracking.
  Hedera's **HCS-10 standard** is used exclusively for agent interaction and communication.

* **🧾 On-Chain Reputation**
  Each device signs its telemetry and pushes updates to its own topic within the private consensus layer.
  Any participant can subscribe, verify signatures, and compute performance scores.

* **💰 Incentives via \$HBAR**
  Rewards are distributed in **\$HBAR**, Hedera's native currency.
  Devices are ranked based on uptime and responsiveness, and periodic payouts are issued accordingly.

* **🪪 Agent Ownership via NFT**
  Each deployed agent is linked to an NFT minted through the **Hedera Token Service**, proving authorship and enabling agent transferability.

* **🌐 Agent Subdomains**
  Every deployed agent is assigned a human-readable subdomain like `kai.frankyagent.xyz`.
  Agent creators earn passive \$HBAR income when their agent is used or deployed on other devices.

## 🔁 Flow Overview

1. **Device Initialization:**
   A user sets up a FrankyAgent node on their phone. The node generates its keypair and topic ID.

2. **Telemetry Broadcasting:**
   The node signs and broadcasts telemetry to its own topic on the private Hedera Consensus Service.

3. **Peer Subscription & Validation:**
   Other nodes subscribe to topics, validate telemetry, and can flag abnormal behavior.

4. **Reputation Scoring:**
   A score is calculated based on uptime, latency, and peer verification.

5. **HBAR Incentives:**
   Periodic rewards in \$HBAR are distributed based on performance tiers.

6. **Agent Deployment:**
   Developers mint an NFT representing their agent. Others can deploy these agents and generate passive income for the creator.

## 🔒 Privacy & Security

* All telemetry is signed by the device.
* Users control whether to expose logs publicly.
* Hedera Consensus Service provides timestamped, immutable logs without revealing sensitive data.

## 🌍 Use Cases

* Decentralized AI assistant grids.
* Local inference marketplace.
* Agent reputation leaderboards.
* Bot farms with on-chain telemetry.
* Incentivized compute networks.

## 📦 Technologies Used

* **Hedera Agent Kit** – On-device agent framework.
* **Ollama** – Lightweight LLM inference engine.
* **Hedera Consensus Service (with HIP991)** – Private telemetry + agent messaging.
* **HCS-10** – Agent communication format.
* **Hedera Token Service** – Agent ownership via NFT and \$HBAR-based incentives.

## 🔮 Roadmap

* [x] Local agent with Hedera Agent Kit + Ollama
* [x] Telemetry publishing via private HCS
* [x] \$HBAR rewards via HTS
* [ ] Graph-based reputation explorer
* [ ] Federated moderation for flagging agents
* [ ] Device swarms for distributed coordination
* [ ] On-ramp / Off-ramp for \$HBAR
* [ ] Agent framework support (e.g., ELIZA, Zerebro)
* [ ] Multi-agent swarming protocols
* [ ] Pluggable local model backends
* [ ] Community curation for high-trust agents

## ✅ Getting Started

### 1. Contributing a Device

1. **Go to [Franky](https://franky-hedera.vercel.app)**
2. **Connect Your Wallet**: Use MetaMask to create your Hedera Testnet wallet
3. **Set Up Your Device**: Visit the [deploy device page](https://franky-hedera.vercel.app/deploy-device) and follow the instructions there.

Once set up, your device becomes part of the Franky network and will automatically start processing agent requests.

### 2. Creating Your Own Agent

1. Visit the **[Device Marketplace](https://franky-hedera.vercel.app/marketplace)** and choose a device you want to use.
2. **Create Your Agent**:
   - Enter a name for your agent, it will be minted as a subdomain (yourname.frankyagent.xyz)
   - Customize personality traits and knowledge areas can be included in the character content.
   - Your secrets are encrypted with lit and are stored safely on IPFS.
   - Set agent pricing for public usage.
3. **Deploy Your Agent**:
   - Agent character data is stored on IPFS with hash saved on Hedera.
   - HIP-991 topics are created for agent communication.


## How to Interact with Our Agents

Franky agents use a **HIP-991** compliant API built on **Hedera's consensus service (HCS)**. All communication happens via monetized Hedera topics with **$HBAR micropayments** for each interaction.

### Endpoints

#### 1. POST `/status`
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
- `x-account-id`: Hedera account's EVM address

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
- `x-account-id`: Hedera account's EVM address

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

#### 4. POST `/viewresponse/:messageId`
Retrieve an agent's response message by its ID.

**Headers:**
- `x-account-id`: Hedera account's EVM address

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
- `x-account-id`: Hedera account's EVM address

**Response:**
```json
{
  "status": "success",
  "message": "Agent destroyed successfully"
}
```


### Behind the Scenes

When you interact with a Franky agent:

1. Your request is authenticated using your Hedera wallet
2. For chat messages, a **HIP-991 monetized topic** receives your message and fee
3. The agent processes your query using either:
   - Local Ollama LLM inference running on the device.
   - OpenAI fallback for advanced queries.
4. For blockchain-related requests, **HederaAgentKit** tools are used
5. The agent's response is published to your dedicated outbound topic
6. Fees in **$HBAR** are distributed to device owners and agent creators

## HCS-10 Implementation 

This section provides a comprehensive explanation of each API endpoint and the detailed technical processes that occur behind the scenes when they are called.

### Connection Initialization Flow

When calling the `/initialize` endpoint, a complex series of operations occur to establish a secure communication channel:

```
┌──────────┐              ┌──────────┐              ┌──────────┐
│   User   │              │  Server  │              │   Agent  │
└────┬─────┘              └────┬─────┘              └────┬─────┘
     │                         │                         │
     │   1. Initialize Agent   │                         │
     │─────────────────────────>                         │
     │                         │                         │
     │                         │ 2. Setup Topic Monitors │
     │                         │────────────────────────>│
     │                         │                         │
     │                         │  3. Connection Request  │
     │                         │────────────────────────>│
     │                         │                         │
     │                         │                         │ 4. Create Connection Topic
     │                         │                         │──────────────────────────┐
     │                         │                         │                          │
     │                         │                         │<─────────────────────────┘
     │                         │                         │
     │                         │  5. Send Confirmation   │
     │                         │<────────────────────────│
     │                         │                         │
     │      6. Connection      │                         │
     │     Confirmation        │                         │
     │<────────────────────────│                         │
```

#### Step-by-Step Process:

1. **Account Resolution**: The server converts EVM addresses to Hedera account IDs using the mirror node API.

2. **Agent Information Retrieval**: Server fetches agent metadata from the database:
   ```typescript
   const { agent, character, feeInHbar } = await fetchAgentAndCharacterData(agentAddress);
   ```

3. **Topic Monitoring Setup**: The server starts monitoring the agent's topics:
   ```typescript
   const agentMonitorService = new MonitorService(agentClient);
   await agentMonitorService.startMonitoringTopic(agent.inboundTopicId);
   ```

4. **Connection Request**: The server submits a standardized HCS-10 connection request to the agent's inbound topic:
   ```typescript
   const result = await userClient.submitPayload(
     agent.inboundTopicId,
     {
       p: 'hcs-10',
       op: 'connection_request',
       operator_id: `${agent.outboundTopicId}@${hederaAccountId}`,
       m: 'Connection request',
       data: JSON.stringify({
         timestamp: Date.now(),
         userId: hederaAccountId
       })
     }
   );
   ```

5. **Connection Topic Creation**: The agent creates a dedicated connection topic with:
   - Threshold keys allowing both agent and user to submit messages
   - Optional fee configuration for monetized interactions
   - HCS-10 standard memo format

6. **Confirmation Monitoring**: The server polls the agent's outbound topic for confirmation:
   ```typescript
   while (!connectionTopicId && attempts < maxAttempts) {
     const { messages } = await userClient.getMessages(agent.outboundTopicId);
     
     for (const message of messages) {
       if (message.p === 'hcs-10' && 
           message.op === 'connection_created' && 
           message.connection_id === requestId) {
         connectionTopicId = message.connection_topic_id;
         break;
       }
     }
   }
   ```

7. **Fee Configuration**: If the agent has a fee, it's applied to the connection:
   ```typescript
   const feeConfig = {
     feeAmount: agentFee,
     feeCollector: agent.owner_address,
     useHip991: true,
     exemptAccounts: [agent.owner_address, agent.account_id]
   };
   registerFeeGatedConnection(connectionTopicId, feeConfig);
   ```

8. **Persistence**: The connection details are saved for future use:
   ```typescript
   saveUserAgentMapping(hederaAccountId, {
     agentAddress,
     connectionTopicId,
     characterId,
     inboundTopicId: agent.inboundTopicId,
     outboundTopicId: agent.outboundTopicId,
     lastActive: new Date().toISOString()
   });
   ```

### Messaging Flow

For the `/chat` endpoint, the following operations occur:

```
┌──────────┐              ┌──────────┐              ┌──────────┐
│   User   │              │  Server  │              │   Agent  │
└────┬─────┘              └────┬─────┘              └────┬─────┘
     │                         │                         │
     │      1. Send Chat       │                         │
     │─────────────────────────>                         │
     │                         │                         │
     │                         │    2. Forward Message   │
     │                         │────────────────────────>│
     │                         │                         │
     │                         │                         │ 3. Generate Response
     │                         │                         │─────────────────────┐
     │                         │                         │                     │
     │                         │                         │<────────────────────┘
     │                         │                         │
     │                         │   4. Send Response      │
     │                         │<────────────────────────│
     │                         │                         │
     │    5. Get Response      │                         │
     │─────────────────────────>                         │
     │                         │                         │
     │    6. Return Response   │                         │
     │<────────────────────────│                         │
```

#### Technical Details:

1. **Message Preparation**: The server generates unique IDs for message tracking:
   ```typescript
   const messageId = `msg-${uuidv4()}`;
   const responseId = `resp-${uuidv4()}`;
   
   const formattedMessage = {
     id: messageId,
     prompt: message,
     response_id: responseId,
     timestamp: Date.now()
   };
   ```

2. **Fee Processing**: the topic is fee-gated (using HIP-991), the appropriate fee in HBAR is attached to the transaction.

3. **Message Submission**: The message is submitted to the connection topic:
   ```typescript
   const sendResult = await connectionService.sendMessage(
     topicId,
     formattedMessage,
     hederaAccountId,
     privateKey,
     'User message'
   );
   ```

4. **Response Generation**: The agent processes the message:
   - Extracts the prompt from the message
   - Uses Ollama (local LLM) or OpenAI (cloud) for inference
   - Formats the response with the provided response ID
   ```typescript
   const aiResponse = await generateCharacterResponse(
     parsedData.prompt,
     characterData
   );
   
   const responseMessage = {
     id: parsedData.response_id,
     response: aiResponse,
     prompt_id: parsedData.id,
     timestamp: Date.now()
   };
   ```

5. **Response Retrieval**: When `/viewresponse/:messageId` is called:
   - The server retrieves messages from the connection topic
   - Filters for the message matching the requested ID
   - Returns the structured response to the client

### Topic Structure and Message Format

The system uses three types of topics, each with a distinct purpose:

1. **Inbound Topic**:
   - Memo format: `hcs-10:inbound:accountId=0.0.12345:ttl=60`
   - Purpose: Receives connection requests from users
   - May be fee-gated using HIP-991

2. **Outbound Topic**:
   - Memo format: `hcs-10:outbound:ttl=60`
   - Purpose: Broadcasts connection confirmations

3. **Connection Topic**:
   - Memo format: `hcs-10:connection:account=0.0.12345:reqId=42:ttl=60`
   - Purpose: Private channel for bilateral agent-user communication
   - Created with threshold keys (both agent and user can submit)
   - May include fee configuration

### HCS-10 Message Format

All messages follow the HCS-10 standard format:

```json
{
  "p": "hcs-10",                     // Protocol identifier
  "op": "message|connection_request", // Operation type
  "operator_id": "topicId@accountId", // Format: topicId@accountId
  "m": "Message memo",               // Optional memo field
  "data": "Message content"          // Content or JSON stringified object
}
```


## standards-sdk Integration

Franky Hedera extensively uses the Hashgraph Standards SDK for implementing the HCS-10 protocol. Here are key examples of how the standards-sdk is integrated throughout the codebase:

### 1. HCS10Client Initialization

```typescript
// Create HCS-10 client for agent communication
const hcs10Client = new HCS10Client({
  network: 'testnet' as NetworkType,
  operatorId: hederaAccountId,
  operatorPrivateKey: PrivateKey.fromStringECDSA(privateKey).toString(),
  logLevel: 'info',
  prettyPrint: true
});
```

### 2. Connection Request Submission

```typescript
// Submit connection request using standards-sdk
const result = await userClient.submitPayload(
  agent.inboundTopicId,
  {
    p: 'hcs-10',
    op: 'connection_request',
    operator_id: `${agent.outboundTopicId}@${hederaAccountId}`,
    m: 'Connection request',
    data: JSON.stringify({
      timestamp: Date.now(),
      userId: hederaAccountId
    })
  },
  undefined, // No submit key needed
  false // No fee required for connection request
);
```

### 3. Connection Topic Creation

```typescript
// Create connection topic using standards-sdk
const connectionTopicId = await this.client.createConnectionTopic(
  requesterId, // User account ID
  requestId,   // Original request ID
  feeConfig,   // Optional fee configuration
  ttlSeconds   // TTL in seconds
);
```

### 4. Connection Confirmation

```typescript
// Send connection confirmation using standards-sdk
await this.client.confirmConnection(
  outboundTopicId,  // Agent's outbound topic
  connectionTopicId, // Newly created connection topic
  requesterId,      // User account ID
  requestId,        // Original request ID
  'Connection created' // Memo
);
```

### 5. Message Retrieval

```typescript
// Get messages from topic using standards-sdk
const { messages } = await hcs10Client.getMessages(topicId);

// Process messages
for (const message of messages) {
  if (message.p === 'hcs-10' && message.op === 'message') {
    // Process message content
    const parsedData = JSON.parse(message.data);
    // Handle the message
  }
}
```

### 6. Message Submission

```typescript
// Send message using standards-sdk
await client.sendMessage(
  connectionTopicId,
  JSON.stringify(responseMessage),
  'Agent response'
);
```

### 7. MonitorService Integration

```typescript
// Create monitoring service with HCS10Client
const monitorService = new MonitorService(hcs10Client);

// Set character data for response generation
monitorService.setCharacterForTopic(connectionTopicId, characterData);

// Start monitoring a topic
await monitorService.startMonitoringTopic(connectionTopicId);

// Register topic type for specific handling
monitorService.registerTopicType(connectionTopicId, 'connection', {
  characterId: characterId,
  userId: hederaAccountId
});
```

### 8. HCS-11 Profile Integration

```typescript
// Create HCS11Client for profile management
const hcs11Client = new HCS11Client({
  network: "testnet",
  auth: {
    operatorId: agent.account_id,
    privateKey: PrivateKey.fromStringDer(agent.encryptedPrivateKey || '').toString()
  },
  logLevel: "info"
});

// Update account memo with profile
await hcs11Client.updateAccountMemoWithProfile(
  agent.account_id, 
  agent.profile_topic_id
);
```

### 9. Fee Configuration Using Standards SDK

```typescript
// Create fee configuration using standards-sdk
const feeConfig: FeeConfig = {
  feeAmount: agentFee,
  feeCollector: agent.owner_address,
  useHip991: true,
  exemptAccounts: [agent.owner_address, agent.account_id || '']
};

// Register fee-gated connection
registerFeeGatedConnection(connectionTopicId, feeConfig);
```

## Hedera Consensus Service for Device Reputation Scores

Franky's DePIN (Decentralized Physical Infrastructure Network) architecture leverages Hedera Consensus Service (HCS) to create a **transparent, tamper-proof reputation system** for devices contributing computational resources.

### Reputation Architecture

1. **HCS Registry Topics**: Each device and checker has dedicated registry topics that establish identity and tracking
   - Device Registry Topic: `0.0.5911509`
   - Checker Registry Topic: `0.0.5911510`

2. **Independent Checker Registration**:
   - Anyone can register their server as a checker node for performing reputation tests on all the devices available.
   - They can go to the [Register Checker](https://franky-hedera.vercel.app/register-checker) page to register as a checker node.
   - Then further instructions will be displayed on the page for performing the checking action.

3. **Decentralized Verification**: Multiple independent checker nodes evaluate device performance and availability
   - Each check transaction is submitted to HCS with a cryptographic signature
   - Every evaluation becomes part of an immutable audit trail

4. **Performance Metrics**: Devices are evaluated using key performance indicators:
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
   - Reputation data is queried directly from **Hedera mirror nodes**
   - Global state is constructed by aggregating all HCS messages
   - Applications display consensus reputation via `/api/device-checker` endpoint

3. **Transparency**:
   - All device reputation data visible on [Device Reputation](https://franky-hedera.vercel.app/device-reputation) dashboard
   - Full audit trail accessible through Hedera mirror nodes
   - Historical performance tracking enables identification of performance trends

This HCS-based reputation system creates the foundation for Franky's trust layer, ensuring users can rely on device performance metrics when selecting hosts for their AI agents while rewarding reliable device operators with more opportunities to earn $HBAR.

---

