# Migration to Hedera Consensus Service for Reputation System

This document explains the migration of Franky's device reputation system from Akave/Filecoin storage to the Hedera Consensus Service (HCS).

## Overview

The device checker and reputation system has been migrated to use Hedera Consensus Service (HCS) for all aspects of the device reputation system:

1. Checker node registration
2. Device reputation checks
3. Consensus calculation for reputation scores
4. Immutable storage of all reputation data

This migration eliminates the dependency on Akave/Filecoin storage and provides a more robust, consensus-driven system for device reputation management.

## Architecture

The HCS-based reputation system uses the following architecture:

### Topic Structure

1. **Checker Registry Topic**: Stores checker node registrations and heartbeats
2. **Device Registry Topic**: Maintains mappings between device addresses and their dedicated reputation topics
3. **Device Reputation Topics**: Each device has a dedicated topic for storing reputation check results

### Message Types

1. `REGISTER_CHECKER`: Register a new checker node
2. `CHECKER_HEARTBEAT`: Periodic heartbeat from checker nodes
3. `DEVICE_CHECK`: Results of a device reputation check
4. `DEVICE_TOPIC_MAPPING`: Maps device addresses to their HCS topics

### Consensus Mechanism

The reputation score is calculated using a democratic consensus approach:

1. Multiple checker nodes independently evaluate device health
2. Each checker submits results to the device's HCS topic
3. The system calculates the median values for key metrics to prevent outlier manipulation
4. The final reputation score is derived from these consensus metrics

## Environment Configuration

To set up the HCS-based system, configure the following environment variables:

```
# Hedera Network Configuration
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.123456
HEDERA_OPERATOR_KEY=your-private-key-here

# Optional: Pre-existing HCS topics (if not provided, they will be created)
# DEVICE_REGISTRY_TOPIC_ID=0.0.123456
# CHECKER_REGISTRY_TOPIC_ID=0.0.123457
```

## API Endpoints

The API endpoints have been updated to use HCS but maintain backward compatibility:

1. `/api/register-checker`: Registers checker nodes on HCS
2. `/api/checker-tasks`: Assigns devices to checkers and accepts check results
3. `/api/device-checker`: Retrieves reputation data from HCS

## Differences from Previous Implementation

1. **Improved Immutability**: All reputation data is stored with consensus timestamps in HCS
2. **Democratic Consensus**: Multiple checkers contribute to reputation calculation
3. **Simplified Architecture**: Eliminated need for Akave/Filecoin integration
4. **Transparent Audit Trail**: Complete history of all device reputation checks
5. **No Custom Fees**: Monetization via HIP-991 is not implemented in this version

## Installation and Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   ```
   cp .env.local.example .env.local
   ```

3. Edit `.env.local` with your Hedera credentials

4. Run the application:
   ```
   npm run dev
   ```

## Migration Notes

When the system first starts, it will automatically:

1. Create the necessary HCS topics if they don't exist
2. Begin capturing new reputation data in HCS
3. Calculate reputation scores based on HCS consensus

Historical reputation data from the previous system is not migrated to HCS. 