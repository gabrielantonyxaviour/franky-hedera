import { Request, Response } from 'express';
import { AccountId, PrivateKey } from '@hashgraph/sdk';
import { logger } from '../utils/logger';
import { HCS10Client, InboundTopicType, FeeConfigBuilder } from '@hashgraphonline/standards-sdk';
import { getHederaClient, createCustomClient } from '../services/hederaService';
import * as storageService from '../services/storageService';
import { MonitorService, registerFeeGatedConnection } from '../services/monitorService';
import { getConnectionService } from '../services/connectionService';
import { getCharacterFromRegistry } from '../services/registryService';
import { FeeConfig } from '../utils/feeUtils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Initialize a new agent with a character profile
 */
export const initializeAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { characterId, accountId, privateKey, targetAgentAddress } = req.body;

    if (!characterId || !accountId || !privateKey) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: characterId, accountId, and privateKey are required' 
      });
      return;
    }

    // Create custom client with user credentials
    const client = await createCustomClient(accountId, privateKey);

    // Get character data to verify it exists
    const characterData = await getCharacterFromRegistry(characterId);
    if (!characterData) {
      res.status(404).json({ 
        success: false, 
        error: `Character with ID ${characterId} not found in registry` 
      });
      return;
    }

    logger.info('AGENT', `Initializing agent for character ${characterId}`);

    if (targetAgentAddress) {
      // Connecting to an existing agent
      logger.info('AGENT', `Connecting to agent with address ${targetAgentAddress}`);
      
      // Get the target agent's inbound topic
      // In a real implementation, this would come from your database or registry
      const targetAgent = await storageService.getAgentInfoByInboundTopic(targetAgentAddress);
      
      if (!targetAgent || !targetAgent.inboundTopicId) {
        res.status(404).json({ 
          success: false, 
          error: `Agent with address ${targetAgentAddress} not found or has no inbound topic` 
        });
        return;
      }
      
      // Get the connection service
      const connectionService = await getConnectionService();
      
      // Initiate a connection by sending a request to the agent's inbound topic
      const connectionRequest = await connectionService.initiateConnection(
        targetAgent.inboundTopicId,
        accountId,
        privateKey,
        `Connection request from ${characterId}`
      );
      
      // Wait for the connection to be confirmed
      const confirmation = await connectionService.waitForConnectionConfirmation(
        targetAgent.inboundTopicId,
        connectionRequest.requestId,
        accountId,
        privateKey,
        characterId
      );
      
      logger.info('AGENT', `Connection established with topic ${confirmation.connectionTopicId}`);
      
      // Set up connection monitoring
      const monitorService = new MonitorService(client);
      await monitorService.startMonitoringTopic(confirmation.connectionTopicId);
      monitorService.registerTopicType(confirmation.connectionTopicId, 'connection', {
        characterId,
        userId: confirmation.targetAccountId
      });
      
      if (characterData) {
        monitorService.setCharacterForTopic(confirmation.connectionTopicId, characterData);
      }
      
      res.status(200).json({ 
        success: true, 
        characterId,
        agentAccountId: confirmation.targetAccountId,
        connectionTopicId: confirmation.connectionTopicId,
        message: 'Connection established with agent'
      });
      
    } else {
      // Creating a new agent
      
      // Create inbound topic for the agent
      const inboundTopicId = await client.createInboundTopic(
        accountId,
        InboundTopicType.PUBLIC
      );
      
      // Create outbound topic for the agent
      const outboundTopicId = await client.createTopic(
        `Outbound topic for ${characterId}`,
        true, // Use admin key
        true  // Use submit key
      );

      // Store agent info
      await storageService.saveAgentInfo({
        characterId,
        accountId,
        privateKey,
        inboundTopicId,
        outboundTopicId
      });

      // Set up monitoring for the inbound topic
      const monitorService = new MonitorService(client);
      await monitorService.startMonitoringTopic(inboundTopicId);
      monitorService.registerTopicType(inboundTopicId, 'inbound', { characterId });
      
      if (characterData) {
        monitorService.setCharacterForTopic(inboundTopicId, characterData);
      }
      
      // Also monitor outbound topic
      await monitorService.startMonitoringTopic(outboundTopicId);
      monitorService.registerTopicType(outboundTopicId, 'outbound', { characterId });

      logger.info('AGENT', `Successfully initialized agent for character ${characterId}`);
      
      res.status(201).json({ 
        success: true, 
        characterId,
        inboundTopicId,
        outboundTopicId,
        message: 'Agent initialized successfully'
      });
    }
  } catch (error) {
    logger.error('AGENT', `Error initializing agent: ${error}`);
    res.status(500).json({ success: false, error: `Error initializing agent: ${error}` });
  }
};

