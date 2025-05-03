# Franky
![image](https://github.com/user-attachments/assets/f0c938d4-0667-4859-a839-4ec2d6f30e21)

FrankyAgent is a decentralized framework for deploying and monetizing local AI agents running directly on user devices (e.g. phones). It enables on-device inference using lightweight LLMs, tracks agent performance through a private Hedera Consensus Service, and incentivizes high-uptime nodes using \$HBAR. Agent ownership is recorded using NFTs minted via the Hedera Token Service.

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

## Getting Started

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

Franky agents use a **HIP-991** compliant API built on Hedera's consensus service. All communication happens via monetized Hedera topics with **$HBAR micropayments** for each interaction.

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

#### 4. POST `/viewresponse/:messageId`
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

Franky's DePIN (Decentralized Physical Infrastructure Network) architecture leverages Hedera Consensus Service (HCS) to create a **transparent, tamper-proof reputation system** for devices contributing computational resources.

### Reputation Architecture

1. **HCS Registry Topics**: Each device and checker has dedicated registry topics that establish identity and tracking
   - Device Registry Topic: `0.0.5911509`
   - Checker Registry Topic: `0.0.5911510`

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
   - All device reputation data visible on [Device Reputation](https://franky-hedera.vercel.app/device-reputation) dashboard
   - Full audit trail accessible through Hedera mirror nodes
   - Historical performance tracking enables identification of performance trends

This HCS-based reputation system creates the foundation for Franky's trust layer, ensuring users can rely on device performance metrics when selecting hosts for their AI agents while rewarding reliable device operators with more opportunities to earn $HBAR.
