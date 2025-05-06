import { HCS10Client, HCSMessage, FeeConfigBuilder, NetworkType, Logger as SDKLogger } from '@hashgraphonline/standards-sdk';
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
 * Helper function to get the agent's fee amount from agent info
 * @param agentInfo The agent information object
 * @returns The fee amount in HBAR
 */
function getAgentFeeAmount(agentInfo: any): number {
  // Try to get fee from the perApiCallFee property
  if (agentInfo.perApiCallFee && !isNaN(parseFloat(agentInfo.perApiCallFee))) {
    return parseFloat(agentInfo.perApiCallFee);
  }
  
  // Fallback to default fee if not found (0.5 HBAR)
  return 0.5;
}

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

  // Track last processed connection request timestamp
  private lastConnectionRequestTime: Map<string, number> = new Map();
  private processedConnectionRequests: Set<string> = new Set();

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
      
      // Initialize last processed message to current state
      try {
        // Get the current latest message first to avoid processing history
        const initialResult = await this.client.getMessages(topicId);
        if (initialResult && initialResult.messages && initialResult.messages.length > 0) {
          // Find the highest sequence number
          const highestSeq = Math.max(...initialResult.messages.map(msg => msg.sequence_number));
          this.lastProcessedMessage.set(topicId, highestSeq);
          logger.info('MONITOR', `Initialized monitoring for topic ${topicId} starting at sequence ${highestSeq}`);
        } else {
          this.lastProcessedMessage.set(topicId, 0);
        }
      } catch (error) {
        logger.error('MONITOR', `Error getting initial messages for topic ${topicId}: ${error}`);
        // Default to 0 if we can't get initial state
        this.lastProcessedMessage.set(topicId, 0);
      }
      
      // Setup polling for messages
      const pollInterval = setInterval(async () => {
        try {
          // Get the last processed sequence number for this topic
          const lastProcessed = this.lastProcessedMessage.get(topicId) || 0;
          
          // Get messages since the last processed message
          const result = await this.client.getMessages(topicId);
          
          if (result && result.messages && result.messages.length > 0) {
            // Only process messages with higher sequence numbers
            const newMessages = result.messages
              .filter(msg => msg.sequence_number > lastProcessed)
              .sort((a, b) => a.sequence_number - b.sequence_number);
            
            if (newMessages.length > 0) {
              logger.debug('MONITOR', `Found ${newMessages.length} new messages on topic ${topicId}`);
              
              // Process only the latest batch - for connection_request, only process the newest one
              let messagesToProcess = newMessages;
              
              const topicInfo = this.topicConnections.get(topicId);
              if (topicInfo && topicInfo.type === 'inbound') {
                // For inbound topics, only process the newest connection request if there are multiple
                const connectionRequests = newMessages.filter(
                  msg => msg.op === 'connection_request'
                );
                
                if (connectionRequests.length > 1) {
                  // Find the newest connection request by sequence number
                  const newestConnectionRequest = connectionRequests.reduce(
                    (newest, current) => current.sequence_number > newest.sequence_number ? current : newest,
                    connectionRequests[0]
                  );
                  
                  // Replace all connection requests with just the newest one
                  messagesToProcess = newMessages.filter(
                    msg => msg.op !== 'connection_request' || 
                    msg.sequence_number === newestConnectionRequest.sequence_number
                  );
                  
                  logger.info('MONITOR', `Processing only the newest connection request ${newestConnectionRequest.sequence_number} out of ${connectionRequests.length} requests`);
                }
              }
              
              // Process the filtered messages
              for (const message of messagesToProcess) {
                // Update last processed sequence right away
                this.lastProcessedMessage.set(topicId, message.sequence_number);
                
                logger.debug('MONITOR', `Processing message ${message.sequence_number} on topic ${topicId}, operation: ${message.op}`);
                
                // Only process specific message types based on topic type
                if (this.shouldProcessMessage(topicId, message)) {
                  await this.processMessage(topicId, message);
                }
                
                // Always emit the event
                this.messageEmitter.emit(`message:${topicId}`, message);
                this.messageEmitter.emit('message:all', { topicId, message });
              }
            }
          }
        } catch (error) {
          logger.error('MONITOR', `Error polling topic ${topicId}: ${error}`);
        }
      }, 5000); // Poll every 5 seconds
      
      this.pollingIntervals.set(topicId, pollInterval);
      this.monitoredTopics.add(topicId);
      
      logger.info('MONITOR', `Successfully monitoring topic ${topicId}`);
    } catch (error) {
      logger.error('MONITOR', `Failed to start monitoring topic ${topicId}: ${error}`);
      throw error;
    }
  }

  /**
   * Determine if a message should be processed based on topic type and message operation
   * @param topicId The topic ID
   * @param message The message to check
   * @returns boolean indicating whether to process the message
   */
  private shouldProcessMessage(topicId: string, message: HCSMessage): boolean {
    const topicInfo = this.topicConnections.get(topicId);
    
    if (!topicInfo) {
      // If we don't know the topic type, process all messages
      return true;
    }
    
    switch (topicInfo.type) {
      case 'inbound':
        // Only process connection_request messages on inbound topics
        return message.op === 'connection_request';
        
      case 'outbound':
        // Don't process outbound topic messages - they are just confirmations
        return false;
        
      case 'connection':
        // Only process message operations on connection topics
        return message.op === 'message';
        
      default:
        return true;
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
          // Skip outbound messages - they are just confirmations
          break;
          
        case 'connection':
          await this.processConnectionMessage(topicId, message);
          break;
          
        default:
          // Try to handle as a connection message by default
          await this.processConnectionMessage(topicId, message);
      }
    } catch (error) {
      logger.error('MONITOR', `Error processing message on topic ${topicId}: ${error}`);
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
        // Create a unique identifier for this connection request
        const requestId = `${message.sequence_number}-${messageData?.userId || ''}`;
        
        // Check if we've already processed this request
        if (this.processedConnectionRequests.has(requestId)) {
          logger.debug('MONITOR', `Skipping already processed connection request: ${requestId}`);
          return;
        }

        // Get the timestamp from the message data
        const messageTimestamp = messageData?.timestamp || Date.now();
        const lastProcessedTime = this.lastConnectionRequestTime.get(topicId) || 0;

        // Only process if this is a newer request
        if (messageTimestamp <= lastProcessedTime) {
          logger.debug('MONITOR', `Skipping older connection request from timestamp ${messageTimestamp}`);
          return;
        }

        logger.info('MONITOR', `Processing new connection request on inbound topic: ${topicId}`);

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
          const agentPrivateKey = agentInfo.privateKey;
          
          if (!operatorId || !agentPrivateKey) {
            logger.error('MONITOR', 'Missing agent credentials');
            return;
          }
          
          logger.info('MONITOR', `Using agent ${operatorId} to handle connection request from ${requesterAccountId}`);
          
          // Create a new connection topic
          const agentClient = new HCS10Client({
            network: 'testnet',
            operatorId: operatorId,
            operatorPrivateKey: PrivateKey.fromStringDer(agentPrivateKey).toString(),
            logLevel: 'debug'
          });

          // Update tracking information BEFORE processing
          // This prevents the same request from being processed multiple times
          // even if the processing throws an error
          this.lastConnectionRequestTime.set(topicId, messageTimestamp);
          this.processedConnectionRequests.add(requestId);

          try {
            // Get the agent fee from the agent info
            const agentFee = getAgentFeeAmount(agentInfo);
            
            // Create a fee configuration for the connection
            logger.info('MONITOR', `Creating fee-gated connection topic with fee amount ${agentFee} HBAR`);
            
            // Create a proper SDK Logger instance for FeeConfigBuilder
            const sdkLogger = SDKLogger.getInstance({
              level: 'info',
              module: 'FeeConfig',
              prettyPrint: true
            });
            
            // Create a FeeConfigBuilder instance with HIP-991 support
            const feeConfigBuilder = new FeeConfigBuilder({
              network: 'testnet' as NetworkType,
              logger: sdkLogger,
              defaultCollectorAccountId: operatorId
            });
            
            // Add HBAR fee with HIP-991 support
            feeConfigBuilder.addHbarFee(
              agentFee,    // Fee amount in HBAR from agent info
              operatorId,                // Fee collector (the agent)
              [operatorId, requesterAccountId]  // Exempt both the agent and the user for initial setup
            );
            
            // Handle the connection request with fee configuration
            const { connectionTopicId } = await agentClient.handleConnectionRequest(
              topicId,
              requesterAccountId,
              message.sequence_number,
              feeConfigBuilder,  // Pass the fee config builder
              60  // TTL in seconds
            );
            
            logger.info('MONITOR', `Created fee-gated connection topic: ${connectionTopicId}`);
            
            // Register the fee configuration for this connection
            const feeConfig: FeeConfig = {
              feeAmount: agentFee,
              feeCollector: operatorId,
              useHip991: true,  // Enable HIP-991 fee collection
              exemptAccounts: [operatorId, requesterAccountId]  // Exempt the agent and requesting user
            };
            
            // Register the fee configuration
            registerFeeGatedConnection(connectionTopicId, feeConfig);
            
            logger.info('MONITOR', `Registered fee configuration for topic ${connectionTopicId}`);

            // Send confirmation message ONLY on outbound topic in HCS-10 format
            const outboundTopicId = agentInfo.outboundTopicId;
            if (outboundTopicId) {
              // Send standard HCS-10 connection_created message
              await agentClient.submitPayload(
                outboundTopicId,  // Send only to outbound topic
                {
                  p: 'hcs-10',
                  op: 'connection_created',
                  connection_topic_id: connectionTopicId,
                  connection_id: message.sequence_number,
                  operator_id: `${outboundTopicId}@${operatorId}`,  // Use outbound topic in operator ID
                  connected_account_id: requesterAccountId,
                  m: 'Connection confirmed',
                  created: new Date().toISOString()
                },
                undefined,
                false
              );
              logger.info('MONITOR', `Sent connection confirmation on outbound topic ${outboundTopicId}`);
            }
            
            // Continue with the rest of the setup
            await this.startMonitoringTopic(connectionTopicId);
            this.registerTopicType(connectionTopicId, 'connection', {
              characterId,
              userId: requesterAccountId
            });
            
            const characterData = this.activeCharacters.get(topicId);
            if (characterData) {
              this.setCharacterForTopic(connectionTopicId, characterData);
            }
            
            // Send a welcome message on the connection topic
            try {
              await agentClient.sendMessage(
                connectionTopicId,
                JSON.stringify({
                  type: 'welcome',
                  message: `Welcome! I'm ready to assist you. This connection requires a fee of ${agentFee} HBAR per message.`,
                  timestamp: Date.now()
                }),
                'Welcome message'
              );
              logger.info('MONITOR', 'Sent welcome message on connection topic');
            } catch (welcomeError) {
              logger.error('MONITOR', `Error sending welcome message: ${welcomeError}`);
              // Non-critical error, continue
            }
          } catch (connectionError: any) {
            logger.error('MONITOR', `Error creating connection topic: ${connectionError}`);
            
            if (connectionError.message && connectionError.message.includes('profile')) {
              logger.warn('MONITOR', 'Profile fetching failed, attempting direct connection with fees');
              
              // Get the agent fee from the agent info
              const agentFee = getAgentFeeAmount(agentInfo);
              
              // Create a proper SDK Logger instance for FeeConfigBuilder
              const sdkLogger = SDKLogger.getInstance({
                level: 'info',
                module: 'FeeConfig',
                prettyPrint: true
              });
              
              // Create a fee configuration
              const feeConfig = new FeeConfigBuilder({
                network: 'testnet' as NetworkType,
                logger: sdkLogger,
                defaultCollectorAccountId: operatorId
              })
              .addHbarFee(
                agentFee,    // Fee amount in HBAR from agent info
                operatorId,                // Fee collector (the agent)
                [operatorId, requesterAccountId]  // Exempt both the agent and the user for initial setup
              );
              
              // Create a new connection topic directly with fees
              const connectionTopicId = await agentClient.createTopic(
                `hcs-10:connection:${requesterAccountId}:${Date.now()}`,
                true,   // Use operator key as admin key
                true,   // Use operator key as submit key
                feeConfig.build()  // Use the built fee configuration
              );

              logger.info('MONITOR', `Created direct fee-gated connection topic: ${connectionTopicId}`);
              
              // Register the fee configuration for internal tracking
              registerFeeGatedConnection(connectionTopicId, {
                feeAmount: agentFee,
                feeCollector: operatorId,
                useHip991: true,  // Enable HIP-991 fee collection
                exemptAccounts: [operatorId, requesterAccountId]  // Exempt the agent and requesting user
              });

              // Send confirmation ONLY on outbound topic
              const outboundTopicId = agentInfo.outboundTopicId;
              if (outboundTopicId) {
                await agentClient.submitPayload(
                  outboundTopicId,  // Send only to outbound topic
                  {
                    p: 'hcs-10',
                    op: 'connection_created',
                    connection_topic_id: connectionTopicId,
                    connection_id: message.sequence_number,
                    operator_id: `${outboundTopicId}@${operatorId}`,  // Use outbound topic in operator ID
                    connected_account_id: requesterAccountId,
                    m: 'Connection confirmed',
                    created: new Date().toISOString()
                  },
                  undefined,
                  false
                );
                logger.info('MONITOR', `Sent connection confirmation on outbound topic ${outboundTopicId}`);
              }

              // Set up monitoring and character data
              await this.startMonitoringTopic(connectionTopicId);
              this.registerTopicType(connectionTopicId, 'connection', {
                characterId,
                userId: requesterAccountId
              });

              const characterData = this.activeCharacters.get(topicId);
              if (characterData) {
                this.setCharacterForTopic(connectionTopicId, characterData);
              }
              
              // Send a welcome message on the connection topic
              try {
                await agentClient.sendMessage(
                  connectionTopicId,
                  JSON.stringify({
                    type: 'welcome',
                    message: `Welcome! I'm ready to assist you. This connection requires a fee of ${agentFee} HBAR per message.`,
                    timestamp: Date.now()
                  }),
                  'Welcome message'
                );
                logger.info('MONITOR', 'Sent welcome message on connection topic');
              } catch (welcomeError) {
                logger.error('MONITOR', `Error sending welcome message: ${welcomeError}`);
                // Non-critical error, continue
              }
            } else {
              // If it's not a profile error, rethrow
              throw connectionError;
            }
          }
        } catch (error) {
          logger.error('MONITOR', `Error handling connection request: ${error}`);
        }
      }
    } catch (error) {
      logger.error('MONITOR', `Error processing inbound message: ${error}`);
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