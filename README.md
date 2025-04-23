# Franky
Monetize your old devices by powering efficient AI agents.

![Franky Logo](https://github.com/user-attachments/assets/e903a068-3bea-4c29-9f9c-049ce820ff92)

## Description

Not sure what to do with your OLD mobile? Franky helps you to run Local LLM Inference right in your device and **MONETIZE** your compute with **$FIL** tokens. Device Owners could contribute their old devices to run LLMs locally and host AI agents on top of them to earn **$FIL** tokens. Agent creators could choose a device of their choice to build their Agent from scratch with its very own custom characteristics and generate an API key to interact with them. Agents could also be made publicly available by the Agent Creator for others to use them and in-turn earn **$FIL** tokens. Agent developers could build plugins in our AI Agent Framework to build custom functionalities. Each Agent has their VERY OWN custom subdomain which makes it readable and convenient to interact with.

## How it's made

The application is built on **Filecoin Calibration Testnet** and uses native **$FIL** tokens for API credits and consumption. For user-friendly onboarding, we integrated **Privy Embedded Wallets** for web2 users and server wallets to manage operations in the backend.

For cross-chain functionality, we leverage **Hyperlane** to deploy a bridge to Base Sepolia, which helps mint ENS subdomains for each AI agent. These subdomains serve as readable URLs for agent interaction.

An LLM runs locally in the mobile phone and the Agent Framework implemented for Franky Agents is a fork of the SillyTavern Framework.

## Key Features

- **Repurpose Old Devices**: Turn unused smartphones into revenue-generating AI compute nodes
- **Custom AI Agents**: Create personalized agents with unique characteristics
- **ENS Integration**: Each agent gets its own subdomain (e.g., eliza.frankyagent.xyz)
- **Token Economics**: Earn $FIL tokens by hosting agents or making your agents available in the marketplace
- **Custom Agent Framework**: Build plugins and extend agent functionality
- **Decentralized Infrastructure**: Fully decentralized solution for AI agent hosting

## Sponsor Integrations

### Filecoin
- Store agent configurations and data on the Filecoin network
- Use $FIL as the native token for all transactions and rewards
- Deployed smart contracts on Filecoin Calibration Testnet

### Akave
- Store Character.json files of AI agents
- Store encrypted secrets (via Lit Protocol)
- Host AI agent avatars
- Maintain persistent conversation history for all AI agents

### Checker Network
- Custom subnet for consensus among hosted devices
- Verification system for device uptime
- Reputation system for device reliability

### Lilypad
- Custom AI workflow for prompt analysis
- Dynamic model selection based on request requirements
- Integration with local Ollama LLM on mobile devices

### Coophive
- Alkahest agreement framework for on-chain agreements
- Secure environment secret management
- Restricted access to ensure only the hosting device can access agent secrets

### Randamu
- Verifiable randomness for device wallet generation
- Secure initialization of devices during setup

## Checker Network

The Franky Checker Network is a decentralized quality-of-service verification system that ensures reliable and tamper-proof device reputation scores. Our implementation provides comprehensive device monitoring, reputation tracking, and a Byzantine fault-tolerant consensus mechanism.

### Core Components

#### 1. Device Checker Script (`check-devices.js`)

The backbone of our verification system, implementing:

- **Multi-Node Consensus**
  - Byzantine fault-tolerant consensus mechanism
  - Minimum 3 checkers per device
  - 67% consensus threshold for reputation updates
  - Cryptographically signed verifications

- **Comprehensive Metrics Collection**
  ```typescript
  {
    availability: {
      uptime: number,         // % of successful responses
      responseTime: number,   // Average response time (ms)
      consistency: number,    // Standard deviation
      lastSeen: string       // ISO timestamp
    },
    performance: {
      throughput: number,     // Requests/second
      errorRate: number,      // % of failed requests
      latency: {
        p50: number,         // 50th percentile
        p95: number,         // 95th percentile
        p99: number         // 99th percentile
      }
    },
    security: {
      tlsVersion: string,    // TLS version
      certificateValid: boolean,
      lastUpdated: string
    }
  }
  ```

- **Intelligent Batch Processing**
  - Concurrent device checking (max 5 devices)
  - Rate limiting to prevent network congestion
  - 5-second delay between batches

- **Character Verification**
  - Validates agent character configurations
  - Ensures character data integrity
  - Cross-references with on-chain data

#### 2. Reputation Viewer (`view-reputations.ts`)

A comprehensive tool for analyzing device reputation data:

- **Data Retrieval**
  - Fetches reputation data from Filecoin via Akave buckets
  - Groups files by device address
  - Maintains historical reputation data
  - Automatic latest version selection

- **Reputation Analysis**
  ```typescript
  // Reputation scoring weights
  const weights = {
    availability: 0.5,    // 50% of total score
    performance: 0.3,    // 30% of total score
    security: 0.2        // 20% of total score
  };
  ```

- **Detailed Reporting**
  - Device-specific metrics
  - Network-wide statistics
  - Consensus status tracking
  - Recent issues log

#### 3. Web Interface

##### Device Checker Page (`device-checker/page.tsx`)

Modern, reactive interface for device checking:

- **Real-Time Monitoring**
  - Live device status updates
  - Interactive device search
  - Configurable check frequency
  - Detailed error reporting

- **Visual Feedback**
  - Color-coded reputation scores
  - Status indicators
  - Progress tracking
  - Error visualization

##### Device Reputation Page (`device-reputation/page.tsx`)

Comprehensive reputation dashboard:

- **Dynamic Updates**
  - 5-minute auto-refresh
  - Real-time data visualization
  - Interactive device cards
  - Status indicators

- **Detailed Metrics Display**
  - Success rates
  - Response times
  - Check history
  - Error logs

##### Checker Registration Page (`register-checker/page.tsx`)

Streamlined checker node registration:

- **Easy Onboarding**
  - Wallet integration
  - Server URL configuration
  - Automatic validation
  - Setup instructions

### Reputation Storage

All reputation data is stored on Filecoin via Akave buckets:

```typescript
interface ReputationData {
  version: string;
  networkId: string;
  subnetId: string;
  deviceId: string;
  round: ConsensusRound;
  metrics: DeviceMetrics;
  proof: VerificationProof;
  checks: Check[];
  storageDetails: {
    bucket: string;
    path: string;
    cid?: string;
  };
}
```

### Security Features

1. **Sybil Resistance**
   - Unique Ethereum address requirement
   - Planned staking mechanism
   - Checker reputation tracking

2. **Byzantine Fault Tolerance**
   - Multiple checker verification
   - Median metrics calculation
   - Cryptographic verification chain

3. **Data Integrity**
   - Signed verification results
   - Immutable Filecoin storage
   - Verification proof chain

