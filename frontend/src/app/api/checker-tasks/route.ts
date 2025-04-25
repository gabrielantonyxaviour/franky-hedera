import { NextResponse } from 'next/server';
import { hcsService } from '@/lib/services/hcs-service';
import { ethers } from 'ethers';

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

    // Ensure HCS topics are initialized
    await hcsService.initializeTopics();

    // Get registered checkers from HCS
    const checkers = await hcsService.getCheckers();
    const isRegistered = checkers.some(c => 
      c.walletAddress.toLowerCase() === checkerAddress.toLowerCase()
    );

    if (!isRegistered) {
      return NextResponse.json(
        { error: 'Checker not registered' },
        { status: 403 }
      );
    }

    // Get devices from graph API
    const devicesResponse = await fetch('https://www.frankyagent.xyz/api/graph/devices', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!devicesResponse.ok) {
      throw new Error(`Failed to fetch devices: ${devicesResponse.status}`);
    }

    const devices = await devicesResponse.json();

    // Use a simple round-robin approach for device assignment
    // In production, would use a more sophisticated algorithm
    const assignedDevices = devices.slice(0, 10).map((device: any) => ({
      ...device,
      assignedAt: new Date().toISOString()
    }));

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

    if (!checkerAddress || !deviceId || !metrics) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the checker is registered
    const checkers = await hcsService.getCheckers();
    const isRegistered = checkers.some(c => 
      c.walletAddress.toLowerCase() === checkerAddress.toLowerCase()
    );

    if (!isRegistered) {
      return NextResponse.json(
        { error: 'Checker not registered' },
        { status: 403 }
      );
    }

    // Optional signature verification
    if (signature) {
      try {
        const message = JSON.stringify({ deviceId, metrics, timestamp: new Date().toISOString() });
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== checkerAddress.toLowerCase()) {
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Signature verification failed' },
          { status: 400 }
        );
      }
    }

    // Calculate reputation score from the metrics
    const reputationScore = calculateScore(metrics);

    // Format check results
    const checkResults = {
      reputationScore,
      retrievalStats: {
        successRate: metrics.availability?.uptime / 100 || 0,
        averageResponseTime: metrics.availability?.responseTime || 0,
        consistency: metrics.availability?.consistency || 0,
        lastSeen: metrics.availability?.lastSeen || new Date().toISOString(),
        totalChecks: metrics.checksPerformed || 1
      },
      performance: {
        throughput: metrics.performance?.throughput || 0,
        errorRate: metrics.performance?.errorRate || 0,
        latency: metrics.performance?.latency || {
          p50: 0,
          p95: 0,
          p99: 0
        }
      },
      security: {
        tlsVersion: metrics.security?.tlsVersion || 'unknown',
        certificateValid: metrics.security?.certificateValid || false,
        lastUpdated: metrics.security?.lastUpdated || new Date().toISOString()
      }
    };

    // Submit the check results to HCS
    const transactionId = await hcsService.submitDeviceCheck(
      checkerAddress,
      deviceId,
      checkResults
    );

    return NextResponse.json({
      success: true,
      message: 'Check result recorded',
      transactionId
    });

  } catch (error: any) {
    console.error('Error recording check result:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to calculate reputation score based on metrics
function calculateScore(metrics: any): number {
  const weights = {
    availability: 0.5,
    performance: 0.3,
    security: 0.2
  };

  // Default values if metrics are missing
  const availability = metrics.availability || { uptime: 0, responseTime: 5000, consistency: 0 };
  const performance = metrics.performance || { errorRate: 1, throughput: 0, latency: { p95: 1000 } };
  const security = metrics.security || { certificateValid: false };

  const availabilityScore = (
    (availability.uptime / 100) * 0.6 +
    (1 - Math.min(availability.responseTime / 5000, 1)) * 0.4
  ) * weights.availability;

  const performanceScore = (
    (1 - performance.errorRate) * 0.4 +
    (Math.min(performance.throughput / 100, 1)) * 0.3 +
    (1 - Math.min(performance.latency.p95 / 1000, 1)) * 0.3
  ) * weights.performance;

  const securityScore = (
    (security.certificateValid ? 1 : 0)
  ) * weights.security;

  return Math.round((availabilityScore + performanceScore + securityScore) * 100);
} 