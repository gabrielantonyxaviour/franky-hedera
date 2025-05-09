import express from 'express';
import dotenv from 'dotenv';
import { AccountId, PrivateKey, Client, AccountInfoQuery } from '@hashgraph/sdk';
import { HCS10Client } from '@hashgraphonline/standards-sdk';
import { Logger } from '@hashgraphonline/standards-sdk';
import { getAgent } from './get-agent';
import { spawn } from 'child_process';
import path from 'path';
import { HCS11Client, AIAgentType, AIAgentCapability, InboundTopicType, Hcs10MemoType } from '@hashgraphonline/standards-sdk';
import { AgentBuilder } from '@hashgraphonline/standards-sdk';
import { MCPServer } from '../src/utils/mcp-server';
import { createHederaTools } from '../src/langchain';
import HederaAgentKit from '../src/agent';
import { MCPOpenAIClient } from '../src/utils/mcp-openai';

dotenv.config();

const app = express();
app.use(express.json());

const logger = new Logger({
  module: 'Server',
  level: 'debug',
  prettyPrint: true,
});

// Store references to the processes and clients
let mcpProcess: any = null;
let mcpServer: MCPServer | null = null;
let mcpClient: MCPOpenAIClient | null = null;

// Initialize the MCP server and client
async function initializeMCP(): Promise<void> {
  try {
    logger.info('MCP Init', 'Initializing HederaAgentKit');
    
    // Get private key and ensure correct formatting
    const privateKeyString = process.env.HEDERA_PRIVATE_KEY!;
    
    // Format private key correctly - remove 0x prefix if present
    let formattedPrivateKey = privateKeyString;
    if (privateKeyString.startsWith('0x')) {
      formattedPrivateKey = privateKeyString.substring(2);
      logger.debug('MCP Init', 'Removed 0x prefix from private key');
    }
    
    // Convert to proper key type using SDK
    const privateKey = PrivateKey.fromStringECDSA(formattedPrivateKey);
    logger.debug('MCP Init', 'ECDSA private key created successfully');
    
    const hederaKit = new HederaAgentKit(
      process.env.HEDERA_ACCOUNT_ID!,
      privateKey.toString(),
      process.env.HEDERA_PUBLIC_KEY!,
      process.env.HEDERA_NETWORK_TYPE as "mainnet" | "testnet" | "previewnet" || "testnet"
    );
    logger.debug('MCP Init', 'HederaAgentKit initialized');

    // Create the LangChain-compatible tools
    logger.info('MCP Init', 'Creating Hedera tools');
    const tools = createHederaTools(hederaKit);
    logger.debug('MCP Init', `Created ${tools.length} tools`);

    // Start MCP server on port 3005 (the port character-mcp-api.ts expects)
    logger.info('MCP Init', 'Starting MCP server');
    mcpServer = new MCPServer(tools, 3005);
    await mcpServer.start();
    logger.info('MCP Init', `MCP server started at ${mcpServer.getUrl()}`);


  } catch (error) {
    logger.error('MCP Init', 'Failed to initialize MCP', error);
    throw error;
  }
}

// Function to start MCP server
async function startMCPServer(agentAddress: string): Promise<void> {
  // Kill existing process if any
  if (mcpProcess) {
    mcpProcess.kill();
  }

  // First ensure MCP server is running
  if (!mcpServer) {
    await initializeMCP();
  }

  return new Promise((resolve, reject) => {
    // Set environment variable for the new process
    const env = { ...process.env, AGENT_ADDRESS: agentAddress };
    
    // Start the character-mcp-api.ts process
    mcpProcess = spawn('npx', ['tsx', 'routes/character-mcp-api.ts'], {
      env,
      stdio: 'inherit' // This will show logs in the main process output
    });

    // Handle process events
    mcpProcess.on('error', (err: Error) => {
      logger.error('Failed to start character-mcp-api process', err);
      reject(err);
    });

    // Give it a moment to start up
    setTimeout(() => {
      if (mcpProcess.exitCode === null) {
        logger.info('character-mcp-api process started successfully');
        resolve();
      } else {
        reject(new Error('character-mcp-api process failed to start'));
      }
    }, 2000);
  });
}

// Mock database of account IDs and their private keys
// In a real application, this would be a secure database
const accountKeyMap = new Map<string, string>([
  ['0.0.5969996', '397016c1d1b9577e7c65dd854218036fe9b3a3c69178d726fbafd5ce967da65e'],
  ['0.0.5970003', 'ad82a74d63a37ddca7a8e33caa96516629cf8ede2bbcaea586c5cf5b24ed024d'],
  // Add more test accounts as needed
]);

