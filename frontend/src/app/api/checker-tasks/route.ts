import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/utils';
import { ethers } from 'ethers';
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import type { CheckerMetrics, StandardizedReputation, ConsensusVote } from '@/types/checker-network';

// Initialize Apollo Client for GraphQL queries
const client = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/marshal-am/franky-service',
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'no-cache',
    },
  },
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

// In production, this would be in a database
const activeChecks = new Map<string, {
  deviceId: string;
  assignedCheckers: string[];
  results: ConsensusVote[];
  startTime: string;
  status: 'pending' | 'complete';
}>();

// Helper function to store reputation data in Akave/Filecoin
async function storeReputationData(deviceId: string, data: StandardizedReputation): Promise<boolean> {
  try {
    const AKAVE_API_URL = 'http://3.88.107.110:8000';
    const DEVICE_REPUTATION_BUCKET = 'device-reputation';

    // Ensure bucket exists
    const checkResponse = await fetch(`${AKAVE_API_URL}/buckets/${DEVICE_REPUTATION_BUCKET}`);
    if (!checkResponse.ok) {
      const createResponse = await fetch(`${AKAVE_API_URL}/buckets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: DEVICE_REPUTATION_BUCKET })
      });
      if (!createResponse.ok) throw new Error('Failed to create bucket');
    }

    // Store the data
    const formData = new FormData();
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const filename = `${deviceId.toLowerCase()}-${Date.now()}.json`;
    formData.append('file', jsonBlob, filename);

    const uploadResponse = await fetch(`${AKAVE_API_URL}/buckets/${DEVICE_REPUTATION_BUCKET}/files`, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload reputation data: ${uploadResponse.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error storing reputation data:', error);
    return false;
  }
}

// Helper function to calculate final score based on metrics
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkerAddress = searchParams.get('checkerAddress')?.toLowerCase();

    if (!checkerAddress) {
      return NextResponse.json(
        { error: 'Checker address required' },
        { status: 400 }
      );
    }

    // Get devices that need checking
    const { data } = await client.query({
      query: GET_REGISTERED_DEVICES,
      variables: { limit: 100 }
    });

    // Assign devices to this checker
    // In production, this would be more sophisticated, ensuring even distribution
    const assignedDevices = data.devices.filter((device: any) => {
      const checkId = `${device.id}-${Math.floor(Date.now() / 120000)}`; // 2-minute rounds
      const check = activeChecks.get(checkId);

      if (!check) {
        // Create new check round
        activeChecks.set(checkId, {
          deviceId: device.id,
          assignedCheckers: [checkerAddress],
          results: [],
          startTime: new Date().toISOString(),
          status: 'pending'
        });
        return true;
      }

      // Add checker if not at capacity
      if (check.assignedCheckers.length < 3 && !check.assignedCheckers.includes(checkerAddress)) {
        check.assignedCheckers.push(checkerAddress);
        return true;
      }

      return false;
    });

    return NextResponse.json({
      success: true,
      devices: assignedDevices
    });

  } catch (error: any) {
    console.error('Error assigning devices:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { checkerAddress, deviceId, metrics, signature } = await request.json();

    if (!checkerAddress || !deviceId || !metrics || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the signature
    const message = JSON.stringify({ deviceId, metrics, timestamp: new Date().toISOString() });
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== checkerAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Store the check result
    const checkId = `${deviceId}-${Math.floor(Date.now() / 120000)}`;
    const check = activeChecks.get(checkId);

    if (!check) {
      return NextResponse.json(
        { error: 'Check round not found' },
        { status: 404 }
      );
    }

    // Add result as ConsensusVote
    check.results.push({
      checkerId: checkerAddress,
      deviceId,
      timestamp: new Date().toISOString(),
      metrics,
      signature
    });

    // If we have enough results, calculate consensus
    if (check.results.length >= Math.min(check.assignedCheckers.length, 3)) {
      check.status = 'complete';

      // Calculate consensus metrics (median of all results)
      const consensusMetrics = calculateConsensusMetrics(check.results.map(r => r.metrics));

      // Store final reputation
      await storeReputationData(deviceId, {
        version: '1.0.0',
        networkId: 'checker-network-mainnet',
        subnetId: 'franky-device-checker',
        deviceId,
        round: {
          roundId: checkId,
          startTime: check.startTime,
          endTime: new Date().toISOString(),
          participants: check.assignedCheckers,
          votes: check.results,
          finalScore: calculateScore(consensusMetrics),
          status: 'complete'
        },
        quorum: 3, // Minimum number of checkers required
        consensusThreshold: 0.67, // 67% agreement required
        metrics: consensusMetrics,
        proof: {
          checkerId: checkerAddress,
          timestamp: new Date().toISOString(),
          signature,
          nonce: checkId,
          blockHeight: 0,
          previousProofHash: '0x0'
        },
        checks: check.results.map(vote => ({
          success: true,
          timestamp: vote.timestamp,
          duration: vote.metrics.availability.responseTime,
          statusCode: 200,
          metrics: vote.metrics
        })),
        previousReputationHash: '0x0', // In production, this would be fetched from the last stored reputation
        createdAt: check.startTime,
        updatedAt: new Date().toISOString(),
        storageProtocol: 'filecoin',
        storageDetails: {
          bucket: 'device-reputation',
          path: `${deviceId}/${checkId}.json`
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Check result recorded'
    });

  } catch (error: any) {
    console.error('Error recording check result:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to calculate consensus metrics
function calculateConsensusMetrics(allMetrics: CheckerMetrics[]): CheckerMetrics {
  const median = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  };

  return {
    availability: {
      uptime: median(allMetrics.map(m => m.availability.uptime)),
      responseTime: median(allMetrics.map(m => m.availability.responseTime)),
      consistency: median(allMetrics.map(m => m.availability.consistency)),
      lastSeen: new Date().toISOString()
    },
    performance: {
      throughput: median(allMetrics.map(m => m.performance.throughput)),
      errorRate: median(allMetrics.map(m => m.performance.errorRate)),
      latency: {
        p50: median(allMetrics.map(m => m.performance.latency.p50)),
        p95: median(allMetrics.map(m => m.performance.latency.p95)),
        p99: median(allMetrics.map(m => m.performance.latency.p99))
      }
    },
    security: {
      tlsVersion: allMetrics[0].security.tlsVersion,
      certificateValid: allMetrics.every(m => m.security.certificateValid),
      lastUpdated: new Date().toISOString()
    }
  };
} 