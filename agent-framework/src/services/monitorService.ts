import { HCS10Client, HCSMessage } from '@hashgraphonline/standards-sdk';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import { FeeConfig } from '../utils/feeUtils';
import * as fs from 'fs';
import * as path from 'path';
import * as storageService from './storageService';
import { decodeBase58 } from '../utils/base58';

// Import AI service for generating responses
import { generateCharacterResponse } from './aiService';
import { getConnectionService } from './connectionService';
import { PrivateKey } from '@hashgraph/sdk';

// Track fee-gated connections
const feeGatedConnections = new Map<string, FeeConfig>();

// Register a new connection as fee-gated
export const registerFeeGatedConnection = (
  connectionTopicId: string, 
  feeConfig: FeeConfig
): void => {
  feeGatedConnections.set(connectionTopicId, feeConfig);
  logger.info('MONITOR', `Registered fee-gated connection topic: ${connectionTopicId}`);
};

// Check if a connection topic is fee-gated
export const isFeeGatedConnection = (connectionTopicId: string): boolean => {
  return feeGatedConnections.has(connectionTopicId);
};

// Get fee configuration for a connection
export const getFeeConfigForConnection = (connectionTopicId: string): FeeConfig | null => {
  return feeGatedConnections.get(connectionTopicId) || null;
};

/**
 * Service to monitor message topics according to HCS-10 standard and verify fee payments
 */
export class MonitorService {
  private client: HCS10Client;
  private messageEmitter: EventEmitter;
  private monitoredTopics: Set<string> = new Set();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  // Track last processed message sequence number for each topic
  private lastProcessedMessage: Map<string, number> = new Map();
  
  // Track active characters for response generation
  private activeCharacters: Map<string, any> = new Map();
  
  // Track connection details
  private topicConnections: Map<string, {
    type: 'inbound' | 'outbound' | 'connection',
    characterId?: string,
    userId?: string
  }> = new Map();

  constructor(client: HCS10Client) {
    this.client = client;
    this.messageEmitter = new EventEmitter();
    this.messageEmitter.setMaxListeners(100); // Increase max listeners
  }

  /**
   * Set active character data for a topic
   * @param topicId Topic to associate with the character
   * @param characterData Character data to use for responses
   */
  public setCharacterForTopic(topicId: string, characterData: any): void {
    this.activeCharacters.set(topicId, characterData);
    logger.info('MONITOR', `Set active character for topic ${topicId}`);
  }

  /**
   * Register a topic as a specific type
   * @param topicId The topic ID to register
   * @param type The type of topic ('inbound', 'outbound', or 'connection')
   * @param metadata Additional metadata like characterId or userId
   */
  public registerTopicType(
    topicId: string, 
    type: 'inbound' | 'outbound' | 'connection',
    metadata: { characterId?: string, userId?: string } = {}
  ): void {
    this.topicConnections.set(topicId, {
      type,
      characterId: metadata.characterId,
      userId: metadata.userId
    });
    logger.info('MONITOR', `Registered topic ${topicId} as ${type} topic`);
  }

