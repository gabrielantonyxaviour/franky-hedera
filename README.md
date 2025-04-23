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

Let us now look at a detailed implementation explanation of these technologies below..

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

#### Independent Checker Node Setup

To run your own checker node:

1. **Prerequisites**
   ```bash
   # System Requirements
   - Node.js v18+
   - 2GB+ RAM
   - Stable internet connection
   - Public HTTPS endpoint
   - Ethereum wallet with private key
   ```

2. **Installation**
   ```bash
   # Clone the repository
   git clone https://github.com/Marshal-AM/franky.git
   cd franky/spark-checker

   # Install dependencies
   npm install

   # Install PM2 for process management
   npm install -g pm2
   ```

3. **Configuration**
   ```bash
   # Create .env file
   cat > .env << EOL
   CHECKER_PRIVATE_KEY=your_ethereum_private_key
   CHECKER_NODE_URL=https://your-node-url.com
   EOL

   # Configure PM2
   cat > ecosystem.config.js << EOL
   module.exports = {
     apps: [{
       name: 'device-checker',
       script: 'frontend/scripts/check-devices.ts',
       interpreter: 'ts-node',
       cron_restart: '*/2 * * * *',
       autorestart: false,
       watch: false,
       env: {
         NODE_ENV: 'production'
       }
     }]
   };
   EOL
   ```

4. **Node Registration**
   ```bash
   # Register your checker node
   curl -X POST https://frankyagent.xyz/api/register-checker \
     -H "Content-Type: application/json" \
     -d '{
       "walletAddress": "0x...",
       "serverUrl": "https://your-node-url.com"
     }'
   ```

5. **Start the Checker**
   ```bash
   # Start the checker process
   pm2 start ecosystem.config.js

   # Monitor the process
   pm2 logs device-checker

   # Enable startup persistence
   pm2 startup
   pm2 save
   ```

6. **Monitoring & Maintenance**
   ```bash
   # Check node status
   pm2 status device-checker

   # View logs
   pm2 logs device-checker

   # Update checker
   git pull
   npm install
   pm2 restart device-checker

   # Monitor metrics
   pm2 monit
   ```
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

## Akave Storage Integration

Franky utilizes Akave's storage infrastructure to provide reliable, decentralized storage on the Filecoin network. The system manages multiple specialized buckets for different types of data:

### Storage Architecture

- **Agent Marketplace Character Data Bucket**
  - Stores AI agent configurations and character data
  - Securely manages encrypted secrets via Lit Protocol
  - Maintains agent metadata and behavior parameters

- **Device Reputation Bucket**
  - Records device health metrics and performance data
  - Stores consensus-validated reputation scores
  - Maintains historical performance records

- **Agent Chat History Bucket**
  - Preserves conversation history between users and agents
  - Implements UUID-based file identification
  - Ensures data persistence and retrieval reliability

### Implementation

Key files implementing the storage functionality:

- **Core Storage Logic**
  - `src/lib/akave.ts`: Primary storage interface with retry mechanisms and bucket management
  - `src/utils/akave-storage.js`: Node.js-specific implementations for file operations
  - `agent-framework/src/utils/agent-fetcher.js`: Agent data management and character configuration storage

- **API Routes**
  - `src/app/api/akave/fetch-json/route.ts`: JSON data retrieval endpoint
  - `src/app/api/akave/upload-json-with-filename/route.ts`: File upload with custom naming
  - `src/app/api/akave/upload-character/route.ts`: Character data storage with encryption

- **Reputation Management**
  - `frontend/scripts/check-devices.js`: Device metrics storage
  - `frontend/scripts/view-reputations.ts`: Reputation data retrieval and analysis

The integration ensures all critical data in the Franky ecosystem is securely stored on Akave.

## Lilypad

Franky leverages Lilypad's multi-model orchestration system to provide intelligent task routing and specialized model selection, implemented in `agent-framework/src/endpoints/chat.js`. Unlike a single Ollama model approach, Lilypad enables:

### Specialized Model Selection
- **Task-Specific Models**:
  - `deepseek-r1:7b` for explanations
  - `phi4:14b` for critiques
  - `qwen2.5-coder:7b` for coding tasks
  - `mistral:7b` for math and optimization
  - `openthinker:7b` for creative tasks

### Intelligent Workflow
1. **Query Analysis**: An orchestrator model (`llama3.1:8b`) breaks down complex queries into subtasks
2. **Parallel Processing**: Multiple specialized models handle different aspects simultaneously
3. **Response Synthesis**: Results are combined into a coherent, character-aware response

While this approach costs more tokens per request than using a single Ollama model, it provides superior results for complex queries requiring multiple types of expertise.
