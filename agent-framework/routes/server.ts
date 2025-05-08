import express from 'express';
import dotenv from 'dotenv';
import { AccountId, PrivateKey, Client, AccountInfoQuery } from '@hashgraph/sdk';
import { HCS10Client } from '@hashgraphonline/standards-sdk';
import { Logger } from '@hashgraphonline/standards-sdk';
import { getAgent } from './get-agent';
import { spawn } from 'child_process';
import path from 'path';
import { ConnectionsManager, Connection } from '@hashgraphonline/standards-sdk';
import { HCS11Client, AIAgentType, AIAgentCapability, ProfileType } from '@hashgraphonline/standards-sdk';

dotenv.config();

const app = express();
app.use(express.json());

const logger = new Logger({
  module: 'Server',
  level: 'debug',
  prettyPrint: true,
});

// Store the MCP process reference
let mcpProcess: any = null;

// Function to start MCP server
async function startMCPServer(agentAddress: string): Promise<void> {
  // Kill existing process if any
  if (mcpProcess) {
    mcpProcess.kill();
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
  ['0.0.5616430', 'f22ee3d62bfc11b720a635d8d09c9a1c974e08a5f9bd875a6058ddfbe62415bf'],
  // Add more test accounts as needed
]);

// Store connection topics for each account
// In a real application, this would be in a persistent database
const connectionTopicMap = new Map<string, string>();

// Function to wait for Bob's response
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

