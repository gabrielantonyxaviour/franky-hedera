import { NextResponse } from 'next/server';
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import { publicClient } from '@/lib/utils';
import { FRANKY_ABI, FRANKY_ADDRESS } from '@/lib/constants';

// Checker Subnet Configuration
const CHECKER_SUBNET_NAME = 'franky-device-checker';
const CHECKER_SUBNET_VERSION = '1.0.0';
const AKAVE_API_URL = 'http://3.88.107.110:8000';
const DEVICE_REPUTATION_BUCKET = 'device-reputation';

// Initialize Apollo Client for GraphQL queries
const client = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/marshal-am/franky-service',
  cache: new InMemoryCache(),
});

// GraphQL query to get registered devices
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

// Function to calculate reputation score with weights
function calculateReputationScore(retrievalResults: any[]) {
  if (!retrievalResults.length) return 0;
  
  // Weights for different metrics
  const WEIGHTS = {
    SUCCESS_RATE: 0.6,    // 60% weight for success rate
    RESPONSE_TIME: 0.25,  // 25% weight for response time
    CONSISTENCY: 0.15     // 15% weight for consistency
  };
  
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
  
  // Calculate consistency score using standard deviation
  let consistencyScore = 1.0;
  if (successfulDurations.length > 1) {
    const mean = avgResponseTime;
    const squaredDiffs = successfulDurations.map(d => Math.pow(d - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / successfulDurations.length;
    const stdDev = Math.sqrt(variance);
    const normalizedStdDev = Math.min(stdDev / mean, 1);
    consistencyScore = 1 - normalizedStdDev;
  }
  
  // Calculate final weighted score
  const finalScore = (
    (successRate * WEIGHTS.SUCCESS_RATE) + 
    (responseTimeScore * WEIGHTS.RESPONSE_TIME) + 
    (consistencyScore * WEIGHTS.CONSISTENCY)
  ) * 100;
  
  return Math.round(finalScore * 100) / 100;
}

// Function to store reputation data in Akave (which stores on Filecoin)
async function storeReputationData(deviceAddress: string, reputationData: any) {
  try {
    // Add checker subnet metadata
    const dataWithMetadata = {
      ...reputationData,
      _checkerMetadata: {
        subnet: CHECKER_SUBNET_NAME,
        version: CHECKER_SUBNET_VERSION,
        timestamp: new Date().toISOString(),
        verificationMethod: 'character-retrieval',
        storageProtocol: 'filecoin',
        metrics: {
          successRate: { weight: 0.6, description: 'Rate of successful character data retrievals' },
          responseTime: { weight: 0.25, description: 'Average response time for successful retrievals' },
          consistency: { weight: 0.15, description: 'Consistency of response times' }
        }
      }
    };

    const formData = new FormData();
    const jsonBlob = new Blob([JSON.stringify(dataWithMetadata, null, 2)], { 
      type: 'application/json' 
    });
    
    const filename = `${deviceAddress.toLowerCase()}-${Date.now()}.json`;
    formData.append('file', jsonBlob, filename);
    
    const uploadResponse = await fetch(`${AKAVE_API_URL}/buckets/${DEVICE_REPUTATION_BUCKET}/files`, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload reputation data: ${uploadResponse.status}`);
    }
    
    const downloadUrl = `${AKAVE_API_URL}/buckets/${DEVICE_REPUTATION_BUCKET}/files/${filename}/download`;
    return { success: true, url: downloadUrl };
    
  } catch (error: any) {
    console.error('Error storing reputation data:', error);
    return { success: false, error: error.message };
  }
}

// Function to check device availability and character data
async function checkDeviceAvailability(characterUrl: string) {
  try {
    const startTime = Date.now();
    const response = await fetch(characterUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    let success = false;
    let data = null;
    
    if (response.ok) {
      try {
        data = await response.json();
        success = true;
      } catch (e) {
        success = false;
      }
    }
    
    return {
      success,
      status: response.status,
      statusText: success ? 'OK' : response.statusText,
      duration,
      data,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      success: false,
      status: 0,
      statusText: error.message || 'Unknown error',
      duration: 0,
      data: null,
      timestamp: new Date().toISOString()
    };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceAddress = searchParams.get('deviceAddress');
    const numRetrievals = parseInt(searchParams.get('numRetrievals') || '5', 10);
    
    if (deviceAddress && !/^0x[a-fA-F0-9]{40}$/.test(deviceAddress)) {
      return NextResponse.json(
        { error: 'Invalid device address format' },
        { status: 400 }
      );
    }
    
    const { data } = await client.query({
      query: GET_REGISTERED_DEVICES,
      variables: { limit: deviceAddress ? 1 : 10 }
    });
    
    const devices = deviceAddress 
      ? data.devices.filter((d: any) => d.id.toLowerCase() === deviceAddress.toLowerCase())
      : data.devices;
    
    if (!devices || devices.length === 0) {
      return NextResponse.json(
        { error: 'No devices found' },
        { status: 404 }
      );
    }
    
    const results = await Promise.all(devices.map(async (device: any) => {
      try {
        if (!device.agents || device.agents.length === 0) {
          return {
            deviceAddress: device.id,
            ngrokLink: device.ngrokLink,
            status: 'skipped',
            reason: 'No agents found for this device',
            reputationScore: 0,
            checked: new Date().toISOString()
          };
        }
        
        const agent = device.agents[0];
        const retrievalResults = [];
        
        for (let i = 0; i < numRetrievals; i++) {
          const result = await checkDeviceAvailability(agent.characterConfig);
          retrievalResults.push(result);
          if (i < numRetrievals - 1) await new Promise(r => setTimeout(r, 1000));
        }
        
        const reputationScore = calculateReputationScore(retrievalResults);
        
        const reputationData = {
          deviceAddress: device.id,
          ngrokLink: device.ngrokLink,
          lastChecked: new Date().toISOString(),
          reputationScore,
          retrievalStats: {
            successRate: retrievalResults.filter(r => r.success).length / retrievalResults.length,
            averageResponseTime: retrievalResults
              .filter(r => r.success)
              .map(r => r.duration)
              .reduce((sum, duration) => sum + duration, 0) / retrievalResults.filter(r => r.success).length || 0,
            totalChecks: retrievalResults.length
          },
          retrievalResults: retrievalResults.map(r => ({
            success: r.success,
            status: r.status,
            statusText: r.statusText,
            duration: r.duration,
            timestamp: r.timestamp
          }))
        };
        
        const storageResult = await storeReputationData(device.id, reputationData);
        
        return {
          deviceAddress: device.id,
          ngrokLink: device.ngrokLink,
          status: 'checked',
          reputationScore,
          retrievalStats: reputationData.retrievalStats,
          reputationDataUrl: storageResult.success ? storageResult.url : null,
          checked: new Date().toISOString()
        };
        
      } catch (error: any) {
        console.error(`Error processing device ${device.id}:`, error);
        return {
          deviceAddress: device.id,
          ngrokLink: device.ngrokLink || 'unknown',
          status: 'error',
          error: error.message || 'Unknown error',
          checked: new Date().toISOString()
        };
      }
    }));
    
    return NextResponse.json({ 
      subnet: CHECKER_SUBNET_NAME,
      version: CHECKER_SUBNET_VERSION,
      timestamp: new Date().toISOString(),
      results 
    });
    
  } catch (error: any) {
    console.error('Error in device-checker API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 