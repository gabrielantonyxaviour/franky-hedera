import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/utils';
import { ethers } from 'ethers';

// In a real implementation, this would be stored in a database
const checkerNodes = new Map<string, {
  walletAddress: string;
  serverUrl: string;
  registeredAt: string;
  lastSeen: string;
  checksPerformed: number;
}>();

export async function POST(request: Request) {
  try {
    const { walletAddress, serverUrl } = await request.json();

    // Validate inputs
    if (!walletAddress || !serverUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate server URL
    try {
      new URL(serverUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid server URL' },
        { status: 400 }
      );
    }

    // Register the checker node
    checkerNodes.set(walletAddress.toLowerCase(), {
      walletAddress: walletAddress.toLowerCase(),
      serverUrl,
      registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      checksPerformed: 0
    });

    return NextResponse.json({
      success: true,
      message: 'Checker node registered successfully'
    });

  } catch (error: any) {
    console.error('Error registering checker node:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return list of registered checker nodes
  return NextResponse.json({
    success: true,
    checkers: Array.from(checkerNodes.values())
  });
} 