  /**
   * Start monitoring a topic for messages according to HCS-10 standard
   * @param topicId The topic ID to monitor
   */
  public async startMonitoringTopic(topicId: string): Promise<void> {
    if (this.monitoredTopics.has(topicId)) {
      logger.info('MONITOR', `Already monitoring topic ${topicId}`);
      return;
    }

    try {
      logger.info('MONITOR', `Starting to monitor topic ${topicId}`);
      
      // Initialize last processed message to 0
      this.lastProcessedMessage.set(topicId, 0);
      
      // Setup polling for messages
      const pollInterval = setInterval(async () => {
        try {
          logger.debug('MONITOR', `Polling for messages on topic ${topicId}`);
          const result = await this.client.getMessages(topicId);
          if (result && result.messages && result.messages.length > 0) {
            logger.debug('MONITOR', `Found ${result.messages.length} total messages on topic ${topicId}`);
            
            // Get the last processed sequence number for this topic
            const lastProcessed = this.lastProcessedMessage.get(topicId) || 0;
            
            // Filter for new messages
            const newMessages = result.messages
              .filter(msg => msg.sequence_number > lastProcessed)
              .sort((a, b) => a.sequence_number - b.sequence_number);
            
            if (newMessages.length > 0) {
              logger.debug('MONITOR', `Found ${newMessages.length} new messages on topic ${topicId}`);
            }
              
            // Process each new message
            for (const message of newMessages) {
              // Update last processed sequence
              this.lastProcessedMessage.set(topicId, message.sequence_number);
              
              logger.debug('MONITOR', `Processing message ${message.sequence_number} on topic ${topicId}, operation: ${message.op}`);
              
              // Process the message content based on the topic type
              await this.processMessage(topicId, message);
              
              // Emit the message event
              this.messageEmitter.emit(`message:${topicId}`, message);
              
              // Also emit on all topics channel
              this.messageEmitter.emit('message:all', {
                topicId,
                message
              });
            }
          }
        } catch (error) {
          logger.error('MONITOR', `Error polling topic ${topicId}: ${error}`, error);
        }
      }, 5000); // Poll every 5 seconds
      
      this.pollingIntervals.set(topicId, pollInterval);
      this.monitoredTopics.add(topicId);
      
      logger.info('MONITOR', `Successfully monitoring topic ${topicId}`);
    } catch (error) {
      logger.error('MONITOR', `Failed to start monitoring topic ${topicId}: ${error}`, error);
      throw error;
    }
  }

  /**
   * Process a message according to HCS-10 standard based on topic type
   * @param topicId The topic ID where the message was received
   * @param message The message to process
   */
  private async processMessage(topicId: string, message: HCSMessage): Promise<void> {
    try {
      // Only process if it's a message with data
      if (!message.data) {
        return;
      }
      
      // Get the topic type
      const topicInfo = this.topicConnections.get(topicId) || { type: 'unknown' };
      
      // Process based on topic type
      switch (topicInfo.type) {
        case 'inbound':
          await this.processInboundMessage(topicId, message);
          break;
          
        case 'outbound':
          await this.processOutboundMessage(topicId, message);
          break;
          
        case 'connection':
          await this.processConnectionMessage(topicId, message);
          break;
          
        default:
          // Try to handle as a connection message by default
          await this.processConnectionMessage(topicId, message);
      }
    } catch (error) {
      logger.error('MONITOR', `Error processing message on topic ${topicId}: ${error}`, error);
    }
  }
  
