import { NextResponse } from 'next/server';
import { HCS10Client, AgentBuilder, AIAgentCapability, InboundTopicType } from '@hashgraphonline/standards-sdk';
import { PrivateKey } from "@hashgraph/sdk";

// Hardcoded registry topic ID
const CHARACTER_REGISTRY_TOPIC_ID = "0.0.5949688";

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
    
    // Extract required fields directly to avoid undefined errors
    const characterId = body.characterId;
    const name = body.name;
    
    // Extract agent address and fee from both formats
    const agentAddress = body.agentAddress || body.agent_address;
    const perApiCallFee = body.perApiCallFee || body.per_api_call_fee;
    
    // Extract other optional fields
    const description = body.description;
    const personality = body.personality;
    const scenario = body.scenario;
    const first_mes = body.first_mes;
    const mes_example = body.mes_example;
    const creatorcomment = body.creatorcomment;
    const tags = body.tags;
    const talkativeness = body.talkativeness;
    const traits = body.traits;
    const imageUrl = body.imageUrl;
    
    // Add debug logging
    console.log('Received request body:', {
      characterId,
      name,
      agentAddress,
      perApiCallFee,
      agent_address: body.agent_address,
      per_api_call_fee: body.per_api_call_fee,
      fullBody: body
    });
    
    if (!characterId || !name || !agentAddress || !perApiCallFee) {
      console.log('Validation failed. Missing fields:', {
        hasCharacterId: !!characterId,
        hasName: !!name,
        hasAgentAddress: !!agentAddress,
        hasPerApiCallFee: !!perApiCallFee
      });
      return NextResponse.json(
        { error: 'Missing required fields: characterId, name, agentAddress, and perApiCallFee are required' },
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
      .setType('manual')
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
    agentBuilder.addProperty('agentAddress', agentAddress);
    agentBuilder.addProperty('perApiCallFee', perApiCallFee);
    
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
    
    console.log(`Successfully created agent: ${result.metadata?.accountId}`);
    console.log(`Inbound Topic: ${result.metadata?.inboundTopicId}`);
    console.log(`Outbound Topic: ${result.metadata?.outboundTopicId}`);
    
    // Prepare registration data for the registry topic
    const registrationData = {
      characterId,
      name,
      agentAccountId: result.metadata?.accountId,
      inboundTopicId: result.metadata?.inboundTopicId,
      outboundTopicId: result.metadata?.outboundTopicId,
      agentAddress,
      perApiCallFee,
      description,
      imageUrl
    };
    
    console.log('Registering agent in registry topic:', registrationData);
    
    try {
      // Register the agent in the registry topic
      const registryReceipt = await client.sendMessage(
        CHARACTER_REGISTRY_TOPIC_ID,
        JSON.stringify(registrationData),
        'Agent Registration'
      );
      
      console.log('Successfully registered agent in registry topic:', registryReceipt.toString());
      
      // Return success with agent metadata and registration details
      return NextResponse.json({
        success: true,
        agent: {
          accountId: result.metadata?.accountId,
          inboundTopicId: result.metadata?.inboundTopicId,
          outboundTopicId: result.metadata?.outboundTopicId,
          profileTopicId: result.metadata?.profileTopicId,
          privateKey: result.metadata?.privateKey // Note: In production, handle this securely
        },
        registration: {
          transactionId: registryReceipt.toString(),
          registryTopicId: CHARACTER_REGISTRY_TOPIC_ID
        }
      });
    } catch (registryError: any) {
      console.error('Error registering agent in registry topic:', registryError);
      return NextResponse.json(
        { 
          error: 'Agent was created but registration in registry topic failed',
          agentData: result.metadata,
          registryError: registryError.toString()
        },
        { status: 500 }
      );
    }
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