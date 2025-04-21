#!/usr/bin/env ts-node
/**
 * Franky Device Checker Subnet
 * 
 * A Checker Network subnet that verifies and scores device reliability in the Franky network.
 * All reputation data is stored on Filecoin via Akave buckets.
 */

import { ApolloClient, InMemoryCache, gql, NormalizedCacheObject, HttpLink } from '@apollo/client';
import fetch, { Response, RequestInit } from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { formatISO } from 'date-fns';
import FormData from 'form-data';
import { ethers } from 'ethers';
import { ConsensusManager } from '../lib/consensus';
import type { CheckerMetrics, StandardizedReputation } from '../types/checker-network';
import { CheckerNode, getOrCreateCheckerNode } from '../lib/checker-node';

// Fix for TypeScript error with node-fetch
declare global {
  interface RequestInit {
    timeout?: number;
  }
}

// Checker Subnet Configuration
const CHECKER_SUBNET_NAME = 'franky-device-checker';
const CHECKER_SUBNET_VERSION = '1.0.0';
const AKAVE_API_URL = 'http://3.88.107.110:8000';
const DEVICE_REPUTATION_BUCKET = 'device-reputation';
const NUM_RETRIEVALS = 5;
const LOG_DIR = path.join(process.cwd(), 'logs');
const MAX_CONCURRENT_CHECKS = 5;

// Initialize GraphQL client
const client = new ApolloClient({
  link: new HttpLink({ 
    uri: 'https://api.thegraph.com/subgraphs/name/marshal-am/franky-service', 
    fetch: fetch as any 
  }),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'no-cache',
    },
  },
});

// GraphQL query
const GET_REGISTERED_DEVICES = gql`
  query GetRegisteredDevices($limit: Int!) {
    devices(first: $limit) {
      id
      owner {
        id
      }
      ngrokLink
      deviceMetadata
      hostingFee
      createdAt
      agents {
        id
        characterConfig
        perApiCallFee
        subname
      }
    }
  }
`;

// Initialize consensus manager
// In production, this would be loaded from secure environment variables
const CHECKER_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const consensusManager = new ConsensusManager(
  '0x1234567890123456789012345678901234567890', // Checker ID (would be derived from private key)
  CHECKER_PRIVATE_KEY
);

// Initialize checker node
let checkerNode: CheckerNode;

// Ensure log directory exists
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    log(`Created log directory: ${LOG_DIR}`);
  }
}

