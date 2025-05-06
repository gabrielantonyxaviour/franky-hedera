import { Request, Response } from 'express';
import { AccountId, PrivateKey } from '@hashgraph/sdk';
import { logger } from '../utils/logger';
import { HCS10Client, InboundTopicType, FeeConfigBuilder } from '@hashgraphonline/standards-sdk';
import { getHederaClient, createCustomClient } from '../services/hederaService';
import * as storageService from '../services/storageService';
import { MonitorService, registerFeeGatedConnection } from '../services/monitorService';
import { getCharacterFromRegistry } from '../services/registryService';
import { FeeConfig } from '../utils/feeUtils';

/**
 * Initialize a new agent with a character profile
 */
export const initializeAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { characterId, accountId, privateKey } = req.body;

    if (!characterId || !accountId || !privateKey) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: characterId, accountId, and privateKey are required' 
      });
      return;
    }

    // Create custom client with agent credentials
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

    // Create inbound topic for the agent
    const inboundTopicId = await client.createInboundTopic(
      accountId,
      InboundTopicType.PUBLIC
    );

    // Store agent info
    await storageService.saveAgentInfo({
      characterId,
      accountId,
      privateKey,
      inboundTopicId
    });

    logger.info('AGENT', `Successfully initialized agent for character ${characterId}`);
    
    res.status(201).json({ 
      success: true, 
      characterId,
      inboundTopicId
    });
  } catch (error) {
    logger.error('AGENT', `Error initializing agent: ${error}`);
    res.status(500).json({ success: false, error: `Error initializing agent: ${error}` });
  }
};

/**
 * Connect to an agent by sending a connection request to their inbound topic
 */
export const connectToAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inboundTopicId, accountId, privateKey, memo } = req.body;

    if (!inboundTopicId || !accountId || !privateKey) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: inboundTopicId, accountId, and privateKey are required' 
      });
      return;
    }

    logger.info('AGENT', `Connecting to agent at inbound topic ${inboundTopicId}`);

    // Create custom client with user credentials
    const client = await createCustomClient(accountId, privateKey);

    // Submit connection request
    const receipt = await client.submitConnectionRequest(
      inboundTopicId, 
      memo || 'Connection request'
    );
    
    const connectionRequestId = receipt.topicSequenceNumber?.toNumber();
    if (!connectionRequestId) {
      throw new Error('Failed to get connection request ID');
    }

    logger.info('AGENT', `Successfully submitted connection request (ID: ${connectionRequestId}) to topic ${inboundTopicId}`);
    
    res.status(200).json({ 
      success: true, 
      inboundTopicId,
      connectionRequestId
    });
  } catch (error) {
    logger.error('AGENT', `Error connecting to agent: ${error}`);
    res.status(500).json({ success: false, error: `Error connecting to agent: ${error}` });
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

    // Create custom client with user credentials
    const client = await createCustomClient(accountId, privateKey);

    // Send message to connection topic
    const receipt = await client.sendMessage(
      connectionTopicId,
      message,
      memo || 'User message'
    );

    logger.info('AGENT', `Successfully sent message to connection topic ${connectionTopicId}`);
    
    res.status(200).json({ 
      success: true, 
      connectionTopicId,
      sequenceNumber: receipt.topicSequenceNumber?.toNumber()
    });
  } catch (error) {
    logger.error('AGENT', `Error sending message: ${error}`);
    res.status(500).json({ success: false, error: `Error sending message: ${error}` });
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

    // Handle connection requests from inbound topic
    monitorService.onMessage(agentInfo.inboundTopicId, async (message) => {
      try {
        if (message.op === 'connection_request' && message.sequence_number) {
          logger.info('AGENT', `Received connection request on inbound topic: ${agentInfo.inboundTopicId}`);

          // Extract requester account ID from operator_id
          const requesterAccountId = message.operator_id?.split('@')[1];
          if (!requesterAccountId) {
            logger.error('AGENT', 'Failed to extract requester account ID from operator_id');
            return;
          }

          // Create connection topic (fee-gated)
          const result = await client.handleConnectionRequest(
            agentInfo.inboundTopicId,
            requesterAccountId,
            message.sequence_number
          );

          logger.info('AGENT', `Created connection topic: ${result.connectionTopicId}`);
          
          // Start monitoring the new connection topic
          await monitorService.startMonitoringTopic(result.connectionTopicId);

          // Handle messages from this connection topic
          monitorService.onMessage(result.connectionTopicId, async (connectionMessage) => {
            if (connectionMessage.op === 'message' && connectionMessage.data) {
              try {
                logger.info('AGENT', `Received message on connection topic: ${result.connectionTopicId}`);
                
                // Get character data
                const characterData = await getCharacterFromRegistry(characterId);
                if (!characterData) {
                  logger.error('AGENT', `Character data not found for ${characterId}`);
                  return;
                }

                // Send a simple response
                await client.sendMessage(
                  result.connectionTopicId,
                  `Hello! I'm ${characterData.name}, thank you for your message: "${connectionMessage.data}"`
                );
              } catch (err) {
                logger.error('AGENT', `Error processing message: ${err}`);
              }
            }
          });
        }
      } catch (err) {
        logger.error('AGENT', `Error handling connection request: ${err}`);
      }
    });

    logger.info('AGENT', `Successfully started monitor for agent ${characterId}`);
    
    res.status(200).json({ 
      success: true, 
      characterId,
      inboundTopicId: agentInfo.inboundTopicId,
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

    // Create fee config using FeeConfigBuilder from standards-sdk
    const feeConfigBuilder = new FeeConfigBuilder()
      .setFeeAmount(Number(feeAmount))
      .setFeeCollector(feeCollector)
      .setUseHip991(useHip991 || false);

    // Add exempt accounts if provided
    if (exemptAccounts && Array.isArray(exemptAccounts)) {
      exemptAccounts.forEach((accountId: string) => {
        feeConfigBuilder.addExemptAccount(accountId);
      });
    }

    const feeConfig = feeConfigBuilder.build();

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
 * Get a response from an agent
 */
export const getResponse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId, accountId, privateKey } = req.body;

    if (!messageId || !accountId || !privateKey) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: messageId, accountId, and privateKey are required' 
      });
      return;
    }

    // Create custom client with user credentials
    const client = await createCustomClient(accountId, privateKey);

    // Get message from connection topic
    const { messages } = await client.getMessages(messageId);
    
    if (!messages || messages.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Message not found'
      });
      return;
    }

    logger.info('AGENT', `Successfully retrieved message ${messageId}`);
    
    res.status(200).json({ 
      success: true, 
      message: messages[0]
    });
  } catch (error) {
    logger.error('AGENT', `Error getting response: ${error}`);
    res.status(500).json({ success: false, error: `Error getting response: ${error}` });
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

    // Get all connections for this character
    const connections = await storageService.getConnectionsForCharacter(characterId);

    // Stop monitoring all connection topics
    for (const connection of connections) {
      try {
        await client.sendMessage(
          connection.connectionTopicId,
          JSON.stringify({ type: 'connection_closed' }),
          'Connection closed'
        );
      } catch (err) {
        logger.error('AGENT', `Error sending close message to topic ${connection.connectionTopicId}: ${err}`);
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