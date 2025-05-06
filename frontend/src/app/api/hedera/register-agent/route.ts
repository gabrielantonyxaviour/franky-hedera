import { NextResponse } from 'next/server';
import { PrivateKey } from '@hashgraph/sdk';
import { HCS10Client } from '@hashgraphonline/standards-sdk';

// Hardcoded registry topic ID
const CHARACTER_REGISTRY_TOPIC_ID = "0.0.5949688";

// Initialize HCS10Client with environment variables - using the same approach as create-agent
function getClient() {
  try {
    // Get Hedera credentials from environment variables
    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const network = process.env.HEDERA_NETWORK || 'testnet';
    
    if (!operatorId || !operatorKey) {
      throw new Error('Hedera credentials not configured. Please set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY');
    }
    
    console.log('Creating HCS10Client with:', {
      operatorId: operatorId,
      network: network,
      keyAvailable: !!operatorKey
    });

    const privateKey = PrivateKey.fromStringECDSA(operatorKey);
    
    // Use HCS10Client from standards-sdk which handles key formatting correctly
    const client = new HCS10Client({
      network: network as 'mainnet' | 'testnet',
      operatorId: operatorId,
      operatorPrivateKey: privateKey.toString(),
      logLevel: 'info',
      prettyPrint: true
    });
    
    console.log('HCS10Client created successfully');
    return client;
  } catch (error: any) {
    console.error('Error creating HCS10Client:', error);
    throw new Error(`Failed to initialize client: ${error.message}`);
  }
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { registrationData } = body;
    
    if (!registrationData) {
      return NextResponse.json(
        { error: 'Missing registration data' },
        { status: 400 }
      );
    }
    
    // Validate required fields according to HCS-10 standard
    const requiredFields = ['characterId', 'name', 'agentAccountId', 'inboundTopicId', 'outboundTopicId', 'agentAddress', 'perApiCallFee'];
    for (const field of requiredFields) {
      if (!registrationData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Log registration data for debugging
    console.log('Registering agent with data:', {
      registryTopicId: CHARACTER_REGISTRY_TOPIC_ID,
      characterId: registrationData.characterId,
      agentAccountId: registrationData.agentAccountId,
      inboundTopicId: registrationData.inboundTopicId,
      outboundTopicId: registrationData.outboundTopicId,
      agentAddress: registrationData.agentAddress
    });
    
    // Get the client (using HCS10Client which handles key formatting correctly)
    const client = getClient();
    
    console.log('Preparing to send message to registry topic');
    
    // Create message string
    const messageString = JSON.stringify(registrationData);
    
    try {
      // Send the message using HCS10Client.sendMessage which handles keys properly
      const receipt = await client.sendMessage(
        CHARACTER_REGISTRY_TOPIC_ID,
        messageString,
        'Agent Registration'
      );
      
      console.log('Message sent successfully to registry topic:', {
        topicId: CHARACTER_REGISTRY_TOPIC_ID,
        receipt: receipt
      });
      
      // Return success response
      return NextResponse.json({
        success: true,
        transactionId: receipt.toString(),
        message: 'Agent successfully registered in HCS registry',
        registryTopicId: CHARACTER_REGISTRY_TOPIC_ID
      });
    } catch (sendError: any) {
      console.error('Error sending message to topic:', sendError);
      return NextResponse.json(
        {
          error: `Error sending message to registry topic: ${sendError.message}`,
          details: sendError.toString()
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error registering agent in HCS:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to register agent in HCS',
        details: error.toString()
      },
      { status: 500 }
    );
  }
} 