// Log messages with timestamp
function log(message: string) {
  const now = new Date();
  const timestamp = formatISO(now);
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);

  const logFile = path.join(LOG_DIR, `device-checker-${now.toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Helper function to delay execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Check device's character retrieval performance
async function checkDevice(device: any): Promise<StandardizedReputation | null> {
  try {
    log(`Checking device ${device.id}...`);
    
    if (!device.ngrokLink) {
      log(`Skipping device ${device.id} - No ngrok URL found`);
      return null;
    }

    if (!device.agents || device.agents.length === 0) {
      log(`Skipping device ${device.id} - No agents found`);
      return null;
    }
    
    // Collect metrics
    const metrics = await collectDeviceMetrics(device);
    
    // Sign the check results
    const checkResult = {
      deviceId: device.id,
      metrics,
      timestamp: new Date().toISOString()
    };
    
    const signature = await checkerNode.signCheck(device.id, checkResult);
    
    // Store the signed check result
    const reputation: StandardizedReputation = {
      version: '1.0.0',
      networkId: 'checker-network-mainnet',
      subnetId: 'franky-device-checker',
      deviceId: device.id,
      round: {
        roundId: `${Date.now()}`,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        participants: [checkerNode.address],
        votes: [{
          checkerId: checkerNode.address,
          deviceId: device.id,
          timestamp: new Date().toISOString(),
          metrics,
          signature
        }],
        finalScore: calculateScore(metrics),
        status: 'complete'
      },
      quorum: 1, // For now, we only have one checker
      consensusThreshold: 1,
      proof: {
        checkerId: checkerNode.address,
        timestamp: new Date().toISOString(),
        signature,
        nonce: Date.now().toString(),
        blockHeight: 0, // This would come from the blockchain
        previousProofHash: '0x0' // This would be the hash of the previous check
      },
      metrics,
      checks: [{
        success: true,
        timestamp: new Date().toISOString(),
        duration: metrics.availability.responseTime,
        statusCode: 200,
        metrics
      }],
      previousReputationHash: '0x0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      storageProtocol: 'filecoin',
      storageDetails: {
        bucket: 'device-reputation',
        path: `${device.id}/${Date.now()}.json`
      }
    };
    
    // Store in Akave (Filecoin)
    await storeReputationData(device.id, reputation);
    
    log(`✅ Device ${device.id} check completed with reputation score: ${reputation.round.finalScore?.toFixed(2)}`);
    return reputation;
    
  } catch (error: any) {
    log(`❌ Error checking device ${device.id}: ${error.message}`);
    return null;
  }
}

// Collect comprehensive metrics for a device
async function collectDeviceMetrics(device: any): Promise<CheckerMetrics> {
  const startTime = Date.now();
  const results = [];
  
  for (let i = 0; i < NUM_RETRIEVALS; i++) {
    const result = await checkDeviceHealth(device.id, device.ngrokLink, device.agents[0]);
    results.push(result);
    if (i < NUM_RETRIEVALS - 1) await sleep(1000);
  }
  
  const successfulResults = results.filter(r => r.stats.success);
  const uptime = (successfulResults.length / results.length) * 100;
  const responseTimes = successfulResults.map(r => r.stats.responseTime);
  
  // Calculate latency percentiles
  const sortedTimes = [...responseTimes].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
  
  // Calculate consistency (standard deviation)
  const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / responseTimes.length;
  const consistency = Math.sqrt(variance);
  
  return {
    availability: {
      uptime,
      responseTime: avgTime,
      consistency,
      lastSeen: new Date().toISOString()
    },
    performance: {
      throughput: successfulResults.length / ((Date.now() - startTime) / 1000),
      errorRate: (results.length - successfulResults.length) / results.length,
      latency: { p50, p95, p99 }
    },
    security: {
      tlsVersion: 'TLS 1.3', // This should be actually detected
      certificateValid: true, // This should be actually verified
      lastUpdated: new Date().toISOString()
    }
  };
}

// Store reputation data in Akave (which stores on Filecoin)
async function storeReputationData(deviceAddress: string, reputationData: StandardizedReputation) {
  try {
    log(`Storing reputation data for device ${deviceAddress} on Filecoin via Akave...`);
    
    // Ensure bucket exists
    await ensureBucket();
    
    const formData = new FormData();
    const jsonData = JSON.stringify(reputationData, null, 2);
    const filename = `${deviceAddress.toLowerCase()}-${Date.now()}.json`;
    
    formData.append('file', Buffer.from(jsonData), {
      filename,
      contentType: 'application/json',
    });
    
    const uploadResponse = await fetch(`${AKAVE_API_URL}/buckets/${DEVICE_REPUTATION_BUCKET}/files`, {
      method: 'POST',
      body: formData as any,
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload to Filecoin: ${uploadResponse.status}`);
    }
    
    log(`✅ Reputation data stored on Filecoin for device ${deviceAddress}`);
    return true;
    
  } catch (error: any) {
    log(`❌ Error storing reputation data on Filecoin: ${error.message}`);
    return false;
  }
}

// Ensure Akave bucket exists
async function ensureBucket() {
  try {
    const checkResponse = await fetch(`${AKAVE_API_URL}/buckets/${DEVICE_REPUTATION_BUCKET}`);
    if (checkResponse.ok) return;
    
    log(`Creating new Filecoin storage bucket: ${DEVICE_REPUTATION_BUCKET}`);
    const createResponse = await fetch(`${AKAVE_API_URL}/buckets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: DEVICE_REPUTATION_BUCKET })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create Filecoin bucket: ${createResponse.status}`);
    }
  } catch (error: any) {
    log(`❌ Error ensuring Filecoin bucket exists: ${error.message}`);
    throw error;
  }
}

// Get current block height (simulated for now)
async function getCurrentBlockHeight(): Promise<number> {
  // In production, this would fetch the actual block height from a node
  return Math.floor(Date.now() / 1000);
}

// Process devices in batches
async function processBatch(devices: any[], startIdx: number, batchSize: number): Promise<(StandardizedReputation | null)[]> {
  const endIdx = Math.min(startIdx + batchSize, devices.length);
  const batch = devices.slice(startIdx, endIdx);
  
  log(`Processing batch of ${batch.length} devices (${startIdx + 1} to ${endIdx} of ${devices.length})`);
  
  const results = await Promise.all(batch.map(device => checkDevice(device)));
  return results;
}

// Main function
async function main() {
  ensureLogDir();
  log(`Starting Franky Device Checker Subnet v${CHECKER_SUBNET_VERSION}`);
  
  try {
    // Initialize checker node
    checkerNode = await getOrCreateCheckerNode();
    log(`Checker node initialized with address: ${checkerNode.address}`);
    
    const { data } = await client.query({
      query: GET_REGISTERED_DEVICES,
      variables: { limit: 100 }
    });
    
    const devices = data.devices;
    log(`Found ${devices.length} registered devices to check`);
    
    const results: (StandardizedReputation | null)[] = [];
    for (let i = 0; i < devices.length; i += MAX_CONCURRENT_CHECKS) {
      const batchResults = await processBatch(devices, i, MAX_CONCURRENT_CHECKS);
      results.push(...batchResults);
      
      if (i + MAX_CONCURRENT_CHECKS < devices.length) {
        log('Waiting between batches to prevent network congestion...');
        await sleep(5000);
      }
    }
    
    // Generate summary
    const checked = results.filter(r => r !== null).length;
    const skipped = devices.length - checked;
    
    log('🎯 Device check complete');
    log(`📊 Summary: ${checked} checked, ${skipped} skipped`);
    
    const validResults = results.filter((r): r is StandardizedReputation => r !== null);
    if (validResults.length > 0) {
      const totalScore = validResults.reduce((sum, r) => sum + (r.round.finalScore || 0), 0);
      const avgScore = totalScore / validResults.length;
      log(`📈 Average network reputation score: ${avgScore.toFixed(2)}`);
    }
    
  } catch (error: any) {
    log(`❌ Error in main process: ${error.message}`);
    process.exit(1);
  }
}

