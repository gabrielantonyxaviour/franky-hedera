import { HCS10Client, TransactionResult } from '@hashgraphonline/standards-sdk';
import { logger } from '../utils/logger';
import { getHederaClient, createCustomClient } from './hederaService';
import * as storageService from './storageService';
import { v4 as uuidv4 } from 'uuid';
import { PrivateKey } from '@hashgraph/sdk';

// Define context for logging
const CONTEXT_CONNECTION = 'CONNECTION';

/**
 * Service to manage HCS-10 connections between users and agents
 */
export class ConnectionService {
  private client: HCS10Client;
  private activeConnections: Map<string, {
    connectionTopicId: string,
    userAccountId: string, 
    agentAccountId: string,
    characterId: string,
    isActive: boolean,
    lastActivity: number
  }> = new Map();

  constructor(client: HCS10Client) {
    this.client = client;
  }

  /**
   * Initiate a connection with an agent by sending a request to its inbound topic
   * @param inboundTopicId The agent's inbound topic ID
   * @param userAccountId The user's account ID
   * @param userPrivateKey The user's private key
   * @param memo Optional memo message for the connection request
   * @returns Connection request details
   */
  async initiateConnection(
    inboundTopicId: string,
    userAccountId: string,
    userPrivateKey: string,
    memo: string = 'Connection request'
  ): Promise<{
    requestId: number;
    topicId: string;
  }> {
    try {
      logger.info(CONTEXT_CONNECTION, `Initiating connection to inbound topic ${inboundTopicId}`);
      
      // Create a client with user credentials
      const userClient = await createCustomClient(userAccountId, userPrivateKey);
      
      // Submit connection request to agent's inbound topic
      const receipt = await userClient.submitConnectionRequest(
        inboundTopicId,
        memo
      );
      
      const requestId = receipt.topicSequenceNumber!.toNumber();
      logger.info(CONTEXT_CONNECTION, `Connection request sent with ID: ${requestId}`);
      
      return {
        requestId,
        topicId: inboundTopicId
      };
      
    } catch (error) {
      logger.error(CONTEXT_CONNECTION, `Failed to initiate connection to ${inboundTopicId}`, error);
      throw error;
    }
  }
  
  /**
   * Wait for a connection to be confirmed by the agent
   * @param inboundTopicId The agent's inbound topic where request was sent
   * @param requestId The request ID to wait for
   * @param userAccountId The user's account ID
   * @param userPrivateKey The user's private key
   * @param maxWaitTimeSeconds Maximum wait time in seconds
   * @param pollingIntervalMs Polling interval in milliseconds
   * @returns Connection confirmation details
   */
  async waitForConnectionConfirmation(
    inboundTopicId: string,
    requestId: number,
    userAccountId: string,
    userPrivateKey: string,
    characterId: string,
    maxWaitTimeSeconds: number = 60,
    pollingIntervalMs: number = 2000
  ): Promise<{
    connectionTopicId: string;
    targetAccountId: string;
  }> {
    try {
      logger.info(CONTEXT_CONNECTION, `Waiting for connection confirmation for request ${requestId}`);
      
      // Create a client with user credentials
      const userClient = await createCustomClient(userAccountId, userPrivateKey);
      
      // Wait for connection confirmation
      const confirmation = await userClient.waitForConnectionConfirmation(
        inboundTopicId,
        requestId,
        maxWaitTimeSeconds,
        pollingIntervalMs
      );
      
      const connectionTopicId = confirmation.connectionTopicId;
      const targetAccountId = confirmation.confirmedBy.split('@')[1]; // Extract account ID from operator ID
      
      logger.info(CONTEXT_CONNECTION, `Connection confirmed with topic ${connectionTopicId}`);
      
      // Store connection information
      const connectionId = `conn-${uuidv4()}`;
      this.activeConnections.set(connectionId, {
        connectionTopicId,
        userAccountId,
        agentAccountId: targetAccountId,
        characterId,
        isActive: true,
        lastActivity: Date.now()
      });
      
      // Store connection in persistent storage
      await storageService.saveConnection({
        connectionTopicId,
        userAccountId,
        agentAccountId: targetAccountId,
        characterId,
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString()
      });
      
      return {
        connectionTopicId,
        targetAccountId
      };
      
    } catch (error) {
      logger.error(CONTEXT_CONNECTION, `Failed to confirm connection for request ${requestId}`, error);
      throw error;
    }
  }
  
