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
const AGENT_API_URL = 'http://3.88.107.110:8000';

// Metric weights for reputation calculation
const WEIGHTS = {
  SUCCESS_RATE: 0.6,    // 60% weight for success rate
  RESPONSE_TIME: 0.25,  // 25% weight for response time
  CONSISTENCY: 0.15     // 15% weight for consistency
};

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

// Types
type DeviceCheckResult = {
  deviceAddress: string;
  status: 'checked' | 'skipped' | 'error';
  reputationScore?: number;
  reason?: string;
  error?: string;
};

interface Stats {
  success: boolean;
  responseTime: number;
  statusCode: number;
  error?: string;
  characterVerified: boolean;
}

interface CheckResult {
  deviceAddress: string;
  stats: Stats;
  timestamp: string;
}

function newStats(): Stats {
  return {
    success: false,
    responseTime: 0,
    statusCode: 0,
    characterVerified: false
  };
}

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
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
  // Handle non-Error objects with message property
  if (isErrorWithMessage(error)) {
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
  }
  return 600;
}

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
async function checkDevice(device: any): Promise<DeviceCheckResult> {
  try {
    log(`Checking device ${device.id}...`);
    
    if (!device.ngrokLink) {
      log(`Skipping device ${device.id} - No ngrok URL found`);
      return {
        deviceAddress: device.id,
        status: 'skipped',
        reason: 'No ngrok URL found for this device',
      };
    }

    if (!device.agents || device.agents.length === 0) {
      log(`Skipping device ${device.id} - No agents found`);
      return {
        deviceAddress: device.id,
        status: 'skipped',
        reason: 'No agents found for this device',
      };
    }
    
    log(`Performing health check for device ${device.id} at ${device.ngrokLink}`);
    
    const retrievalResults = [];
    const agent = device.agents[0]; // Use the first agent for health checks
    
    for (let i = 0; i < NUM_RETRIEVALS; i++) {
      log(`Health check attempt ${i+1}/${NUM_RETRIEVALS} for agent ${agent.id}`);
      
      const result = await checkDeviceHealth(device.id, device.ngrokLink, agent);
      retrievalResults.push({
        success: result.stats.success,
        status: result.stats.statusCode,
        statusText: result.stats.error || 'OK',
        duration: result.stats.responseTime,
        characterVerified: result.stats.characterVerified,
        timestamp: result.timestamp
      });
      
      if (i < NUM_RETRIEVALS - 1) await sleep(1000);
    }
    
    // Calculate metrics
    const successfulRetrievals = retrievalResults.filter(r => r.success).length;
    const successRate = successfulRetrievals / retrievalResults.length;
    
    const successfulDurations = retrievalResults
      .filter(r => r.success)
      .map(r => r.duration);
    
    let responseTimeScore = 0;
    let avgResponseTime = 0;
    
    if (successfulDurations.length > 0) {
      avgResponseTime = successfulDurations.reduce((sum, duration) => sum + duration, 0) / successfulDurations.length;
      
      // Response time scoring based on latency thresholds
      if (avgResponseTime < 500) responseTimeScore = 1.0;      // Excellent: < 500ms
      else if (avgResponseTime < 1000) responseTimeScore = 0.9; // Very Good: < 1s
      else if (avgResponseTime < 2000) responseTimeScore = 0.8; // Good: < 2s
      else if (avgResponseTime < 5000) responseTimeScore = 0.6; // Fair: < 5s
      else responseTimeScore = 0.4;                            // Poor: >= 5s
    }
    
    // Calculate consistency using standard deviation
    let consistencyScore = 1.0;
    if (successfulDurations.length > 1) {
      const mean = avgResponseTime;
      const squaredDiffs = successfulDurations.map(d => Math.pow(d - mean, 2));
      const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / successfulDurations.length;
      const stdDev = Math.sqrt(variance);
      const normalizedStdDev = Math.min(stdDev / mean, 1);
      consistencyScore = 1 - normalizedStdDev;
    }
    
    // Calculate final reputation score
    const reputationScore = (
      (successRate * WEIGHTS.SUCCESS_RATE) + 
      (responseTimeScore * WEIGHTS.RESPONSE_TIME) + 
      (consistencyScore * WEIGHTS.CONSISTENCY)
    ) * 100;
    
    const finalScore = Math.round(reputationScore * 100) / 100;
    
    // Create reputation data with subnet metadata
    const reputationData = {
      deviceAddress: device.id,
      ngrokLink: device.ngrokLink,
      lastChecked: new Date().toISOString(),
      reputationScore: finalScore,
      retrievalStats: {
        successRate,
        averageResponseTime: avgResponseTime,
        totalChecks: retrievalResults.length
      },
      retrievalResults,
      _checkerMetadata: {
        subnet: CHECKER_SUBNET_NAME,
        version: CHECKER_SUBNET_VERSION,
        timestamp: new Date().toISOString(),
        verificationMethod: 'health-check',
        storageProtocol: 'filecoin',
        metrics: {
          successRate: { weight: WEIGHTS.SUCCESS_RATE, description: 'Rate of successful health checks' },
          responseTime: { weight: WEIGHTS.RESPONSE_TIME, description: 'Average response time for successful health checks' },
          consistency: { weight: WEIGHTS.CONSISTENCY, description: 'Consistency of response times' }
        }
      }
    };
    
    // Store in Akave (Filecoin)
    await storeReputationData(device.id, reputationData);
    
    log(`✅ Device ${device.id} check completed with reputation score: ${finalScore}`);
    return {
      deviceAddress: device.id,
      status: 'checked',
      reputationScore: finalScore
    };
    
  } catch (error: any) {
    log(`❌ Error checking device ${device.id}: ${error.message}`);
    return {
      deviceAddress: device.id,
      status: 'error',
      error: error.message
    };
  }
}

// Store reputation data in Akave (which stores on Filecoin)
async function storeReputationData(deviceAddress: string, reputationData: any) {
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

// Process devices in batches
async function processBatch(devices: any[], startIdx: number, batchSize: number): Promise<DeviceCheckResult[]> {
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
    const { data } = await client.query({
      query: GET_REGISTERED_DEVICES,
      variables: { limit: 100 }
    });
    
    const devices = data.devices;
    log(`Found ${devices.length} registered devices to check`);
    
    const results: DeviceCheckResult[] = [];
    for (let i = 0; i < devices.length; i += MAX_CONCURRENT_CHECKS) {
      const batchResults = await processBatch(devices, i, MAX_CONCURRENT_CHECKS);
      results.push(...batchResults);
      
      if (i + MAX_CONCURRENT_CHECKS < devices.length) {
        log('Waiting between batches to prevent network congestion...');
        await sleep(5000);
      }
    }
    
    // Generate summary
    const checked = results.filter(r => r.status === 'checked').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;
    
    log('🎯 Device check complete');
    log(`📊 Summary: ${checked} checked, ${skipped} skipped, ${errors} errors`);
    
    const checkedDevicesWithScores = results.filter(r => r.status === 'checked' && typeof r.reputationScore === 'number');
    
    if (checkedDevicesWithScores.length > 0) {
      const totalScore = checkedDevicesWithScores.reduce((sum, r) => sum + (r.reputationScore || 0), 0);
      const avgScore = totalScore / checkedDevicesWithScores.length;
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

async function checkDeviceHealth(deviceAddress: string, ngrokUrl: string, agent: any): Promise<CheckResult> {
  const startTime = Date.now();
  const stats = newStats();
  
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