// Store connection topics for each account
// In a real application, this would be in a persistent database
const connectionTopicMap = new Map<string, string>();


async function waitForResponse(
  client: HCS10Client,
  connectionTopicId: string,
  afterSequenceNumber: number,
  maxAttempts: number = 30,
  delayMs: number = 1000
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { messages } = await client.getMessages(connectionTopicId);
    
    // Look for messages after our sent message
    const responses = messages
      .filter(msg => 
        msg.op === 'message' && 
        msg.sequence_number > afterSequenceNumber &&
        msg.operator_id?.endsWith(process.env.BOB_ACCOUNT_ID || '')
      )
      .sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));

    if (responses.length > 0) {
      const response = responses[0];
      if (response.data) {
        // Handle HCS-1 references
        if (typeof response.data === 'string' && response.data.startsWith('hcs://')) {
          const resolvedContent = await client.getMessageContent(response.data);
          return typeof resolvedContent === 'string' ? 
            resolvedContent : 
            Buffer.from(resolvedContent).toString('utf-8');
        }
        return response.data;
      }
    }

    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return null;
}



app.post('/initialize', async (req, res) => {
  try {
    const accountId = req.headers['account-id'];
    const agentAddress = req.headers['agent-address'];

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({ error: 'Account ID header (account-id) is required' });
    }

    if (!agentAddress || typeof agentAddress !== 'string') {
      return res.status(400).json({ error: 'Agent address header (agent-address) is required' });
    }

    // Get private key from our mock database
    const privateKey = accountKeyMap.get(accountId);
    if (!privateKey) {
      return res.status(404).json({ error: 'Account credentials not found' });
    }

    try {
      // Create a Hedera client to check account info
      const client = Client.forTestnet();
      client.setOperator(accountId, privateKey);

      // Query account info to check for HCS-11 profile in memo
      const accountInfo = await new AccountInfoQuery()
        .setAccountId(accountId)
        .execute(client);

      const memo = accountInfo.accountMemo;
      const profileTopicId = memo?.startsWith('hcs-11:hcs://1/') 
        ? memo.split('hcs-11:hcs://1/')[1]
        : null;

      if (!profileTopicId) {
        return res.status(400).json({ 
          error: 'No HCS-11 profile found for this account',
          message: 'Please create a profile using the /create-profile endpoint before initializing a connection',
          example: {
            endpoint: '/create-profile',
            method: 'POST',
            headers: {
              'account-id': accountId
            },
          }
        });
      }

      logger.info('Found HCS-11 profile for account', {
        accountId,
        profileTopicId
      });
    } catch (error) {
      logger.warn('Error checking account profile, proceeding without profile check:', error);
    }

    // Store agent address in environment
    process.env.AGENT_ADDRESS = agentAddress;
    logger.info(`Set AGENT_ADDRESS environment variable to: ${agentAddress}`);

    // Start the character-mcp-api process
    try {
      await startMCPServer(agentAddress);
    } catch (error) {
      logger.error('Failed to start character-mcp-api process', error);
      return res.status(500).json({ 
        error: 'Failed to start character-mcp-api process',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // Get agent details using the agent address
    const agent = await getAgent(logger, agentAddress);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found for the provided address' });
    }

    // Create HCS10Client instance for the user
    const userClient = new HCS10Client({
      network: 'testnet',
      operatorId: accountId,
      operatorPrivateKey: privateKey,
      guardedRegistryBaseUrl: process.env.REGISTRY_URL,
      prettyPrint: true,
      logLevel: 'debug'
    });

    try {
      logger.info('Sending connection request to agent', {
        accountId,
        agentAddress,
        inboundTopicId: agent.inboundTopicId
      });

      // Submit connection request using higher-level method
      const connectionMemo = `Connection request from ${accountId} to ${agentAddress}`;
      const result = await userClient.submitConnectionRequest(agent.inboundTopicId, connectionMemo);
      
      if (!result.topicSequenceNumber) {
        throw new Error('Failed to get sequence number from connection request');
      }
      
      const requestId = result.topicSequenceNumber.toNumber();
      
      logger.info('Connection request sent successfully', {
        accountId,
        agentAddress,
        inboundTopicId: agent.inboundTopicId,
        requestId
      });

      // Wait for connection confirmation using higher-level method
      const connectionResponse = await userClient.waitForConnectionConfirmation(
        agent.inboundTopicId,
        requestId,
        30, // maxAttempts
        2000 // delayMs
      );

      if (!connectionResponse.connectionTopicId) {
        throw new Error('Failed to confirm connection - no connection topic ID received');
      }

      // Store the connection topic for this account
      connectionTopicMap.set(accountId, connectionResponse.connectionTopicId);

      return res.json({
        success: true,
        accountId,
        agentAddress,
        connectionTopicId: connectionResponse.connectionTopicId,
        message: 'Connection established with agent'
      });

    } catch (error) {
      logger.error('Failed to establish connection', error);
      return res.status(500).json({ 
        error: 'Failed to establish connection',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    logger.error('Error in /initialize endpoint', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const accountId = req.headers['account-id'];
    const agentAddress = req.headers['agent-address'];
    const { message } = req.body;

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({ error: 'Account ID header (account-id) is required' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required in request body' });
    }

    if (!agentAddress || typeof agentAddress !== 'string') {
      return res.status(400).json({ error: 'Agent address header (agent-address) is required' });
    }

    // Get the connection topic for this account
    const connectionTopicId = connectionTopicMap.get(accountId);
    if (!connectionTopicId) {
      return res.status(404).json({ 
        error: 'No active connection found. Please initialize connection first using /initialize endpoint' 
      });
    }

    // Get private key from our mock database
    const privateKey = accountKeyMap.get(accountId);
    if (!privateKey) {
      return res.status(404).json({ error: 'Account credentials not found' });
    }

    // Create HCS10Client for the user
    const userClient = new HCS10Client({
      network: 'testnet',
      operatorId: accountId,
      operatorPrivateKey: privateKey,
      guardedRegistryBaseUrl: process.env.REGISTRY_URL,
      prettyPrint: true,
      logLevel: 'debug',
    });

    const agent = await getAgent(logger, agentAddress);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found for the provided address' });
    }

    // Send message using higher-level sendMessage function
    const result = await userClient.sendMessage(
      connectionTopicId,
      message,
      `message from ${accountId}`  // memo
    );

    if (!result.topicSequenceNumber) {
      throw new Error('Failed to get sequence number from sent message');
    }

    const sentMessageSequence = result.topicSequenceNumber.toNumber();

    logger.info('Message sent successfully', {
      accountId,
      connectionTopicId,
      sequenceNumber: sentMessageSequence
    });

    const response = await waitForResponse(
      userClient,
      connectionTopicId,
      sentMessageSequence,
      30,  // Maximum 30 attempts
      1000 // 1 second between attempts
    );

    if (response) {
      return res.json({
        success: true,
        response
      });
    } else {
      return res.json({
        success: true,
        message: 'Message sent successfully, but no response received within timeout'
      });
    }

  } catch (error) {
    logger.error('Error in chat endpoint', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/destruct', async (req, res) => {
  try {
    const accountId = req.headers['account-id'];
    const agentAddress = req.headers['agent-address'];

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({ error: 'Account ID header (account-id) is required' });
    }

    if (!agentAddress || typeof agentAddress !== 'string') {
      return res.status(400).json({ error: 'Agent address header (agent-address) is required' });
    }

    // Get the connection topic for this account
    const connectionTopicId = connectionTopicMap.get(accountId);
    if (!connectionTopicId) {
      return res.status(404).json({ 
        error: 'No active connection found for this account' 
      });
    }

    // Get private key from our mock database
    const privateKey = accountKeyMap.get(accountId);
    if (!privateKey) {
      return res.status(404).json({ error: 'Account credentials not found' });
    }

    // Create client with user credentials
    const client = new HCS10Client({
      network: 'testnet',
      operatorId: accountId,
      operatorPrivateKey: privateKey,
      guardedRegistryBaseUrl: process.env.REGISTRY_URL,
      prettyPrint: true,
      logLevel: 'debug',
    });

    const agent = await getAgent(logger, agentAddress);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found for the provided address' });
    }

    // Send close connection message using sendMessage
    await client.sendMessage(
      connectionTopicId,
      JSON.stringify({
        op: 'close_connection',
        reason: 'User requested connection close',
        close_method: 'user_request',
        timestamp: new Date().toISOString()
      }),
      'Connection close'
    );

    // Remove from our local mapping
    connectionTopicMap.delete(accountId);

    // Kill the character-mcp-api process
    if (mcpProcess) {
      mcpProcess.kill();
      mcpProcess = null;
      logger.info('character-mcp-api process stopped');
    }

    return res.json({
      success: true,
      message: 'Connection closed and character-mcp-api process stopped successfully'
    });

  } catch (error) {
    logger.error('Error in destruct endpoint', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/create-profile', async (req, res) => {
  try {
    const accountId = req.headers['account-id'];
    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid account-id header' });
    }

    // Get private key from our mock database
    const privateKey = accountKeyMap.get(accountId);
    if (!privateKey) {
      return res.status(404).json({ error: 'Account credentials not found' });
    }

    // Initialize HCS10Client
    const client = new HCS10Client({
      network: 'testnet',
      operatorId: accountId,
      operatorPrivateKey: privateKey,
      guardedRegistryBaseUrl: process.env.REGISTRY_URL,
      prettyPrint: true,
      logLevel: 'debug'
    });

    // First check if profile already exists
    const existingProfile = await client.retrieveProfile(accountId);
    if (existingProfile.success && existingProfile.profile) {
      logger.info('Found existing profile', {
        accountId,
        profileTopicId: existingProfile.topicInfo?.profileTopicId
      });
      
      return res.json({
        success: true,
        profileTopicId: existingProfile.topicInfo?.profileTopicId,
        memo: `hcs-11:hcs://1/${existingProfile.topicInfo?.profileTopicId}`,
        profile: existingProfile.profile,
        message: 'Using existing profile'
      });
    }

    // Default placeholder values that match the required format
    const defaultProfile = {
      displayName: `User ${accountId}`,
      capabilities: [AIAgentCapability.TEXT_GENERATION],
      model: 'GPT-4',
      bio: 'A Hedera network user',
      properties: {
        created: new Date().toISOString(),
        version: '1.0',
        specializations: ['general conversation'],
        supportedFeatures: ['text interaction']
      }
    };

    // Merge request body with default values
    const { 
      displayName = defaultProfile.displayName,
      capabilities = defaultProfile.capabilities,
      model = defaultProfile.model,
      bio = defaultProfile.bio,
      properties = defaultProfile.properties
    } = req.body || {};

    // Track inscription progress
    let currentProgress = 0;
    let currentStage = '';
    let currentMessage = '';

    // Create agent with inbound and outbound topics
    const agentBuilder = new AgentBuilder()
      .setName(displayName)
      .setBio(bio)
      .setType('manual')
      .setCapabilities(capabilities)
      .setInboundTopicType(InboundTopicType.PUBLIC)
      .setNetwork('testnet')
      .setCreator(accountId);

    const agentResult = await client.createAgent(agentBuilder, 60);
    
    if (!agentResult.inboundTopicId || !agentResult.outboundTopicId) {
      throw new Error('Failed to create agent topics');
    }

    // Store the HCS11 profile
    const profileResult = await client.storeHCS11Profile(
      displayName,
      bio,
      agentResult.inboundTopicId,
      agentResult.outboundTopicId,
      capabilities,
      {
        model,
        ...properties
      }
    );

    if (!profileResult.success) {
      logger.error('Failed to store profile:', profileResult.error);
      return res.status(500).json({ 
        error: 'Failed to store profile',
        details: profileResult.error
      });
    }

    logger.info('Profile created successfully', {
      accountId,
      profileTopicId: profileResult.profileTopicId,
      inboundTopicId: agentResult.inboundTopicId,
      outboundTopicId: agentResult.outboundTopicId
    });

    return res.json({
      success: true,
      profileTopicId: profileResult.profileTopicId,
      inboundTopicId: agentResult.inboundTopicId,
      outboundTopicId: agentResult.outboundTopicId,
      transactionId: profileResult.transactionId,
      profile: {
        displayName,
        capabilities,
        model,
        bio,
        properties
      }
    });

  } catch (error) {
    logger.error('Error in create-profile endpoint', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Cleanup on server shutdown
process.on('SIGINT', () => {
  if (mcpProcess) {
    mcpProcess.kill();
  }
  process.exit();
});

process.on('SIGTERM', () => {
  if (mcpProcess) {
    mcpProcess.kill();
  }
  process.exit();
});

const PORT = 8080;

// Initialize MCP server first, then start the Express server
initializeMCP().then(() => {
  app.listen(PORT, () => {
    logger.info(`Initialization server running on port ${PORT}`);
  });
}).catch(error => {
  logger.error(`Error initializing MCP server: ${error}`);
  process.exit(1);
}); 