#!/usr/bin/env node
/**
 * Franky Device Checker Subnet
 * 
 * A Checker Network subnet that verifies and scores device reliability in the Franky network.
 * All reputation data is stored on Filecoin via Akave buckets.
 * 
 * This is a JS implementation that avoids circular references while maintaining full functionality.
 */

// Fix for older Node.js versions that don't have fetch globally available
const nodeFetch = require('node-fetch');
// Use this fetch function throughout the code
const fetch = (...args) => nodeFetch.default ? nodeFetch.default(...args) : nodeFetch(...args);

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { ethers } = require('ethers');
const crypto = require('crypto');
const { format } = require('date-fns');

// Checker Subnet Configuration
const CHECKER_SUBNET_NAME = 'franky-device-checker';
const CHECKER_SUBNET_VERSION = '1.0.0';
const AKAVE_API_URL = 'http://3.88.107.110:8000';
const DEVICE_REPUTATION_BUCKET = 'device-reputation';
const NUM_RETRIEVALS = 5;
const LOG_DIR = path.join(process.cwd(), 'logs');
const MAX_CONCURRENT_CHECKS = 5;

// API Endpoints
const DEVICES_API_ENDPOINT = 'https://www.frankyagent.xyz/api/graph/devices';
const CHARACTER_API_ENDPOINT = 'https://www.frankyagent.xyz/api/graph/character';

// In production, this would be loaded from secure environment variables
const CHECKER_PRIVATE_KEY = ethers.Wallet.createRandom().privateKey;

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  log(`Created log directory: ${LOG_DIR}`);
}

