# Franky Checker Network Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Reputation System](#reputation-system)
5. [Running a Checker Node](#running-a-checker-node)
6. [Technical Details](#technical-details)
7. [API Reference](#api-reference)
8. [Security Considerations](#security-considerations)

## Overview

The Franky Checker Network is a decentralized quality-of-service verification system for DePIN nodes. It implements a Byzantine fault-tolerant consensus mechanism to ensure reliable and tamper-proof device reputation scores.

### Key Features
- Multi-node consensus mechanism
- Cryptographically signed verifications
- Filecoin-based reputation storage
- Real-time device health monitoring
- Standardized reputation format
- Byzantine fault tolerance

## Architecture

### High-Level System Design
```
┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
│   Checker Node  │     │   Checker Node  │     │   Checker Node │
└────────┬────────┘     └────────┬────────┘     └───────┬────────┘
         │                       │                      │
         └───────────┬──────────┬───────────────────────┘
                     │          │
            ┌───────▼──────────▼───────┐
            │     Consensus Layer      │
            └───────────┬──────────────┘
                       │
            ┌──────────▼──────────┐
            │   Reputation Store  │
            │     (Filecoin)     │
            └────────────────────┘
```

### Data Flow
1. Checker nodes register with the network
2. Nodes are assigned devices to check (up to 3 per device)
3. Each node independently verifies device health
4. Results are signed and submitted
5. Consensus is reached through median metrics
6. Final reputation is stored on Filecoin

## Components

### 1. Checker Node
The base unit of the verification network. Each node:
- Has a unique Ethereum address
- Signs its verification results
- Participates in consensus rounds
- Stores verification history

### 2. Consensus Manager
Implements Byzantine fault-tolerant consensus:
```typescript
class ConsensusManager {
  // Minimum requirements
  minCheckers: number = 3;
  consensusThreshold: number = 0.67;  // 67% agreement required

  // Consensus process
  1. Collect votes from checkers
  2. Verify signatures
  3. Calculate median metrics
  4. Generate verification proof
  5. Store final reputation
}
```

### 3. Reputation Storage
All reputation data is stored on Filecoin via Akave buckets:
- Bucket: `device-reputation`
- File format: `{deviceAddress}-{timestamp}.json`
- Storage protocol: Filecoin
- Access: Public, immutable

## Reputation System

### Metrics Collection
Each checker node collects three categories of metrics:

1. **Availability Metrics**
   ```typescript
   {
     uptime: number;           // % of successful responses
     responseTime: number;     // Average response time (ms)
     consistency: number;      // Standard deviation of times
     lastSeen: string;        // ISO timestamp
   }
   ```

2. **Performance Metrics**
   ```typescript
   {
     throughput: number;      // Requests/second
     errorRate: number;       // % of failed requests
     latency: {
       p50: number;          // 50th percentile
       p95: number;          // 95th percentile
       p99: number;          // 99th percentile
     }
   }
   ```

3. **Security Metrics**
   ```typescript
   {
     tlsVersion: string;     // TLS version
     certificateValid: boolean; // SSL/TLS validity
     lastUpdated: string;    // ISO timestamp
   }
   ```

### Score Calculation
Reputation scores are calculated using weighted metrics:

```typescript
const weights = {
  availability: 0.5,    // 50% weight
  performance: 0.3,     // 30% weight
  security: 0.2         // 20% weight
};

// Final score formula
score = (
  (availabilityScore * 0.5) +
  (performanceScore * 0.3) +
  (securityScore * 0.2)
) * 100;
```

## Running a Checker Node

### Prerequisites
- Node.js v18+
- Ethereum wallet with private key
- Server with public HTTPS endpoint
- 2GB+ RAM
- Stable internet connection

### Step 1: Installation
```bash
# Clone the repository
git clone https://github.com/your-repo/franky.git
cd franky

# Install dependencies
npm install

# Install PM2 globally
npm install -g pm2
```

### Step 2: Configuration
1. Create a `.env` file:
```env
CHECKER_PRIVATE_KEY=your_ethereum_private_key
CHECKER_NODE_URL=https://your-node-url.com
```

2. Configure PM2:
```javascript
// ecosystem.config.js
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
```

### Step 3: Registration
```bash
# Register your checker node
curl -X POST https://frankyagent.xyz/api/register-checker \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x...",
    "serverUrl": "https://your-node-url.com"
  }'
```

### Step 4: Start the Checker
```bash
# Start the checker process
pm2 start ecosystem.config.js

# Monitor the process
pm2 logs device-checker

# Set PM2 to start on system boot
pm2 startup
pm2 save
```

## Technical Details

### Consensus Process

1. **Round Initialization**
   ```typescript
   const round = {
     roundId: generateRoundId(),
     startTime: new Date().toISOString(),
     participants: [checkerAddress],
     votes: [],
     status: 'active'
   };
   ```

2. **Vote Collection**
   - Each checker submits signed votes
   - Votes include metrics and timestamp
   - Signatures are verified on submission

3. **Consensus Calculation**
   ```typescript
   // Required conditions
   if (votes.length >= minCheckers && 
       votes.length >= round.participants.length * consensusThreshold) {
     // Calculate median metrics
     const consensusMetrics = calculateMedianMetrics(votes);
     // Generate final score
     const finalScore = calculateScore(consensusMetrics);
   }
   ```

4. **Verification Chain**
   ```typescript
   interface VerificationProof {
     checkerId: string;
     timestamp: string;
     signature: string;
     nonce: string;
     blockHeight: number;
     previousProofHash: string;
   }
   ```

### API Reference

1. **Register Checker Node**
   ```http
   POST /api/register-checker
   Content-Type: application/json

   {
     "walletAddress": "0x...",
     "serverUrl": "https://..."
   }
   ```

2. **Get Assigned Devices**
   ```http
   GET /api/checker-tasks?checkerAddress=0x...
   ```

3. **Submit Check Results**
   ```http
   POST /api/checker-tasks
   Content-Type: application/json

   {
     "checkerAddress": "0x...",
     "deviceId": "0x...",
     "metrics": {...},
     "signature": "0x..."
   }
   ```

### Security Considerations

1. **Sybil Resistance**
   - Each checker must have a unique Ethereum address
   - Minimum stake requirement (planned)
   - Reputation tracking for checkers (planned)

2. **Byzantine Fault Tolerance**
   - Minimum 3 checkers per device
   - 67% consensus threshold
   - Median metrics calculation
   - Cryptographic verification chain

3. **Data Integrity**
   - All votes are signed
   - Immutable storage on Filecoin
   - Verification proofs with previous hash

4. **Attack Prevention**
   - Rate limiting
   - Signature verification
   - Checker node validation
   - Consensus requirements

## Monitoring and Maintenance

### Viewing Reputation Data
```bash
# View all device reputations
ts-node frontend/scripts/view-reputations.ts

# View specific device
ts-node frontend/scripts/view-reputations.ts --device 0x...
```

### Checker Node Maintenance
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

### Troubleshooting
1. Check node logs: `pm2 logs device-checker`
2. Verify node registration: `curl https://frankyagent.xyz/api/checker-tasks?checkerAddress=0x...`
3. Test device connectivity: `curl https://your-node-url.com/health`
4. Monitor Filecoin storage: Check Akave bucket status

## Future Enhancements
1. Checker staking mechanism
2. Cross-checker verification
3. Dynamic consensus thresholds
4. Checker reputation system
5. Enhanced Byzantine fault tolerance
6. Automated checker rewards 