  /**
   * Process a message on an inbound topic (connection requests)
   * @param topicId The inbound topic ID
   * @param message The message to process
   */
  private async processInboundMessage(topicId: string, message: HCSMessage): Promise<void> {
    try {
      // Parse message data if it exists
      let messageData: any = null;
      if (message.data && typeof message.data === 'string') {
        try {
          messageData = JSON.parse(message.data);
        } catch (e) {
          logger.error('MONITOR', `Error parsing message data: ${e}`);
        }
      }

      // Check for HCS-10 connection request
      const isConnectionRequest = (
        message.p === 'hcs-10' && 
        message.op === 'connection_request' && 
        message.sequence_number
      );

      if (isConnectionRequest) {
        logger.info('MONITOR', `Received connection request on inbound topic: ${topicId}`);

        try {
          // Extract requester account ID from operator_id
          const requesterAccountId = message.operator_id ? 
            this.client.extractAccountFromOperatorId(message.operator_id) :
            (messageData?.userId || null);

          if (!requesterAccountId) {
            logger.error('MONITOR', 'Failed to extract requester account ID');
            return;
          }
          
          // Get character ID for this topic
          const topicInfo = this.topicConnections.get(topicId);
          const characterId = topicInfo?.characterId;
          
          if (!characterId) {
            logger.error('MONITOR', `No character ID associated with inbound topic ${topicId}`);
            return;
          }
          
          // Get the agent credentials from storage
          const agentInfo = await storageService.getAgentInfoByInboundTopic(topicId);
          if (!agentInfo) {
            logger.error('MONITOR', `No agent info found for inbound topic ${topicId}`);
            return;
          }
          
          const operatorId = agentInfo.accountId;
          // Use the private key directly - it's already in the correct format
          const agentPrivateKey = agentInfo.privateKey;
          
          if (!operatorId || !agentPrivateKey) {
            logger.error('MONITOR', 'Missing agent credentials');
            return;
          }
          
          logger.info('MONITOR', `Using agent ${operatorId} to handle connection request from ${requesterAccountId}`);
          
          // Create a new connection topic with the private key
          const agentClient = new HCS10Client({
            network: 'testnet',
            operatorId: operatorId,
            operatorPrivateKey: PrivateKey.fromStringECDSA(agentPrivateKey).toString(),
            logLevel: 'debug'
          });

          // Create connection topic with both user and agent keys
          const { connectionTopicId } = await agentClient.handleConnectionRequest(
            topicId,
            requesterAccountId,
            message.sequence_number
          );
          
          logger.info('MONITOR', `Created connection topic: ${connectionTopicId}`);

          // Send confirmation message on outbound topic in HCS-10 format
          const outboundTopicId = agentInfo.outboundTopicId;
          if (outboundTopicId) {
            // Send standard HCS-10 connection_created message
            await agentClient.submitPayload(
              outboundTopicId,
              {
                p: 'hcs-10',
                op: 'connection_created',
                connection_topic_id: connectionTopicId,
                connection_id: message.sequence_number,
                operator_id: `${topicId}@${operatorId}`,
                connected_account_id: requesterAccountId,
                m: 'Connection confirmed',
                created: new Date().toISOString()
              },
              undefined,
              false
            );
            logger.info('MONITOR', `Sent connection confirmation on outbound topic ${outboundTopicId}`);
          }
          
          // Start monitoring the new connection topic
          await this.startMonitoringTopic(connectionTopicId);
          
          // Register as a connection topic
          this.registerTopicType(connectionTopicId, 'connection', {
            characterId,
            userId: requesterAccountId
          });
          
          // Set character for this connection topic
          const characterData = this.activeCharacters.get(topicId);
          if (characterData) {
            this.setCharacterForTopic(connectionTopicId, characterData);
          }

          // Send welcome message on the new connection topic
          await agentClient.submitPayload(
            connectionTopicId,
            {
              p: 'hcs-10',
              op: 'message',
              data: JSON.stringify({
                type: 'GREETING',
                content: `Hello! I'm ${characterData?.name || 'your AI assistant'}. How can I help you today?`,
                timestamp: Date.now()
              }),
              operator_id: `${connectionTopicId}@${operatorId}`,
              m: 'Welcome message'
            },
            undefined,
            false
          );
          
          logger.info('MONITOR', `Sent welcome message on connection topic ${connectionTopicId}`);
        } catch (err) {
          logger.error('MONITOR', `Error handling connection request: ${err}`, err);
        }
      }
    } catch (error) {
      logger.error('MONITOR', `Error processing inbound message: ${error}`, error);
    }
  }
  
  /**
   * Process a message on an outbound topic (connection confirmations)
   * @param topicId The outbound topic ID
   * @param message The message to process
   */
  private async processOutboundMessage(topicId: string, message: HCSMessage): Promise<void> {
    // Currently no specific handling needed for outbound messages
    // This is where you would handle confirmation messages if needed
  }
  