  /**
   * Handle an incoming connection request from a user
   * @param inboundTopicId The agent's inbound topic
   * @param requestingAccountId The requesting user's account ID  
   * @param requestId The sequence number of the request message
   * @param agentAccountId The agent's account ID
   * @param agentPrivateKey The agent's private key
   * @param characterId The character ID for this agent
   * @param feeConfig Optional fee configuration for the connection
   * @param ttlSeconds Time-to-live in seconds for the connection
   * @returns Connection details
   */
  async handleConnectionRequest(
    inboundTopicId: string,
    requestingAccountId: string,
    requestId: number,
    agentAccountId: string,
    agentPrivateKey: string,
    characterId: string,
    feeConfig?: any,
    ttlSeconds: number = 60
  ): Promise<{
    connectionTopicId: string;
    connectionId: string;
  }> {
    try {
      logger.info(CONTEXT_CONNECTION, `Handling connection request ${requestId} from ${requestingAccountId}`);
      
      // Create a client with agent credentials
      const agentClient = await createCustomClient(agentAccountId, agentPrivateKey);
      
      // Handle the connection request (creates a connection topic)
      const result = await agentClient.handleConnectionRequest(
        inboundTopicId,
        requestingAccountId,
        requestId,
        feeConfig,
        ttlSeconds
      );
      
      const connectionTopicId = result.connectionTopicId;
      logger.info(CONTEXT_CONNECTION, `Created connection topic: ${connectionTopicId}`);
      
      // Generate a unique connection ID
      const connectionId = `conn-${uuidv4()}`;
      
      // Store connection information
      this.activeConnections.set(connectionId, {
        connectionTopicId,
        userAccountId: requestingAccountId,
        agentAccountId,
        characterId,
        isActive: true,
        lastActivity: Date.now()
      });
      
      // Store connection in persistent storage
      await storageService.saveConnection({
        connectionTopicId,
        userAccountId: requestingAccountId,
        agentAccountId,
        characterId,
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString()
      });
      
      return {
        connectionTopicId,
        connectionId
      };
      
    } catch (error) {
      logger.error(CONTEXT_CONNECTION, `Failed to handle connection request ${requestId}`, error);
      throw error;
    }
  }
  
  /**
   * Send a message to a connection topic
   * @param connectionTopicId The connection topic ID
   * @param message The message content
   * @param senderAccountId The sender's account ID
   * @param senderPrivateKey The sender's private key
   * @param memo Optional memo for the message
   * @returns Message send result
   */
  async sendMessage(
    connectionTopicId: string,
    message: any, 
    senderAccountId: string,
    senderPrivateKey: string,
    memo?: string
  ): Promise<{
    messageId: string;
    sequenceNumber: number;
  }> {
    try {
      logger.info(CONTEXT_CONNECTION, `Sending message to connection topic ${connectionTopicId}`);
      
      // Create a client with sender credentials
      const senderClient = await createCustomClient(senderAccountId, senderPrivateKey);
      
      // Format message if it's an object
      const formattedMessage = typeof message === 'object' ? JSON.stringify(message) : message;
      
      // Send message to connection topic using the HCS10Client's submitPayload method
      const receipt = await senderClient.submitPayload(
        connectionTopicId,
        {
          p: 'hcs-10',
          op: 'message',
          data: formattedMessage,
          m: memo
        }
      );
      
      const messageId = `msg-${uuidv4()}`;
      const sequenceNumber = receipt.topicSequenceNumber!.toNumber();
      
      logger.info(CONTEXT_CONNECTION, `Message sent with sequence number ${sequenceNumber}`);
      
      // Update connection last activity
      this.updateConnectionActivity(connectionTopicId);
      
      return {
        messageId,
        sequenceNumber
      };
      
    } catch (error) {
      logger.error(CONTEXT_CONNECTION, `Failed to send message to ${connectionTopicId}`, error);
      throw error;
    }
  }
  