/**
 * Send a message to an agent through a connection topic
 */
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionTopicId, accountId, privateKey, message, memo } = req.body;

    if (!connectionTopicId || !accountId || !privateKey || !message) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: connectionTopicId, accountId, privateKey, and message are required' 
      });
      return;
    }

    logger.info('AGENT', `Sending message to connection topic ${connectionTopicId}`);
    
    // Get the connection service
    const connectionService = await getConnectionService();
    
    // Generate unique IDs for the message and its response
    const messageId = `msg-${uuidv4()}`;
    const responseId = `resp-${uuidv4()}`;
    
    // Format the message with appropriate IDs for HCS-10 standard
    const formattedMessage = {
      id: messageId,
      prompt: message,
      response_id: responseId,
      timestamp: Date.now()
    };
    
    // Send message to connection topic
    const sendResult = await connectionService.sendMessage(
      connectionTopicId,
      formattedMessage,
      accountId,
      privateKey,
      memo || 'User message'
    );

    logger.info('AGENT', `Successfully sent message to connection topic ${connectionTopicId}`);
    
    res.status(200).json({ 
      success: true, 
      connectionTopicId,
      messageId,
      responseId,
      sequenceNumber: sendResult.sequenceNumber
    });
  } catch (error) {
    logger.error('AGENT', `Error sending message: ${error}`);
    res.status(500).json({ success: false, error: `Error sending message: ${error}` });
  }
};

/**
 * Get a response from an agent
 */
export const getResponse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { responseId, connectionTopicId, accountId, privateKey } = req.body;

    if (!responseId || !connectionTopicId || !accountId || !privateKey) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: responseId, connectionTopicId, accountId, and privateKey are required' 
      });
      return;
    }

    logger.info('AGENT', `Getting response ${responseId} from connection topic ${connectionTopicId}`);
    
    // Get the connection service
    const connectionService = await getConnectionService();
    
    // Get messages from connection topic
    const messages = await connectionService.getMessages(
      connectionTopicId,
      accountId,
      privateKey
    );
    
    // Find the response message with the matching ID
    let responseMessage = null;
    for (const message of messages) {
      if (message.op === 'message' && typeof message.data === 'string') {
        try {
          const content = JSON.parse(message.data);
          if (content.id === responseId) {
            responseMessage = content;
            break;
          }
        } catch (e) {
          // Not JSON or invalid format, skip
          continue;
        }
      }
    }
    
    if (!responseMessage) {
      res.status(404).json({
        success: false,
        error: 'Response not found'
      });
      return;
    }

    logger.info('AGENT', `Successfully retrieved response ${responseId}`);
    
    res.status(200).json({ 
      success: true, 
      response: responseMessage
    });
  } catch (error) {
    logger.error('AGENT', `Error getting response: ${error}`);
    res.status(500).json({ success: false, error: `Error getting response: ${error}` });
  }
};

/**
 * Connect to an agent by sending a connection request to their inbound topic
 */
export const connectToAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inboundTopicId, accountId, privateKey, characterId, memo } = req.body;

    if (!inboundTopicId || !accountId || !privateKey || !characterId) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: inboundTopicId, accountId, privateKey, and characterId are required' 
      });
      return;
    }

    logger.info('AGENT', `Connecting to agent at inbound topic ${inboundTopicId}`);

    // Get the connection service
    const connectionService = await getConnectionService();
    
    // Submit connection request
    const connectionRequest = await connectionService.initiateConnection(
      inboundTopicId,
      accountId,
      privateKey,
      memo || 'Connection request'
    );
    
    // Wait for the connection to be confirmed
    const confirmation = await connectionService.waitForConnectionConfirmation(
      inboundTopicId,
      connectionRequest.requestId,
      accountId,
      privateKey,
      characterId
    );
    
    logger.info('AGENT', `Connection established with topic ${confirmation.connectionTopicId}`);
    
    // Set up connection monitoring
    const client = await createCustomClient(accountId, privateKey);
    const monitorService = new MonitorService(client);
    await monitorService.startMonitoringTopic(confirmation.connectionTopicId);
    monitorService.registerTopicType(confirmation.connectionTopicId, 'connection', {
      characterId,
      userId: confirmation.targetAccountId
    });
    
    // Get character data if available
    const characterData = await getCharacterFromRegistry(characterId);
    if (characterData) {
      monitorService.setCharacterForTopic(confirmation.connectionTopicId, characterData);
    }
    
    logger.info('AGENT', `Successfully connected to agent via topic ${inboundTopicId}`);
    
    res.status(200).json({ 
      success: true, 
      inboundTopicId,
      connectionTopicId: confirmation.connectionTopicId,
      targetAccountId: confirmation.targetAccountId
    });
  } catch (error) {
    logger.error('AGENT', `Error connecting to agent: ${error}`);
    res.status(500).json({ success: false, error: `Error connecting to agent: ${error}` });
  }
};

/**
 * Start monitoring an agent for incoming connection requests
 */
