import { NextResponse } from 'next/server';
import { hcsService } from '@/lib/services/hcs-service';

// Validate environment variables
const requiredEnvVars = {
  HEDERA_NETWORK: process.env.HEDERA_NETWORK || 'testnet',
  HEDERA_OPERATOR_ID: process.env.HEDERA_OPERATOR_ID,
  HEDERA_OPERATOR_KEY: process.env.HEDERA_OPERATOR_KEY
};

// Helper to validate environment setup
function validateEnvironment() {
  const missing = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export async function POST(request: Request) {
  console.log('POST /api/register-checker - Starting checker registration');
  
  try {
    // First validate environment
    validateEnvironment();
    console.log('Environment validation passed');

    // Parse and validate request body
    const body = await request.json();
    const { walletAddress, serverUrl } = body;

    console.log('Request body:', { walletAddress, serverUrl });

    // Validate inputs
    if (!walletAddress || !serverUrl) {
      console.log('Missing required fields:', { walletAddress, serverUrl });
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress and serverUrl are required' },
        { status: 400 }
      );
    }



    // Validate server URL
    try {
      const url = new URL(serverUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      console.log('Invalid server URL:', serverUrl, error);
      return NextResponse.json(
        { error: 'Invalid server URL. Must be a valid HTTP/HTTPS URL' },
        { status: 400 }
      );
    }

    console.log('Input validation passed, initializing HCS topics...');

    try {
      // Initialize HCS topics with timeout
      const topicsPromise = hcsService.initializeTopics();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Topic initialization timed out')), 30000)
      );

      await Promise.race([topicsPromise, timeoutPromise]);
      console.log('HCS topics initialized successfully');
    } catch (error) {
      console.error('Failed to initialize HCS topics:', error);
      return NextResponse.json(
        { 
          error: 'Failed to initialize HCS topics',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    console.log('Registering checker node in HCS...');
    
    // Register the checker node in HCS with timeout
    try {
      const registerPromise = hcsService.registerChecker(walletAddress, serverUrl);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Registration timed out')), 30000)
      );

      const transactionId = await Promise.race([registerPromise, timeoutPromise]);
      console.log('Checker registration successful:', { transactionId });

      return NextResponse.json({
        success: true,
        message: 'Checker node registered successfully',
        transactionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to register checker:', error);
      return NextResponse.json(
        { 
          error: 'Failed to register checker',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Unexpected error in register-checker:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  console.log('GET /api/register-checker - Fetching registered checkers');
  
  try {
    // Validate environment first
    validateEnvironment();
    console.log('Environment validation passed');

    console.log('Initializing HCS topics...');
    
    try {
      // Initialize HCS topics with timeout
      const topicsPromise = hcsService.initializeTopics();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Topic initialization timed out')), 30000)
      );

      await Promise.race([topicsPromise, timeoutPromise]);
      console.log('HCS topics initialized successfully');
    } catch (error) {
      console.error('Failed to initialize HCS topics:', error);
      return NextResponse.json(
        { 
          error: 'Failed to initialize HCS topics',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
    
    console.log('Fetching registered checkers...');
    
    // Get registered checker nodes from HCS with timeout
    try {
      const checkersPromise = hcsService.getCheckers();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetching checkers timed out')), 30000)
      );

      const checkers = (await Promise.race([checkersPromise, timeoutPromise])) as Array<{
        walletAddress: string;
        serverUrl: string;
        timestamp?: string;
      }>;
      console.log(`Successfully fetched ${checkers.length} checkers`);

      // Get HCS topic information
      const hcsInfo = {
        network: process.env.HEDERA_NETWORK || 'testnet',
        deviceRegistryTopicId: await hcsService.getDeviceRegistryTopicId(),
        checkerRegistryTopicId: await hcsService.getCheckerRegistryTopicId(),
        lastRefreshed: new Date().toISOString()
      };
    
      return NextResponse.json({
        success: true,
        checkers,
        hcsInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to fetch checkers:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch checkers',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Unexpected error in get-checkers:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 