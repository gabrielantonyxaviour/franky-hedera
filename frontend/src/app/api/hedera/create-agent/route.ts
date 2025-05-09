import { NextResponse } from 'next/server';
import { HCS10Client, AgentBuilder, AIAgentCapability, InboundTopicType, HCS11Client } from '@hashgraphonline/standards-sdk';
import { PrivateKey } from "@hashgraph/sdk";

// Initialize HCS10Client with environment variables
function getHCS10Client() {
  // Get Hedera credentials from environment variables
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';
  
  if (!operatorId || !operatorKey) {
    throw new Error('Hedera credentials not configured. Please set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY');
  }

  const privateKey = PrivateKey.fromStringECDSA(operatorKey);
  // Create and return the HCS10Client
  const client = new HCS10Client({
    network: network as 'mainnet' | 'testnet',
    operatorId: operatorId,
    operatorPrivateKey: privateKey.toString(),
    logLevel: 'info',
    prettyPrint: true
  });
    
  return client;
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { 
      characterId, 
      name, 
      description, 
      personality,
      scenario,
      first_mes,
      mes_example,
      creatorcomment,
      tags,
      talkativeness,
      traits,
      imageUrl
    } = body;
    
    if (!characterId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: characterId and name are required' },
        { status: 400 }
      );
    }
    
    // Set up HCS10Client
    const client = getHCS10Client();
    
    console.log(`Creating agent for character: ${name} (${characterId})`);
    
    // Configure the agent using AgentBuilder
    const agentBuilder = new AgentBuilder()
      .setName(name)
      .setBio(description || `Character agent for ${name}`)
      .setType('autonomous')
      .setInboundTopicType(InboundTopicType.PUBLIC) // Make it publicly accessible
      .setCapabilities([AIAgentCapability.TEXT_GENERATION])
      .setModel('gpt-4')
      .setNetwork(process.env.HEDERA_NETWORK as 'mainnet' | 'testnet' || 'testnet')
      .setCreator('Franky Hedera');
    
    // Add character properties to the metadata
    agentBuilder.addProperty('characterId', characterId);
    agentBuilder.addProperty('personality', personality);
    agentBuilder.addProperty('scenario', scenario);
    agentBuilder.addProperty('first_mes', first_mes);
    agentBuilder.addProperty('mes_example', mes_example);
    agentBuilder.addProperty('creatorcomment', creatorcomment);
    agentBuilder.addProperty('tags', tags || []);
    agentBuilder.addProperty('talkativeness', talkativeness || 0.7);
    agentBuilder.addProperty('traits', traits || {});
    agentBuilder.addProperty('imageUrl', imageUrl);
    
    // Create and register the agent
    const result = await client.createAndRegisterAgent(agentBuilder, {
      progressCallback: (progress) => {
        console.log(`${progress.stage}: ${progress.progressPercent}%`);
      }
    });
    
    if (!result.success) {
      console.error('Failed to create agent:', result.error);
      return NextResponse.json(
        { error: `Failed to create agent: ${result.error}` },
        { status: 500 }
      );
    }

    // Ensure the profile is registered with HCS-11
    if (result.metadata?.accountId && result.metadata?.privateKey && result.metadata?.profileTopicId) {
      try {
        const hcs11Client = new HCS11Client({
          network: process.env.HEDERA_NETWORK as 'mainnet' | 'testnet' || 'testnet',
          auth: {
            operatorId: result.metadata.accountId,
            privateKey: result.metadata.privateKey
          },
          logLevel: 'info'
        });

        await hcs11Client.updateAccountMemoWithProfile(
          result.metadata.accountId,
          result.metadata.profileTopicId
        );
        
        console.log(`Updated account memo with profile topic ID ${result.metadata.profileTopicId} for agent ${result.metadata.accountId}`);
      } catch (memoError) {
        console.error('Failed to update account memo:', memoError);
        // Continue anyway as the agent is created
      }
    }
    
    console.log(`Successfully created agent: ${result.metadata?.accountId}`);
    console.log(`Inbound Topic: ${result.metadata?.inboundTopicId}`);
    console.log(`Outbound Topic: ${result.metadata?.outboundTopicId}`);
    
    // Return success with agent metadata
    return NextResponse.json({
      success: true,
      agent: {
        accountId: result.metadata?.accountId,
        inboundTopicId: result.metadata?.inboundTopicId,
        outboundTopicId: result.metadata?.outboundTopicId,
        profileTopicId: result.metadata?.profileTopicId,
        privateKey: result.metadata?.privateKey // Note: In production, handle this securely
      }
    });
    
  } catch (error: any) {
    console.error('Error creating agent:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create agent',
        details: error.toString()
      },
      { status: 500 }
    );
  }
} 