// Initialize ConnectionsManager instance - we'll set the client later
let connectionsManager: ConnectionsManager;

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

    // Create HCS11Client to check for user's profile
    const hcs11Client = new HCS11Client({
      network: 'testnet',
      auth: {
        operatorId: accountId,
        privateKey: PrivateKey.fromStringECDSA(privateKey).toString()
      },
      logLevel: 'info'
    });

    try {
      // Create a Hedera client to check account info
      const client = Client.forTestnet();
      client.setOperator(accountId, PrivateKey.fromStringECDSA(privateKey));

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
              'Content-Type': 'application/json',
              'account-id': accountId
            },
            body: {
              displayName: 'Your Name',
              bio: 'A brief description',
              capabilities: ['TEXT_GENERATION'],
              type: 'manual',
              model: 'your-model',
              socials: {},
              properties: {}
            }
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
      operatorPrivateKey: PrivateKey.fromStringECDSA(privateKey).toString(),
      guardedRegistryBaseUrl: process.env.REGISTRY_URL,
      prettyPrint: true,
      logLevel: 'debug'
    });

    // Initialize ConnectionsManager with the user's client
    connectionsManager = new ConnectionsManager({
      baseClient: userClient
    });

    // Send connection request directly without profile validation
    try {
      logger.info('Sending connection request to agent', {
        accountId,
        agentAddress,
        inboundTopicId: agent.inboundTopicId
      });

      const message = {
        p: 'hcs-10',
        op: 'connection_request',
        data: 'Connection request from ' + accountId,
        created: new Date(),
        payer: accountId,
        requesting_account_id: accountId,
        operator_id: `${agent.inboundTopicId}@${accountId}`
      };
      
      const result = await userClient.submitPayload(
        agent.inboundTopicId,
        message,
        undefined,
        false
      );
      
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

      // Set up a promise that resolves when the connection is confirmed
      const connectionPromise = new Promise<Connection>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection confirmation timeout'));
        }, 60000); // 60 second timeout

        // Check for connection confirmation every 2 seconds
        const checkInterval = setInterval(async () => {
          const connections = await connectionsManager.getAllConnections();
          const confirmedConnection = connections.find((conn: Connection) => 
            conn.status === 'established' && 
            conn.connectionRequestId === requestId
          );

          if (confirmedConnection) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve(confirmedConnection);
          }
        }, 2000);
      });

      // Wait for connection confirmation
      const connection = await connectionPromise;

      // Store the connection topic for this account
      connectionTopicMap.set(accountId, connection.connectionTopicId);

      return res.json({
        success: true,
        accountId,
        agentAddress,
        connectionTopicId: connection.connectionTopicId,
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
      operatorPrivateKey: PrivateKey.fromStringECDSA(privateKey).toString(),
      guardedRegistryBaseUrl: process.env.REGISTRY_URL,
      prettyPrint: true,
      logLevel: 'debug',
    });

    const agent = await getAgent(logger, agentAddress);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found for the provided address' });
    }

    // Prepare the message payload according to HCS-10 format
    const messagePayload = {
      p: 'hcs-10',
      op: 'message',
      data: message,
      operator_id: `${agent.inboundTopicId}@${accountId}`,
      created: new Date(),
      payer: accountId,
      m: 'message from ' + accountId
    };

    // Send message using submitPayload
    const result = await userClient.submitPayload(
      connectionTopicId,
      messagePayload,
      undefined,  // no submit key
      false       // no fee required
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
      operatorPrivateKey: PrivateKey.fromStringECDSA(privateKey).toString(),
      guardedRegistryBaseUrl: process.env.REGISTRY_URL,
      prettyPrint: true,
      logLevel: 'debug',
    });

    const agent = await getAgent(logger, agentAddress);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found for the provided address' });
    }

    // Prepare close connection payload according to HCS-10 format
    const closePayload = {
      p: 'hcs-10',
      op: 'close_connection',
      data: 'User requested connection close',
      created: new Date(),
      payer: accountId,
      operator_id: `${agent.inboundTopicId}@${accountId}`,
      reason: 'User requested connection close',
      close_method: 'user_request',
      m: 'Connection close'
    };

    // Send close connection message using submitPayload
    await client.submitPayload(
      connectionTopicId,
      closePayload,
      undefined,  // no submit key
      false       // no fee required
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
      return res.status(400).json({ error: 'Account ID header (account-id) is required' });
    }

    // Default placeholder values that match the required format
    const defaultProfile = {
      displayName: `User ${accountId}`,
      type: AIAgentType.MANUAL,
      capabilities: [AIAgentCapability.TEXT_GENERATION],
      model: 'GPT-4',
      optionalProps: {
        bio: 'A Hedera network user',
        creator: accountId,
        properties: {
          created: new Date().toISOString(),
          version: '1.0',
          specializations: ['general conversation'],
          supportedFeatures: ['text interaction']
        }
      }
    };

    // Merge request body with default values
    const { 
      displayName = defaultProfile.displayName,
      type = defaultProfile.type,
      capabilities = defaultProfile.capabilities,
      model = defaultProfile.model,
      bio = defaultProfile.optionalProps.bio,
      creator = defaultProfile.optionalProps.creator,
      properties = defaultProfile.optionalProps.properties
    } = req.body || {};

    // Get private key from our mock database
    const privateKey = accountKeyMap.get(accountId);
    if (!privateKey) {
      return res.status(404).json({ error: 'Account credentials not found' });
    }

    // Initialize HCS11Client
    const hcs11Client = new HCS11Client({
      network: 'testnet',
      auth: {
        operatorId: accountId,
        privateKey: PrivateKey.fromStringECDSA(privateKey).toString()
      },
      logLevel: 'info'
    });

    // Create the AI agent profile exactly as shown in docs
    const aiAgentProfile = hcs11Client.createAIAgentProfile(
      displayName,
      type === 'autonomous' ? AIAgentType.AUTONOMOUS : AIAgentType.MANUAL,
      Array.isArray(capabilities) ? capabilities : [AIAgentCapability.TEXT_GENERATION],
      model,
      {
        bio,
        creator,
        properties
      }
    );

    // Track inscription progress
    let currentProgress = 0;
    let currentStage = '';
    let currentMessage = '';

    // Inscribe the profile with progress tracking
    const result = await hcs11Client.inscribeProfile(aiAgentProfile, {
      waitForConfirmation: true,
      progressCallback: (progressData) => {
        currentProgress = progressData.progressPercent || 0;
        currentStage = progressData.stage || '';
        currentMessage = progressData.message || '';
        
        logger.info('Profile inscription progress', {
          stage: progressData.stage,
          message: progressData.message,
          progress: progressData.progressPercent || 0
        });
      }
    });

    if (!result.success) {
      logger.error('Failed to inscribe profile:', result.error);
      return res.status(500).json({ 
        error: 'Failed to inscribe profile',
        details: result.error,
        progress: {
          stage: currentStage,
          message: currentMessage,
          percent: currentProgress
        }
      });
    }

    // Update account memo to point to the profile
    const updateResult = await hcs11Client.updateAccountMemoWithProfile(
      accountId,
      result.profileTopicId
    );

    if (!updateResult.success) {
      logger.error('Failed to update account memo:', updateResult.error);
      return res.status(500).json({
        error: 'Profile created but failed to update account memo',
        profileTopicId: result.profileTopicId,
        memoError: updateResult.error
      });
    }

    logger.info('Profile created and memo updated successfully', {
      accountId,
      profileTopicId: result.profileTopicId,
      memo: `hcs-11:hcs://1/${result.profileTopicId}`
    });

    return res.json({
      success: true,
      profileTopicId: result.profileTopicId,
      transactionId: result.transactionId,
      memo: `hcs-11:hcs://1/${result.profileTopicId}`,
      profile: {
        displayName,
        type: type === 'autonomous' ? 'autonomous' : 'manual',
        capabilities,
        model,
        bio,
        creator,
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

app.listen(PORT, () => {
  logger.info(`Initialization server running on port ${PORT}`);
}); 