  /**
   * Process a message on a connection topic (conversation)
   * @param topicId The connection topic ID
   * @param message The message to process
   */
  private async processConnectionMessage(topicId: string, message: HCSMessage): Promise<void> {
    // Only process if this is a standard message with string data
    if (message.op === 'message' && typeof message.data === 'string') {
      // Try to parse the message data as JSON
      try {
        const content = JSON.parse(message.data);
        
        // Check if it's a standard HCS-10 message with prompt and response IDs
        if (content.prompt && content.id && content.response_id) {
          logger.info('MONITOR', `Processing user message ${content.id} from topic ${topicId}`);
          
          // Get character data for this topic
          let characterData = this.activeCharacters.get(topicId);
          
          // If no character data is set for this topic, use a default
          if (!characterData) {
            // We don't have direct access to connection info, so we'll use a default
            logger.warn('MONITOR', `No character data found for topic ${topicId}, using default`);
            characterData = {
              name: "Assistant",
              description: "A helpful AI assistant."
            };
          }
          
          // Generate response
          const response = await generateCharacterResponse(content.prompt, characterData);
          
          // Send response through the same connection topic
          await this.client.sendMessage(
            topicId,
            JSON.stringify({
              id: content.response_id,
              response: response,
              prompt_id: content.id,
              timestamp: Date.now()
            }),
            "Character response"
          );
          
          logger.info('MONITOR', `Sent response for message ${content.id} on topic ${topicId}`);
        }
      } catch (e) {
        // Not a JSON message or missing required fields, skip
        logger.debug('MONITOR', `Non-standard message on topic ${topicId}: ${e}`);
      }
    }
  }

  /**
   * Stop monitoring a topic
   * @param topicId The topic ID to stop monitoring
   */
  public async stopMonitoringTopic(topicId: string): Promise<void> {
    if (!this.monitoredTopics.has(topicId)) {
      logger.info('MONITOR', `Not monitoring topic ${topicId}`);
      return;
    }

    try {
      logger.info('MONITOR', `Stopping monitoring for topic ${topicId}`);
      
      // Clear the polling interval
      const interval = this.pollingIntervals.get(topicId);
      if (interval) {
        clearInterval(interval);
        this.pollingIntervals.delete(topicId);
      }
      
      this.monitoredTopics.delete(topicId);
      this.lastProcessedMessage.delete(topicId);
      this.activeCharacters.delete(topicId);
      this.topicConnections.delete(topicId);
      
      logger.info('MONITOR', `Successfully stopped monitoring topic ${topicId}`);
    } catch (error) {
      logger.error('MONITOR', `Failed to stop monitoring topic ${topicId}: ${error}`, error);
      throw error;
    }
  }

  /**
   * Listen for messages on a specific topic
   * @param topicId The topic ID to listen for messages on
   * @param callback The callback to call when a message is received
   */
  public onMessage(topicId: string, callback: (message: HCSMessage) => void): void {
    this.messageEmitter.on(`message:${topicId}`, callback);
  }

  /**
   * Listen for messages on all topics
   * @param callback The callback to call when a message is received on any topic
   */
  public onAnyMessage(callback: (data: { topicId: string, message: HCSMessage }) => void): void {
    this.messageEmitter.on('message:all', callback);
  }

  /**
   * Remove a message listener for a specific topic
   * @param topicId The topic ID to remove the listener for
   * @param callback The callback to remove
   */
  public removeMessageListener(topicId: string, callback: (message: HCSMessage) => void): void {
    this.messageEmitter.removeListener(`message:${topicId}`, callback);
  }

  /**
   * Remove a message listener for all topics
   * @param callback The callback to remove
   */
  public removeAnyMessageListener(callback: (data: { topicId: string, message: HCSMessage }) => void): void {
    this.messageEmitter.removeListener('message:all', callback);
  }

  /**
   * Check if a topic is being monitored
   * @param topicId The topic ID to check
   */
  public isMonitoringTopic(topicId: string): boolean {
    return this.monitoredTopics.has(topicId);
  }

  /**
   * Get all monitored topics
   */
  public getMonitoredTopics(): string[] {
    return Array.from(this.monitoredTopics);
  }
} 