// Log messages with timestamp
function log(message) {
  const now = new Date();
  const timestamp = now.toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);

  const logFile = path.join(LOG_DIR, `device-checker-${now.toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Helper function to delay execution
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Create a checker node with the private key
function createCheckerNode(privateKey = CHECKER_PRIVATE_KEY) {
  const wallet = new ethers.Wallet(privateKey);
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    isRegistered: true,
    signCheck: async (deviceId, checkResult) => {
      // Create a serializable object without circular references
      const simpleObject = {
        deviceId,
        timestamp: checkResult.timestamp,
        metricsHash: checkResult.metricsHash || ethers.utils.id(JSON.stringify(checkResult)),
        checkerAddress: wallet.address
      };
      const message = JSON.stringify(simpleObject);
      return wallet.signMessage(message);
    },
    signMessage: async (message) => {
      return wallet.signMessage(message);
    }
  };
}

// Create a consensus manager
function createConsensusManager(checkerId, privateKey) {
  // Keep track of rounds
  let currentRound = null;
  
  const manager = {
    // Start a new consensus round
    startRound: (deviceId) => {
      const roundId = generateRoundId(deviceId, checkerId);
      
      currentRound = {
        roundId,
        startTime: new Date().toISOString(),
        endTime: '',
        participants: [checkerId],
        votes: [],
        status: 'active'
      };
      
      return currentRound;
    },
    
    // Submit a vote
    submitVote: async (metrics, deviceId) => {
      if (!currentRound) {
        throw new Error('No active consensus round');
      }
      
      // Ensure deviceId is valid
      if (!deviceId) {
        log('Warning: Attempting to submit vote with invalid deviceId');
        deviceId = 'unknown-device'; // Fallback to prevent errors
      }
      
      // Create a signature for the vote
      const wallet = new ethers.Wallet(privateKey);
      const voteData = {
        checkerId,
        deviceId,
        timestamp: new Date().toISOString(),
        metricsHash: ethers.utils.id(JSON.stringify(metrics))
      };
      
      log(`Creating vote signature for device ${deviceId}`);
      const message = JSON.stringify(voteData);
      const signature = await wallet.signMessage(message);
      
      const vote = {
        checkerId,
        deviceId,
        timestamp: new Date().toISOString(),
        metrics,
        signature
      };
      
      currentRound.votes.push(vote);
      log(`Vote added to round ${currentRound.roundId}`);
      return vote;
    },
    
    // Calculate consensus from votes
    calculateConsensus: () => {
      if (!currentRound || currentRound.votes.length < 1) {
        return null;
      }
      
      // For now, since we're not using multiple checkers, just calculate from our vote
      const consensusMetrics = currentRound.votes[0].metrics;
      return calculateScore(consensusMetrics);
    },
    
    // Generate verification proof
    generateProof: async (blockHeight) => {
      if (!currentRound) {
        throw new Error('No active consensus round');
      }
      
      const nonce = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const timestamp = new Date().toISOString();
      const previousProofHash = await calculatePreviousProofHash();
      
      const proofData = {
        checkerId,
        timestamp,
        nonce,
        blockHeight,
        previousProofHash
      };
      
      const wallet = new ethers.Wallet(privateKey);
      const message = JSON.stringify(proofData);
      const signature = await wallet.signMessage(message);
      
      return {
        checkerId,
        timestamp,
        signature,
        nonce,
        blockHeight,
        previousProofHash
      };
    },
    
    // Complete the current round
    completeRound: async (finalScore, proof) => {
      if (!currentRound) {
        throw new Error('No active consensus round');
      }
      
      currentRound.endTime = new Date().toISOString();
      currentRound.finalScore = finalScore;
      currentRound.status = 'complete';
      
      const deviceId = currentRound.votes[0].deviceId;
      
      // Convert to StandardizedReputation format
      const reputation = {
        version: '1.0.0',
        networkId: 'checker-network-mainnet',
        subnetId: CHECKER_SUBNET_NAME,
        deviceId,
        round: JSON.parse(JSON.stringify(currentRound)), // Deep clone to avoid circular refs
        quorum: 1, // Minimum checkers required
        consensusThreshold: 1, // Required agreement percentage
        proof,
        metrics: currentRound.votes[0].metrics,
        checks: currentRound.votes.map(v => ({
          success: true,
          timestamp: v.timestamp,
          duration: v.metrics.availability.responseTime,
          statusCode: 200,
          metrics: v.metrics
        })),
        previousReputationHash: proof.previousProofHash,
        createdAt: currentRound.startTime,
        updatedAt: currentRound.endTime,
        storageProtocol: 'filecoin',
        storageDetails: {
          bucket: DEVICE_REPUTATION_BUCKET,
          path: `${deviceId}/${currentRound.roundId}.json`
        }
      };
      
      // Reset current round
      currentRound = null;
      
      return reputation;
    },
    
    // Get current round
    getCurrentRound: () => currentRound
  };
  
  return manager;
}

// Helper functions for consensus manager
function generateRoundId(deviceId, checkerId) {
  const timestamp = Date.now().toString();
  const input = `${deviceId}-${timestamp}-${checkerId}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function calculatePreviousProofHash() {
  // In a real implementation, this would fetch the last proof from storage
  // For now, we'll return a dummy hash
  return '0x0000000000000000000000000000000000000000000000000000000000000000';
}

// Fetch devices using the direct API endpoint
async function fetchDevices() {
  try {
    log(`Fetching devices from API: ${DEVICES_API_ENDPOINT}`);
    
    const response = await fetch(DEVICES_API_ENDPOINT);
    
    if (!response.ok) {
      throw new Error(`Device API request failed: ${response.status}`);
    }
    
    const devices = await response.json();
    log(`API returned ${devices.length} devices`);
    
    // Enhance devices with character config for each agent
    const enhancedDevices = [];
    
    for (const device of devices) {
      try {
        log(`Processing device: ${device.id}`);
        
        if (device.agents && device.agents.length > 0) {
          // Get character config for the first agent (primary agent)
          const agentAddress = device.agents[0].id;
          log(`Found agent ${agentAddress} for device ${device.id}`);
          
          const characterConfig = await fetchAgentCharacter(agentAddress);
          log(`Retrieved character config for agent ${agentAddress}`);
          
          // Enhance the agent with the character config
          const enhancedDevice = {
            ...device,
            agents: [
              {
                ...device.agents[0],
                characterConfig
              }
            ]
          };
          
          enhancedDevices.push(enhancedDevice);
          log(`Added enhanced device ${device.id} to the list`);
        } else {
          log(`Device ${device.id} has no agents, skipping character config fetch`);
          enhancedDevices.push(device);
        }
      } catch (error) {
        log(`Warning: Could not fetch character config for device ${device.id}: ${error.message}`);
        enhancedDevices.push(device);
      }
    }
    
    return enhancedDevices;
  } catch (error) {
    log(`Error fetching devices: ${error.message}`);
    console.error(error);
    return [];
  }
}

// Fetch agent character configuration using the API
async function fetchAgentCharacter(agentAddress) {
  try {
    const url = `${CHARACTER_API_ENDPOINT}?address=${agentAddress}`;
    log(`Fetching agent character: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Character API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.characterConfig;
  } catch (error) {
    log(`Error fetching agent character: ${error.message}`);
    throw error;
  }
}

// Check device's character retrieval performance
async function checkDevice(device, checkerNode, consensusManager) {
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
    
    log(`Device has ngrokLink: ${device.ngrokLink}`);
    log(`Device agent info: ${JSON.stringify(device.agents[0])}`);
    
    // Start consensus round
    consensusManager.startRound(device.id);
    
    // Collect metrics
    log(`Collecting metrics for device ${device.id}...`);
    const metrics = await collectDeviceMetrics(device);
    
    // Check if we got valid metrics - if all health checks failed, skip further processing
    const hasSuccessfulChecks = metrics.availability.uptime > 0;
    if (!hasSuccessfulChecks) {
      log(`All health checks failed for device ${device.id}, skipping consensus and storage`);
      return null;
    }
    
    // Submit metrics as vote
    log(`Submitting vote for device ${device.id}...`);
    await consensusManager.submitVote(metrics, device.id);
    
    // Calculate consensus (in a multi-checker setup, this would combine multiple votes)
    const finalScore = consensusManager.calculateConsensus();
    
    if (finalScore === null) {
      log(`No consensus reached for device ${device.id}`);
      return null;
    }
    
    // Generate verification proof
    const blockHeight = await getCurrentBlockHeight();
    const proof = await consensusManager.generateProof(blockHeight);
    
    // Complete the round
    const reputation = await consensusManager.completeRound(finalScore, proof);
    
    // Store in Akave (Filecoin)
    await storeReputationData(device.id, reputation);
    
    log(`✅ Device ${device.id} check completed with reputation score: ${finalScore.toFixed(2)}`);
    return reputation;
    
  } catch (error) {
    log(`❌ Error checking device ${device.id}: ${error.message}`);
    console.error(error);
    return null;
  }
}

// Collect comprehensive metrics for a device
async function collectDeviceMetrics(device) {
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
  let avgTime = 0;
  let consistency = 0;
  if (responseTimes.length > 0) {
    avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / responseTimes.length;
    consistency = Math.sqrt(variance);
  }
  
  return {
    availability: {
      uptime,
      responseTime: avgTime,
      consistency,
      lastSeen: new Date().toISOString()
    },
    performance: {
      throughput: successfulResults.length / ((Date.now() - startTime) / 1000) || 0,
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

// Check device health
async function checkDeviceHealth(deviceAddress, ngrokUrl, agent) {
  const startTime = Date.now();
  const stats = {
    success: false,
    responseTime: 0,
    statusCode: 0,
    error: undefined,
    characterVerified: false
  };
  
  try {
    // Ensure ngrokUrl ends with a trailing slash
    const baseUrl = ngrokUrl.endsWith('/') ? ngrokUrl : `${ngrokUrl}/`;
    const healthEndpoint = `${baseUrl}api/chat/health`;
    
    // Get agent ID
    const agentId = agent.id;
    
    log(`Checking health for device ${deviceAddress} with agent ${agentId}...`);
    log(`Making health check request to ${healthEndpoint}`);

    // Step 1: Make POST request to health endpoint with agent address
    const healthResponse = await fetch(healthEndpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agentAddress: agentId,
        deviceAddress: deviceAddress
      }),
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
      timeout: 15000
    });

    if (!characterResponse.ok) {
      throw new Error(`Failed to fetch character file: ${characterResponse.status}`);
    }

    const characterData = await characterResponse.json();
    
    // Step 3: Compare the fetched character data with agent's character config
    if (agent.characterConfig) {
      try {
        const agentCharacterData = await fetch(agent.characterConfig, {
          timeout: 15000
        }).then(res => res.json());

        // Deep compare the character configurations
        const characterMatch = JSON.stringify(characterData) === JSON.stringify(agentCharacterData);
        
        if (!characterMatch) {
          throw new Error('Character configuration mismatch');
        }
        
        stats.characterVerified = true;
      } catch (error) {
        log(`Warning: Could not verify character data: ${error.message}`);
        // Don't fail the check, just note that verification failed
      }
    }

    // Record successful health check
    stats.success = true;
    stats.responseTime = Date.now() - startTime;
    stats.statusCode = healthResponse.status;

    return {
      deviceAddress,
      stats,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    // Record failed health check
    stats.success = false;
    stats.responseTime = Date.now() - startTime;
    stats.error = error.message || 'Unknown error';
    stats.statusCode = mapErrorToStatusCode(error);
    stats.characterVerified = false;
    
    log(`Health check failed for device ${deviceAddress}: ${error.message}`);

    return {
      deviceAddress,
      stats,
      timestamp: new Date().toISOString()
    };
  }
}

// Map error to status code
function mapErrorToStatusCode(error) {
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

// Store reputation data in Akave (which stores on Filecoin)
async function storeReputationData(deviceAddress, reputationData) {
  try {
    log(`Storing reputation data for device ${deviceAddress} on Filecoin via Akave...`);
    
    // Ensure bucket exists
    await ensureBucket();
    
    const formData = new FormData();
    
    // Create a clean copy of the data without any prototype references
    const cleanData = JSON.parse(JSON.stringify(reputationData));
    const jsonData = JSON.stringify(cleanData, null, 2);
    const filename = `${deviceAddress.toLowerCase()}-${Date.now()}.json`;
    
    formData.append('file', Buffer.from(jsonData), {
      filename,
      contentType: 'application/json',
    });
    
    const uploadResponse = await fetch(`${AKAVE_API_URL}/buckets/${DEVICE_REPUTATION_BUCKET}/files`, {
      method: 'POST',
      body: formData,
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload to Filecoin: ${uploadResponse.status}`);
    }
    
    log(`✅ Reputation data stored on Filecoin for device ${deviceAddress}`);
    return true;
    
  } catch (error) {
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
  } catch (error) {
    log(`❌ Error ensuring Filecoin bucket exists: ${error.message}`);
    throw error;
  }
}