  /**
   * Get messages from a connection topic
   * @param connectionTopicId The connection topic ID
   * @param accountId The account ID to use for authentication
   * @param privateKey The private key to use for authentication
   * @returns Array of messages
   */
  async getMessages(
    connectionTopicId: string,
    accountId: string,
    privateKey: string
  ): Promise<any[]> {
    try {
      logger.info(CONTEXT_CONNECTION, `Getting messages from connection topic ${connectionTopicId}`);
      
      // Create a client with given credentials
      const client = await createCustomClient(accountId, privateKey);
      
      // Get messages from the connection topic
      const { messages } = await client.getMessages(connectionTopicId);
      
      logger.info(CONTEXT_CONNECTION, `Retrieved ${messages.length} messages from ${connectionTopicId}`);
      
      // Update connection last activity
      this.updateConnectionActivity(connectionTopicId);
      
      return messages;
      
    } catch (error) {
      logger.error(CONTEXT_CONNECTION, `Failed to get messages from ${connectionTopicId}`, error);
      throw error;
    }
  }
  
  /**
   * Close a connection
   * @param connectionTopicId The connection topic ID
   * @param accountId The account ID to use for authentication
   * @param privateKey The private key to use for authentication
   * @param reason Optional reason for closing the connection
   * @returns Success indicator
   */
  async closeConnection(
    connectionTopicId: string,
    accountId: string,
    privateKey: string,
    reason: string = 'Connection closed by client'
  ): Promise<boolean> {
    try {
      logger.info(CONTEXT_CONNECTION, `Closing connection topic ${connectionTopicId}`);
      
      // Create a client with given credentials
      const client = await createCustomClient(accountId, privateKey);
      
      // Send a close notification message using submitPayload
      await client.submitPayload(
        connectionTopicId,
        {
          p: 'hcs-10',
          op: 'close_connection',
          data: JSON.stringify({
            reason,
            timestamp: Date.now()
          }),
          m: 'Connection close'
        }
      );
      
      // Update connection status
      for (const [connectionId, connection] of this.activeConnections.entries()) {
        if (connection.connectionTopicId === connectionTopicId) {
          connection.isActive = false;
          this.activeConnections.set(connectionId, connection);
          break;
        }
      }
      
      logger.info(CONTEXT_CONNECTION, `Connection ${connectionTopicId} marked as closed`);
      return true;
      
    } catch (error) {
      logger.error(CONTEXT_CONNECTION, `Failed to close connection ${connectionTopicId}`, error);
      return false;
    }
  }
  
  /**
   * Get connection information by topic ID
   * @param connectionTopicId The connection topic ID to look up
   * @returns Connection information or null if not found
   */
  getConnectionByTopicId(connectionTopicId: string): any {
    for (const [connectionId, connection] of this.activeConnections.entries()) {
      if (connection.connectionTopicId === connectionTopicId) {
        return {
          id: connectionId,
          ...connection
        };
      }
    }
    return null;
  }
  
  /**
   * Update the last activity timestamp for a connection
   * @param connectionTopicId The connection topic ID
   */
  private updateConnectionActivity(connectionTopicId: string): void {
    for (const [connectionId, connection] of this.activeConnections.entries()) {
      if (connection.connectionTopicId === connectionTopicId) {
        connection.lastActivity = Date.now();
        this.activeConnections.set(connectionId, connection);
        
        // Update in storage
        storageService.updateConnectionLastMessage(connectionTopicId).catch(error => {
          logger.error(CONTEXT_CONNECTION, `Failed to update connection last message: ${error}`, error);
        });
        
        break;
      }
    }
  }
}

// Singleton instance for easier access
let connectionServiceInstance: ConnectionService | null = null;

/**
 * Get or initialize the ConnectionService
 */
export const getConnectionService = async (): Promise<ConnectionService> => {
  if (connectionServiceInstance) {
    return connectionServiceInstance;
  }
  
  try {
    // Create a client directly rather than using getHederaClient
    if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
      throw new Error('HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY environment variables are not set');
    }
    
    logger.info(CONTEXT_CONNECTION, 'Creating HCS10Client with debug logging for ConnectionService');
    const client = new HCS10Client({
      network: (process.env.HEDERA_NETWORK || 'testnet') as any,
      operatorId: process.env.HEDERA_ACCOUNT_ID,
      operatorPrivateKey: PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY).toString(),
      logLevel: 'debug', // Set to debug for detailed logs
      prettyPrint: true,
    });
    
    connectionServiceInstance = new ConnectionService(client);
    return connectionServiceInstance;
  } catch (error) {
    logger.error(CONTEXT_CONNECTION, 'Failed to initialize ConnectionService', error);
    throw error;
  }
}; 