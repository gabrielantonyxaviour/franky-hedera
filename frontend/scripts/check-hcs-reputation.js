#!/usr/bin/env node

/**
 * Script to check device reputation using the Hedera Consensus Service (HCS)
 * 
 * Usage: node scripts/check-hcs-reputation.js [deviceAddress]
 * 
 * This script demonstrates the HCS-based reputation system. It fetches reputation data
 * for a specific device or all devices if no address is provided.
 */

const { Client, AccountId, PrivateKey, TopicId } = require('@hashgraph/sdk');
require('dotenv').config({ path: '.env.local' });

// Environment configuration
const HEDERA_NETWORK = process.env.HEDERA_NETWORK || 'testnet';
const OPERATOR_ID = process.env.HEDERA_OPERATOR_ID;
const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY;
const DEVICE_REGISTRY_TOPIC_ID = process.env.DEVICE_REGISTRY_TOPIC_ID;

if (!OPERATOR_ID || !OPERATOR_KEY) {
  console.error('❌ Missing Hedera credentials. Please set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY in .env.local');
  process.exit(1);
}

// Create Hedera client
const client = HEDERA_NETWORK === 'mainnet' 
  ? Client.forMainnet() 
  : Client.forTestnet();

client.setOperator(
  AccountId.fromString(OPERATOR_ID),
  PrivateKey.fromString(OPERATOR_KEY)
);

// Get device address from command line
const deviceAddress = process.argv[2];

// Fetch API function to call our API endpoints
async function fetchAPI(endpoint, params = {}) {
  // Build query string
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) queryParams.append(key, value);
  });
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  try {
    // Use local API if running in development
    const baseUrl = 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/${endpoint}${queryString}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ API Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🔍 Checking device reputation using Hedera Consensus Service\n');
  
  try {
    console.log(`📋 Hedera Network: ${HEDERA_NETWORK}`);
    console.log(`📋 Operator ID: ${OPERATOR_ID}`);
    console.log(`📋 Device Registry Topic: ${DEVICE_REGISTRY_TOPIC_ID || 'Auto-created'}\n`);
    
    if (deviceAddress) {
      console.log(`📊 Fetching reputation for device: ${deviceAddress}`);
      const result = await fetchAPI('device-checker', {
        deviceAddress, 
        numRetrievals: 10
      });
      
      displayResults(result);
    } else {
      console.log('📊 Fetching reputation for all devices');
      const result = await fetchAPI('device-checker', {
        numRetrievals: 5
      });
      
      displayResults(result);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

function displayResults(data) {
  console.log(`\n📊 Results from: ${data.system}`);
  console.log(`⏱️  Timestamp: ${new Date(data.timestamp).toLocaleString()}`);
  console.log(`📝 Found ${data.results.length} device(s)\n`);
  
  data.results.forEach((device) => {
    console.log('======================================');
    console.log(`📱 Device: ${device.deviceAddress}`);
    console.log(`🔗 Ngrok: ${device.ngrokLink || 'Not available'}`);
    console.log(`📊 Status: ${device.status}`);
    
    if (device.status === 'checked') {
      console.log(`⭐ Reputation Score: ${device.reputationScore.toFixed(2)}`);
      console.log(`✅ Success Rate: ${(device.retrievalStats.successRate * 100).toFixed(1)}%`);
      console.log(`⏱️  Avg Response Time: ${device.retrievalStats.averageResponseTime.toFixed(0)} ms`);
      console.log(`🔄 Total Checks: ${device.retrievalStats.totalChecks}`);
      
      if (device.consensusDetails) {
        console.log(`\n📊 Consensus Details:`);
        console.log(`   Method: ${device.consensusDetails.consensusMethod}`);
        console.log(`   Checker Nodes: ${device.consensusDetails.checkerCount}`);
        console.log(`   Topic ID: ${device.consensusDetails.topicId}`);
      }
    } else if (device.status === 'error') {
      console.log(`❌ Error: ${device.error}`);
    } else if (device.status === 'skipped') {
      console.log(`⏩ Skipped: ${device.reason}`);
    }
    
    console.log(`⏱️  Last Checked: ${new Date(device.checked).toLocaleString()}`);
    console.log('======================================\n');
  });
}

main().catch(console.error); 