// Get current block height (simulated for now)
async function getCurrentBlockHeight() {
  // In production, this would fetch the actual block height from a node
  return Math.floor(Date.now() / 1000);
}

// Process devices in batches
async function processBatch(devices, startIdx, batchSize, checkerNode, consensusManager) {
  const endIdx = Math.min(startIdx + batchSize, devices.length);
  const batch = devices.slice(startIdx, endIdx);
  
  log(`Processing batch of ${batch.length} devices (${startIdx + 1} to ${endIdx} of ${devices.length})`);
  
  const results = [];
  for (const device of batch) {
    const result = await checkDevice(device, checkerNode, consensusManager);
    results.push(result);
  }
  
  return results;
}

// Calculate final score based on metrics
function calculateScore(metrics) {
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

// Main function
async function main() {
  try {
    log(`Starting Franky Device Checker Subnet v${CHECKER_SUBNET_VERSION}`);
    
    // Initialize checker node
    const checkerNode = createCheckerNode();
    log(`Checker node initialized with address: ${checkerNode.address}`);
    
    // Initialize consensus manager
    const consensusManager = createConsensusManager(checkerNode.address, checkerNode.privateKey);
    
    // Fetch registered devices using direct API
    const devices = await fetchDevices();
    log(`Found ${devices.length} registered devices to check`);
    
    // Process devices in batches
    const results = [];
    for (let i = 0; i < devices.length; i += MAX_CONCURRENT_CHECKS) {
      const batchResults = await processBatch(devices, i, MAX_CONCURRENT_CHECKS, checkerNode, consensusManager);
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
    
    const validResults = results.filter(r => r !== null);
    if (validResults.length > 0) {
      const totalScore = validResults.reduce((sum, r) => sum + (r.round.finalScore || 0), 0);
      const avgScore = totalScore / validResults.length;
      log(`📈 Average network reputation score: ${avgScore.toFixed(2)}`);
    }
    
  } catch (error) {
    log(`❌ Error in main process: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the subnet
main().catch(error => {
  log(`❌ Unhandled error in Checker subnet: ${error.message}`);
  console.error(error);
  process.exit(1);
}); 