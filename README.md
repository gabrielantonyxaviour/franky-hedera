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
- `account-id`: Hedera account's EVM address

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
- `account-id`: Hedera account's EVM address

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
- `account-id`: Hedera account's EVM address

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
- `account-id`: Hedera account's EVM address

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

## Hedera Line of Code

This section provides a detailed breakdown of where and how various Hedera technologies are integrated within the codebase.

### 1. Hedera HIP991 Topics

HIP-991 enables custom fees for HCS topics, allowing monetization of message submission.

- **Topic Creation with Custom Fees** - [agent-framework/src/utils/hip991-agent.ts:183-226](https://github.com/gabrielantonyxaviour/franky-hedera/blob/main/agent-framework/src/utils/hip991-agent.ts)
  ```typescript
  export async function createMonetizedTopic(
    serverClient: Client, 
    serverAccountId: AccountId, 
    serverKey: PrivateKey,
    userAccountId: AccountId,
    userPublicKey: any,
    fee: number = 0.5
  ): Promise<TopicId> {
    // Create a fixed fee with the specified HBAR amount
    const customFee = new CustomFixedFee()
      .setHbarAmount(new Hbar(fee))
      .setFeeCollectorAccountId(serverAccountId);
    
    // Create a monetized topic following HIP-991
    const topicCreateTx = new TopicCreateTransaction()
      .setTopicMemo(memo)
      .setMaxTransactionFee(new Hbar(50))
      .setAdminKey(serverKey.publicKey)
      .setSubmitKey(userPublicKey)
      .setCustomFees([customFee])
      .setFeeScheduleKey(serverKey.publicKey);
  }
  ```

- **Regular Topic Creation for Responses** - [agent-framework/src/utils/hip991-agent.ts:231-268](https://github.com/gabrielantonyxaviour/franky-hedera/blob/main/agent-framework/src/utils/hip991-agent.ts)
  ```typescript
  export async function createResponseTopic(
    serverClient: Client, 
    serverKey: PrivateKey,
    userAccountId: AccountId
  ): Promise<TopicId> {
    // Create a topic with the server as the sole submitter
    const topicCreateTx = new TopicCreateTransaction()
      .setTopicMemo(memo)
      .setMaxTransactionFee(new Hbar(50))
      .setAdminKey(serverKey.publicKey)
      .setSubmitKey(serverKey.publicKey); // Only server can post responses
  }
  ```

### 2. Hedera HCS-10 Standard

HCS-10 provides a standardized message format for agent communication.

- **HCS Message Structure in Agent Framework** - [agent-framework/src/types/index.ts:129-140](https://github.com/gabrielantonyxaviour/franky-hedera/blob/main/agent-framework/src/types/index.ts)
  ```typescript
  export type HCSMessage = {
    consensus_timestamp: string;
    message: string;
    payer_account_id: string;
    sequence_number: number;
    topic_id: string;
  };
  ```

### 3. Hedera HCS Topics

HCS provides a private consensus mechanism for device reputation.

- **HCS Service Initialization** - [frontend/src/lib/services/hcs-service.ts:110-146](https://github.com/gabrielantonyxaviour/franky-hedera/blob/main/frontend/src/lib/services/hcs-service.ts)
  ```typescript
  private initializeClient(): void {
    // Initialize operator credentials
    this.operatorId = AccountId.fromString(OPERATOR_ID);
    this.operatorKey = process.env.HEDERA_KEY_TYPE === "ECDSA" 
      ? PrivateKey.fromStringECDSA(OPERATOR_KEY)
      : PrivateKey.fromString(OPERATOR_KEY);
    
    // Create client based on network setting
    this.client = HEDERA_NETWORK === 'mainnet' 
      ? Client.forMainnet()
      : Client.forTestnet();
  }
  ```

- **HCS Topic Creation** - [frontend/src/lib/services/hcs-service.ts:246-299](https://github.com/gabrielantonyxaviour/franky-hedera/blob/main/frontend/src/lib/services/hcs-service.ts)
  ```typescript
  private async createTopic(name: string, memo: string): Promise<TopicId> {
    // Create a new topic with memo and submit key
    const transaction = await (
      new TopicCreateTransaction()
        .setTopicMemo(memo)
        .setAdminKey(this.operatorKey.publicKey)
        .setSubmitKey(this.operatorKey.publicKey)
        .setMaxTransactionFee(new Hbar(2))
        .freezeWith(this.client)
    );
  }
  ```

- **HCS Message Submission** - [frontend/src/lib/services/hcs-service.ts:306-347](https://github.com/gabrielantonyxaviour/franky-hedera/blob/main/frontend/src/lib/services/hcs-service.ts)
  ```typescript
  private async submitMessage(topicId: TopicId, message: any): Promise<string> {
    const messageString = typeof message === 'string' 
      ? message 
      : JSON.stringify(message);
    
    const transaction = new TopicMessageSubmitTransaction({
      topicId: topicId,
      message: messageString,
    })
    .setMaxTransactionFee(new Hbar(2));
  }
  ```

- **Device Reputation Consensus** - [frontend/src/lib/services/hcs-service.ts:614-690](https://github.com/gabrielantonyxaviour/franky-hedera/blob/main/frontend/src/lib/services/hcs-service.ts)
  ```typescript
  async getDeviceReputation(deviceAddress: string, checkCount: number = 10): Promise<any> {
    // Get the topic for this device
    const deviceTopicId = await this.getDeviceTopicMapping(deviceAddress);
    
    // Get messages from the device topic
    const messages = await this.getMessages(deviceTopic, checkCount);
    
    const checkResults = messages
      .filter(msg => {

      })
      .map(msg => {
      });
    
    // Calculate consensus reputation
    const reputationScore = this.calculateReputationConsensus(checkResults);
  }
  ```

### 4. Hedera AgentKit and MCP

Hedera AgentKit provides a framework for building agents on Hedera, with MCP (Model-Controller-Prompter) enabling AI integration.

- **AgentKit Initialization** - [agent-framework/routes/character-mcp-api.ts:133-152](https://github.com/gabrielantonyxaviour/franky-hedera/blob/main/agent-framework/routes/character-mcp-api.ts)
  ```typescript
  const privateKey = PrivateKey.fromStringECDSA(formattedPrivateKey);
  
  const hederaKit = new HederaAgentKit(
    process.env.HEDERA_ACCOUNT_ID!,
    privateKey.toString(),
    process.env.HEDERA_PUBLIC_KEY!,
    (process.env.HEDERA_NETWORK_TYPE as "mainnet" | "testnet" | "previewnet") || "testnet"
  );
  ```

- **MCP Server Setup** - [agent-framework/routes/character-mcp-api.ts:167-175](https://github.com/gabrielantonyxaviour/franky-hedera/blob/main/agent-framework/routes/character-mcp-api.ts)
  ```typescript
  // Create the LangChain-compatible tools
  const tools = createHederaTools(hederaKit);
  
  // Start MCP server
  const mcpServer = new MCPServer(tools, 3001);
  await mcpServer.start();
  ```

- **MCP Client** - [`agent/api-server.js:35-56`](https://github.com/gabrielantonyxaviour/franky-hedera/blob/main/agent/api-server.js)
  ```javascript
  // Initialize HederaAgentKit
  const hederaKit = new HederaAgentKit(

  );
  
  // Create tools
  const tools = createHederaTools(hederaKit);
  
  // Start MCP server
  const mcpServer = new MCPServer(tools, port);
  await mcpServer.start();
  
  ```

- **HCS Topic-related Tools** - [`agent-framework/src/langchain/tools/hcs/submit_topic_message_tool.ts:8-44`](https://github.com/gabrielantonyxaviour/franky-hedera/blob/main/agent-framework/src/langchain/tools/hcs/submit_topic_message_tool.ts)
  ```typescript
  export class HederaSubmitTopicMessageTool extends Tool {
    name = 'hedera_submit_topic_message';
  
    description = `Submit a message to a topic on Hedera
  Inputs (input is a JSON string):
  topicId: string, the ID of the topic to submit the message to e.g. 0.0.123456,
  message: string, the message to submit to the topic e.g. "Hello, Hedera!"`;
  
    protected override async _call(input: any, _runManager?: CallbackManagerForToolRun, config?: ToolRunnableConfig): Promise<string> {
      const parsedInput = JSON.parse(input);
      const topicId = TopicId.fromString(parsedInput.topicId);
      return await this.hederaKit
        .submitTopicMessage(topicId, parsedInput.message, isCustodial)
        .then(response => response.getStringifiedResponse());
    }
  }
  ```

### 5. Hedera Mirror Node

The Mirror Node provides a REST API for accessing Hedera network data.

- **Mirror Node Client Definition** - [frontend/src/utils/mirror-node-client.tsx:1-15](https://github.com/gabrielantonyxaviour/franky-hedera/blob/main/frontend/src/utils/mirror-node-client.tsx)
  ```typescript
  export class MirrorNodeClient {
    url: string;
    constructor(networkConfig: NetworkConfig) {
      this.url = networkConfig.mirrorNodeUrl;
    }
  
    async getAccountInfo(accountId: AccountId) {
      const accountInfo = await fetch(`${this.url}/api/v1/accounts/${accountId}`, { method: "GET" });
      const accountInfoJson = await accountInfo.json();
      return accountInfoJson;
    }
  }
  ```

- **Mirror Node URL Configuration** - [frontend/src/config/networks.ts:1-10](https://github.com/gabrielantonyxaviour/franky-hedera/blob/main/frontend/src/config/networks.ts)
  ```typescript
  export const networkConfig: NetworkConfigs = {
    testnet: {
      network: "testnet",
      jsonRpcUrl: "https://testnet.hashio.io/api",
      mirrorNodeUrl: "https://testnet.mirrornode.hedera.com",
      chainId: "0x128",
    }
  }
  ```

- **HCS Message Retrieval from Mirror Node** - [frontend/src/lib/services/hcs-service.ts:352-381](https://github.com/gabrielantonyxaviour/franky-hedera/blob/main/frontend/src/lib/services/hcs-service.ts)
  ```typescript
  private async getMessages(topicId: TopicId, limit: number = 100): Promise<any[]> {
    const networkType = process.env.HEDERA_NETWORK || 'testnet';
    const baseUrl = networkType === 'mainnet' 
      ? 'https://mainnet-public.mirrornode.hedera.com'
      : 'https://testnet.mirrornode.hedera.com';
      
    let url = `${baseUrl}/api/v1/topics/${topicId.toString()}/messages?encoding=UTF-8&limit=${limit}&order=desc`;
    const messages: any[] = [];
  
    return messages;
  }
  ```