export const startAgentMonitor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { characterId } = req.body;

    if (!characterId) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required parameter: characterId' 
      });
      return;
    }

    // Get agent info
    const agentInfo = await storageService.getAgentInfoForCharacter(characterId);
    if (!agentInfo) {
      res.status(404).json({ 
        success: false, 
        error: `Agent not found for character ${characterId}` 
      });
      return;
    }

    logger.info('AGENT', `Starting monitor for agent ${characterId}`);

    // Create custom client with agent credentials
    const client = await createCustomClient(agentInfo.accountId, agentInfo.privateKey);

    // Create a monitor service
    const monitorService = new MonitorService(client);

    // Start monitoring inbound topic
    await monitorService.startMonitoringTopic(agentInfo.inboundTopicId);
    monitorService.registerTopicType(agentInfo.inboundTopicId, 'inbound', { characterId });
    
    // Get character data if available
    const characterData = await getCharacterFromRegistry(characterId);
    if (characterData) {
      monitorService.setCharacterForTopic(agentInfo.inboundTopicId, characterData);
    }
    
    // If there's an outbound topic, monitor that too
    if (agentInfo.outboundTopicId) {
      await monitorService.startMonitoringTopic(agentInfo.outboundTopicId);
      monitorService.registerTopicType(agentInfo.outboundTopicId, 'outbound', { characterId });
    }
    
    // If there are existing connections, monitor those as well
    if (agentInfo.connections && agentInfo.connections.length > 0) {
      for (const connectionTopicId of agentInfo.connections) {
        await monitorService.startMonitoringTopic(connectionTopicId);
        monitorService.registerTopicType(connectionTopicId, 'connection', { characterId });
        
        if (characterData) {
          monitorService.setCharacterForTopic(connectionTopicId, characterData);
        }
      }
    }

    logger.info('AGENT', `Successfully started monitor for agent ${characterId}`);
    
    res.status(200).json({ 
      success: true, 
      characterId,
      inboundTopicId: agentInfo.inboundTopicId,
      outboundTopicId: agentInfo.outboundTopicId,
      connections: agentInfo.connections || [],
      message: 'Agent monitor started successfully'
    });
  } catch (error) {
    logger.error('AGENT', `Error starting agent monitor: ${error}`);
    res.status(500).json({ success: false, error: `Error starting agent monitor: ${error}` });
  }
};

/**
 * Create a fee configuration for a connection topic
 */
export const createFeeConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      connectionTopicId, 
      feeAmount, 
      feeCollector, 
      useHip991, 
      exemptAccounts 
    } = req.body;

    if (!connectionTopicId || !feeAmount || !feeCollector) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: connectionTopicId, feeAmount, and feeCollector are required' 
      });
      return;
    }

    // Get the client for the default agent
    const client = await getHederaClient();

    // Create a basic fee config object
    const feeConfig: FeeConfig = {
      feeAmount: Number(feeAmount),
      feeCollector: feeCollector,
      useHip991: useHip991 || false,
      exemptAccounts: exemptAccounts || []
    };

    // Register the fee config with the connection topic
    registerFeeGatedConnection(connectionTopicId, feeConfig);

    logger.info('AGENT', `Fee configuration created for connection topic ${connectionTopicId}`);
    
    res.status(200).json({ 
      success: true, 
      connectionTopicId,
      feeConfig 
    });
  } catch (error) {
    logger.error('AGENT', `Error creating fee configuration: ${error}`);
    res.status(500).json({ success: false, error: `Error creating fee configuration: ${error}` });
  }
};

/**
 * Cleanup/destroy an agent connection
 */
export const cleanupAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { characterId, accountId, privateKey } = req.body;

    if (!characterId || !accountId || !privateKey) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: characterId, accountId, and privateKey are required' 
      });
      return;
    }

    // Get agent info
    const agentInfo = await storageService.getAgentInfoForCharacter(characterId);
    if (!agentInfo) {
      res.status(404).json({ 
        success: false, 
        error: `Agent not found for character ${characterId}` 
      });
      return;
    }

    // Create custom client with user credentials
    const client = await createCustomClient(accountId, privateKey);
    const connectionService = await getConnectionService();

    // Get all connections for this character
    const connections = await storageService.getConnectionsForCharacter(characterId);

    // Close all connection topics
    for (const connection of connections) {
      try {
        // Send closing message and mark connection as inactive
        await connectionService.closeConnection(
          connection.connectionTopicId,
          accountId,
          privateKey,
          'Connection closed by agent'
        );
      } catch (err) {
        logger.error('AGENT', `Error closing connection ${connection.connectionTopicId}: ${err}`, err);
      }
    }

    logger.info('AGENT', `Successfully cleaned up agent for character ${characterId}`);
    
    res.status(200).json({ 
      success: true, 
      characterId,
      message: 'Agent cleaned up successfully'
    });
  } catch (error) {
    logger.error('AGENT', `Error cleaning up agent: ${error}`);
    res.status(500).json({ success: false, error: `Error cleaning up agent: ${error}` });
  }
};