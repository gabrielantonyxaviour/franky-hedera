import { NextResponse } from 'next/server';
import { hcsService } from '@/lib/services/hcs-service';

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

    // Make sure HCS topics are initialized
    await hcsService.initializeTopics();

    // Register the checker node in HCS
    const transactionId = await hcsService.registerChecker(walletAddress, serverUrl);

    return NextResponse.json({
      success: true,
      message: 'Checker node registered successfully',
      transactionId
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
  try {
    // Make sure HCS topics are initialized
    await hcsService.initializeTopics();
    
    // Get registered checker nodes from HCS
    const checkers = await hcsService.getCheckers();
    
    return NextResponse.json({
      success: true,
      checkers
    });
  } catch (error: any) {
    console.error('Error getting checker nodes:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 