// Run the subnet
main().catch(error => {
  log(`❌ Unhandled error in Checker subnet: ${error.message}`);
  process.exit(1);
});

async function checkDeviceHealth(deviceAddress: string, ngrokUrl: string, agent: any) {
  const startTime = Date.now();
  const stats = {
    success: false,
    responseTime: 0,
    statusCode: 0,
    error: undefined as string | undefined,
    characterVerified: false
  };
  
  try {
    // Ensure ngrokUrl ends with a trailing slash
    const baseUrl = ngrokUrl.endsWith('/') ? ngrokUrl : `${ngrokUrl}/`;
    const healthEndpoint = `${baseUrl}api/chat/health`;

    // Step 1: Make POST request to health endpoint with agent address
    const healthResponse = await fetch(healthEndpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agentAddress: agent.id,
        deviceAddress: deviceAddress
      }),
      // @ts-ignore
      timeout: 15000
    });

    if (!healthResponse.ok) {
      const error = await healthResponse.text();
      throw new Error(`Health check failed: ${error}`);
    }

    const healthData = await healthResponse.json();
    
    if (!healthData.success) {
      throw new Error('Health check returned unsuccessful status');
    }

    // Step 2: Fetch the character file from the URL returned by health check
    if (!healthData.characterUrl) {
      throw new Error('No character URL returned from health check');
    }

    const characterResponse = await fetch(healthData.characterUrl, {
      // @ts-ignore
      timeout: 15000
    });

    if (!characterResponse.ok) {
      throw new Error(`Failed to fetch character file: ${characterResponse.status}`);
    }

    const characterData = await characterResponse.json();
    
    // Step 3: Compare the fetched character data with agent's character config
    const agentCharacterData = await fetch(agent.characterConfig, {
      // @ts-ignore
      timeout: 15000
    }).then(res => res.json());

    // Deep compare the character configurations
    const characterMatch = JSON.stringify(characterData) === JSON.stringify(agentCharacterData);
    
    if (!characterMatch) {
      throw new Error('Character configuration mismatch');
    }

    // Record successful health check
    stats.success = true;
    stats.responseTime = Date.now() - startTime;
    stats.statusCode = healthResponse.status;
    stats.characterVerified = true;

    return {
      deviceAddress,
      stats,
      timestamp: new Date().toISOString()
    };

  } catch (error: unknown) {
    // Record failed health check
    stats.success = false;
    stats.responseTime = Date.now() - startTime;
    stats.error = error instanceof Error ? error.message : 'Unknown error';
    stats.statusCode = mapErrorToStatusCode(error);
    stats.characterVerified = false;

    return {
      deviceAddress,
      stats,
      timestamp: new Date().toISOString()
    };
  }
}

function mapErrorToStatusCode(error: unknown): number {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('etimedout') || message.includes('timeout')) {
      return 701;
    }
    if (message.includes('econnrefused')) {
      return 702;
    }
    if (message.includes('enotfound')) {
      return 703;
    }
    if (message.includes('invalid car')) {
      return 801;
    }
    if (message.includes('invalid block')) {
      return 802;
    }
    if (message.includes('invalid cid')) {
      return 803;
    }
  }
  return 600;
}

// Calculate final score based on metrics
function calculateScore(metrics: CheckerMetrics): number {
  const weights = {
    availability: 0.5,
    performance: 0.3,
    security: 0.2
  };

  const availabilityScore = (
    (metrics.availability.uptime / 100) * 0.6 +
    (1 - Math.min(metrics.availability.responseTime / 5000, 1)) * 0.4
  ) * weights.availability;

  const performanceScore = (
    (1 - metrics.performance.errorRate) * 0.4 +
    (metrics.performance.throughput / 100) * 0.3 +
    (1 - Math.min(metrics.performance.latency.p95 / 1000, 1)) * 0.3
  ) * weights.performance;

  const securityScore = (
    (metrics.security.certificateValid ? 1 : 0)
  ) * weights.security;

  return (availabilityScore + performanceScore + securityScore) * 100;
} 