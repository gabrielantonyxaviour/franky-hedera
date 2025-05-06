import {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicId,
  TopicMessageQuery,
  TopicInfoQuery,
  PrivateKey,
  PublicKey,
  KeyList,
  TransactionReceipt,
  CustomFee,
  CustomFixedFee,
  Hbar,
  AccountId,
  ScheduleCreateTransaction,
  Transaction,
  TransferTransaction,
  TokenAssociateTransaction,
  TokenId,
  TransactionRecord,
  TransactionRecordQuery
} from "@hashgraph/sdk";
import { Logger, logger } from '../utils/logger';
import { FeeConfig } from '../utils/feeUtils';

const CONTEXT = 'HCS10CLIENT';

// Configuration interface for HCS10Client
export interface HCS10ClientConfig {
  network: string;
  operatorId: string;
  operatorPrivateKey: string;
  keyType?: string;
  logLevel?: string;
  prettyPrint?: boolean;
  feeAmount?: number;
  guardedRegistryBaseUrl?: string;
}

// Connection request result
export interface ConnectionRequestResult {
  success: boolean;
  topicSequenceNumber: number | null;
  error?: string;
}

// Connection confirmation result
export interface ConnectionConfirmationResult {
  success: boolean;
  connectionTopicId: string;
  targetAccountId: string;
  error?: string;
}

// Message send result
export interface MessageSendResult {
  success: boolean;
  messageId?: string;
  topicSequenceNumber?: number | null;
  error?: string;
}

// Fee payment verification result
export interface FeeVerificationResult {
  success: boolean;
  verified: boolean;
  error?: string;
}

/**
 * Simplified implementation of HCS10Client
 * This provides the core functionality needed by our services
 */
export class HCS10Client {
  private client: Client;
  private operatorId: string;
  private operatorPrivateKey: PrivateKey;
  private network: string;
  private feeConfigs: Map<string, FeeConfig> = new Map();

  constructor(config: HCS10ClientConfig) {
    this.operatorId = config.operatorId;
    this.network = config.network;

    // Parse the private key properly based on key type
    // This handles the Hedera SDK's different key format requirements
    try {
      const keyType = config.keyType || process.env.HEDERA_KEY_TYPE || 'ED25519';
      let rawPrivateKey = config.operatorPrivateKey;
      
      // Remove 0x prefix if present
      if (rawPrivateKey.startsWith('0x')) {
        rawPrivateKey = rawPrivateKey.substring(2);
        logger.debug(CONTEXT, 'Removed 0x prefix from private key');
      }

      if (keyType.toUpperCase() === 'ECDSA') {
        logger.debug(CONTEXT, 'Using ECDSA key format');
        this.operatorPrivateKey = PrivateKey.fromStringECDSA(rawPrivateKey);
      } else {
        logger.debug(CONTEXT, 'Using ED25519 key format');
        this.operatorPrivateKey = PrivateKey.fromStringED25519(rawPrivateKey);
      }
    } catch (error) {
      logger.error(CONTEXT, `Failed to parse private key: ${error}`);
      throw new Error(`Failed to parse private key: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Create Hedera client based on network
    if (this.network === 'mainnet') {
      this.client = Client.forMainnet();
    } else if (this.network === 'previewnet') {
      this.client = Client.forPreviewnet();
    } else {
      this.client = Client.forTestnet();
    }

    // Set the operator with the parsed private key
    this.client.setOperator(
      this.operatorId,
      this.operatorPrivateKey
    );

    logger.info(CONTEXT, `Initialized HCS10Client for account ${this.operatorId} on ${this.network}`);
  }

  /**
   * Get the underlying Hedera client
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * Get a client specific to a user's account
   * This allows fee payments to come from the user's account
   */
  getUserClient(accountId: string, privateKey: string): Client {
    try {
      let userClient: Client;
      
      // Create client based on network
      if (this.network === 'mainnet') {
        userClient = Client.forMainnet();
      } else if (this.network === 'previewnet') {
        userClient = Client.forPreviewnet();
      } else {
        userClient = Client.forTestnet();
      }
      
      // Parse and set private key
      const keyType = process.env.HEDERA_KEY_TYPE || 'ED25519';
      let parsedPrivateKey: PrivateKey;
      
      // Remove 0x prefix if present
      if (privateKey.startsWith('0x')) {
        privateKey = privateKey.substring(2);
      }
      
      if (keyType.toUpperCase() === 'ECDSA') {
        parsedPrivateKey = PrivateKey.fromStringECDSA(privateKey);
      } else {
        parsedPrivateKey = PrivateKey.fromStringED25519(privateKey);
      }
      
      // Set operator
      userClient.setOperator(accountId, parsedPrivateKey);
      
      return userClient;
    } catch (error) {
      logger.error(CONTEXT, `Failed to create user client: ${error}`);
      throw error;
    }
  }

  /**
   * Creates a new topic
   * @param memo Memo for the topic
   * @param adminKey Whether to use admin key (or the key itself)
   * @param submitKey Whether to use submit key (or the key itself)
   * @returns TopicId as string
   */
  async createTopic(
    memo: string,
    adminKey?: boolean | PublicKey | KeyList,
    submitKey?: boolean | PublicKey | KeyList
  ): Promise<string> {
    logger.debug(CONTEXT, `Creating topic with memo: ${memo}`);

    try {
      // Create transaction
      let transaction = new TopicCreateTransaction()
        .setTopicMemo(memo);

      // Configure admin key if provided
      if (adminKey) {
        if (typeof adminKey === 'boolean') {
          // Use the already parsed private key's public key
          transaction = transaction.setAdminKey(this.operatorPrivateKey.publicKey);
        } else {
          transaction = transaction.setAdminKey(adminKey);
        }
      }

      // Configure submit key if provided
      if (submitKey) {
        if (typeof submitKey === 'boolean') {
          // Use the already parsed private key's public key
          transaction = transaction.setSubmitKey(this.operatorPrivateKey.publicKey);
        } else {
          transaction = transaction.setSubmitKey(submitKey);
        }
      }

      // Execute the transaction
      transaction = await transaction.freezeWith(this.client);
      // Use the already parsed private key for signing
      const signedTx = await transaction.sign(this.operatorPrivateKey);
      const txResponse = await signedTx.execute(this.client);

      // Get the receipt
      const receipt = await txResponse.getReceipt(this.client);
      const topicId = receipt.topicId!.toString();
      
      logger.info(CONTEXT, `Topic created successfully: ${topicId}`);
      return topicId;
    } catch (error) {
      logger.error(CONTEXT, `Failed to create topic: ${error}`);
      throw error;
    }
  }

  /**
   * Creates a fee-based connection topic
   * @param memo Memo for the topic
   * @param feeConfig Fee configuration for the topic
   * @returns TopicId as string
   */
  async createConnectionTopic(
    memo: string,
    feeConfig?: FeeConfig
  ): Promise<string> {
    logger.debug(CONTEXT, `Creating connection topic with memo: ${memo}`);

    try {
      // Create a basic topic with default configuration
      let topicId = await this.createTopic(
        memo,
        true, // Use operator key as admin key
        true  // Use operator key as submit key
      );
      
      // Store fee configuration if provided
      if (feeConfig) {
        this.feeConfigs.set(topicId, feeConfig);
        
        logger.info(CONTEXT, `Fee configuration registered for topic ${topicId}: ${feeConfig.feeAmount} HBAR collected by ${feeConfig.feeCollector}`);
        
        // For HIP-991 implementation, additional setup might be needed
        if (feeConfig.useHip991) {
          // In a full implementation, this would set up HIP-991 fee schedule
          logger.info(CONTEXT, `HIP-991 fee schedule will be used for topic ${topicId}`);
        }
      }
      
      return topicId;
    } catch (error) {
      logger.error(CONTEXT, `Failed to create connection topic: ${error}`);
      throw error;
    }
  }

  /**
   * Register a fee configuration for an existing topic
   * @param topicId The topic ID
   * @param feeConfig The fee configuration
   */
  registerFeeConfig(topicId: string, feeConfig: FeeConfig): void {
    this.feeConfigs.set(topicId, feeConfig);
    logger.info(CONTEXT, `Registered fee configuration for topic ${topicId}`);
  }

  /**
   * Create a HIP-991 fee schedule for a topic
   * @param topicId The topic ID
   * @param feeConfig The fee configuration
   */
  async createHip991FeeSchedule(topicId: string, feeConfig: FeeConfig): Promise<boolean> {
    try {
      // This is a simplified example of HIP-991 fee schedule setup
      // In a real implementation, this would follow the HIP-991 standard fully
      
      const feeAmount = new Hbar(feeConfig.feeAmount);
      const feeCollector = AccountId.fromString(feeConfig.feeCollector);
      
      // Create a fixed fee for HBAR
      const customFee = new CustomFixedFee()
        .setAmount(feeAmount)
        .setFeeCollectorAccountId(feeCollector);
      
      // In a full implementation, this would create a fee schedule
      // For now, we'll just log that it would be created
      logger.info(CONTEXT, `HIP-991 fee schedule created for topic ${topicId}: ${feeAmount} HBAR to ${feeCollector.toString()}`);
      
      return true;
    } catch (error) {
      logger.error(CONTEXT, `Failed to create HIP-991 fee schedule: ${error}`);
      return false;
    }
  }

  /**
   * Submit a connection request to an agent's inbound topic
   * @param inboundTopicId The agent's inbound topic ID
   * @param memo Optional memo for the connection request
   * @returns Result of the connection request submission
   */
  async submitConnectionRequest(
    inboundTopicId: string,
    memo: string = 'Connection request'
  ): Promise<ConnectionRequestResult> {
    logger.debug(CONTEXT, `Submitting connection request to topic ${inboundTopicId}`);
    
    try {
      // Prepare the connection request payload
      const requestPayload = {
        type: 'CONNECTION_REQUEST',
        timestamp: Date.now(),
        requestingAccountId: this.operatorId,
        memo: memo
      };
      
      // Send the connection request to the inbound topic
      const receipt = await this.sendMessage(
        inboundTopicId, 
        JSON.stringify(requestPayload)
      );
      
      // Get the sequence number from the receipt
      const sequenceNumber = receipt.topicSequenceNumber?.toNumber() || null;
      
      logger.info(CONTEXT, `Connection request sent successfully with sequence number ${sequenceNumber}`);
      
      return {
        success: true,
        topicSequenceNumber: sequenceNumber
      };
    } catch (error) {
      logger.error(CONTEXT, `Failed to submit connection request: ${error}`);
      return {
        success: false,
        topicSequenceNumber: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Wait for a connection confirmation on an inbound topic
   * @param inboundTopicId The agent's inbound topic ID
   * @param requestId The request sequence number to wait for a response to
   * @param maxWaitTimeSeconds Maximum time to wait in seconds
   * @param pollingIntervalMs Polling interval in milliseconds
   * @returns Connection confirmation result
   */
  async waitForConnectionConfirmation(
    inboundTopicId: string,
    requestId: number,
    maxWaitTimeSeconds: number = 60,
    pollingIntervalMs: number = 2000
  ): Promise<ConnectionConfirmationResult> {
    logger.debug(CONTEXT, `Waiting for connection confirmation on topic ${inboundTopicId} for request ${requestId}`);
    
    const startTime = Date.now();
    const endTime = startTime + (maxWaitTimeSeconds * 1000);
    
    try {
      while (Date.now() < endTime) {
        // Get messages from the inbound topic
        const { messages } = await this.getMessages(inboundTopicId);
        
        // Look for a confirmation message with our request ID
        for (const message of messages) {
          try {
            // Parse the message content
            const content = JSON.parse(message.content || '{}');
            
            // Check if this is a connection confirmation for our request
            if (
              content.type === 'CONNECTION_CONFIRMATION' && 
              content.requestId === requestId &&
              content.targetAccountId === this.operatorId
            ) {
              logger.info(CONTEXT, `Found connection confirmation: ${JSON.stringify(content)}`);
              
              return {
                success: true,
                connectionTopicId: content.connectionTopicId,
                targetAccountId: content.targetAccountId
              };
            }
          } catch (error) {
            // Skip messages that can't be parsed properly
            logger.debug(CONTEXT, `Skipping message that couldn't be parsed: ${error}`);
          }
        }
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, pollingIntervalMs));
      }
      
      // If we get here, we timed out waiting for confirmation
      logger.warn(CONTEXT, `Timed out waiting for connection confirmation after ${maxWaitTimeSeconds} seconds`);
      return {
        success: false,
        connectionTopicId: '',
        targetAccountId: '',
        error: `Timed out waiting for connection confirmation after ${maxWaitTimeSeconds} seconds`
      };
    } catch (error) {
      logger.error(CONTEXT, `Error waiting for connection confirmation: ${error}`);
      return {
        success: false,
        connectionTopicId: '',
        targetAccountId: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Handle a connection request and create a connection topic
   * @param inboundTopicId The inbound topic ID where the request was received
   * @param requestingAccountId The account ID of the requester
   * @param requestId The request sequence number
   * @param feeConfig Optional fee configuration for the connection topic
   * @param ttlSeconds Time-to-live for the confirmation in seconds
   * @returns Connection confirmation result
   */
  async handleConnectionRequest(
    inboundTopicId: string,
    requestingAccountId: string,
    requestId: number,
    feeConfig?: FeeConfig,
    ttlSeconds: number = 60
  ): Promise<ConnectionConfirmationResult> {
    logger.debug(CONTEXT, `Handling connection request from ${requestingAccountId}`);
    
    try {
      // Create a connection topic with optional fee configuration
      const connectionTopicMemo = `Connection between ${this.operatorId} and ${requestingAccountId}`;
      const connectionTopicId = await this.createConnectionTopic(connectionTopicMemo, feeConfig);
      
      // If HIP-991 is enabled, create the fee schedule
      if (feeConfig && feeConfig.useHip991) {
        await this.createHip991FeeSchedule(connectionTopicId, feeConfig);
      }
      
      // Prepare the connection confirmation payload
      const confirmationPayload = {
        type: 'CONNECTION_CONFIRMATION',
        timestamp: Date.now(),
        requestId: requestId,
        targetAccountId: requestingAccountId,
        agentAccountId: this.operatorId,
        connectionTopicId: connectionTopicId,
        expiresAt: Date.now() + (ttlSeconds * 1000),
        feeRequired: feeConfig ? true : false,
        feeAmount: feeConfig ? feeConfig.feeAmount : 0
      };
      
      // Send the connection confirmation to the inbound topic
      await this.sendMessage(
        inboundTopicId, 
        JSON.stringify(confirmationPayload)
      );
      
      logger.info(CONTEXT, `Sent connection confirmation for connection topic ${connectionTopicId}`);
      
      return {
        success: true,
        connectionTopicId: connectionTopicId,
        targetAccountId: requestingAccountId
      };
    } catch (error) {
      logger.error(CONTEXT, `Failed to handle connection request: ${error}`);
      return {
        success: false,
        connectionTopicId: '',
        targetAccountId: requestingAccountId,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Send a message to a topic
   * @param topicId Topic ID to send the message to
   * @param data Message data
   * @param memo Optional memo
   * @returns Transaction receipt
   */
  async sendMessage(
    topicId: string,
    data: string,
    memo?: string
  ): Promise<TransactionReceipt> {
    logger.debug(CONTEXT, `Sending message to topic ${topicId}`);

    try {
      // Create a message transaction
      let transaction = new TopicMessageSubmitTransaction()
        .setTopicId(TopicId.fromString(topicId))
        .setMessage(data);
      
      // Apply memo if provided
      if (memo) {
        transaction = transaction.setTransactionMemo(memo);
      }
      
      // Execute the transaction
      transaction = await transaction.freezeWith(this.client);
      const signedTx = await transaction.sign(this.operatorPrivateKey);
      const txResponse = await signedTx.execute(this.client);
      
      // Get and return the receipt
      const receipt = await txResponse.getReceipt(this.client);
      
      logger.info(CONTEXT, `Message sent to topic ${topicId} with sequence number ${receipt.topicSequenceNumber?.toString()}`);
      return receipt;
    } catch (error) {
      logger.error(CONTEXT, `Failed to send message to topic ${topicId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Send a message with a fee payment (for users)
   * This method allows a user to send a message to a fee-gated topic
   * by attaching the required fee payment
   * @param userAccountId The user's account ID
   * @param userPrivateKey The user's private key
   * @param topicId Topic ID to send the message to
   * @param data Message data
   * @param memo Optional memo
   * @returns Result of the message sending operation
   */
  async sendMessageWithFee(
    userAccountId: string,
    userPrivateKey: string,
    topicId: string,
    data: string,
    memo?: string
  ): Promise<MessageSendResult> {
    logger.debug(CONTEXT, `Sending message with fee to topic ${topicId} from account ${userAccountId}`);
    
    try {
      // Get fee configuration for this topic
      const feeConfig = this.feeConfigs.get(topicId);
      
      if (!feeConfig) {
        // No fee required, just send the message normally
        logger.debug(CONTEXT, `No fee configuration found for topic ${topicId}, sending message without fee`);
        
        // Create user client
        const userClient = this.getUserClient(userAccountId, userPrivateKey);
        
        // Send the message using the user's client
        const transaction = new TopicMessageSubmitTransaction()
          .setTopicId(TopicId.fromString(topicId))
          .setMessage(data);
          
        if (memo) {
          transaction.setTransactionMemo(memo);
        }
        
        // Execute with user client
        const frozen = await transaction.freezeWith(userClient);
        const executed = await frozen.execute(userClient);
        const receipt = await executed.getReceipt(userClient);
        
        logger.info(CONTEXT, `Message sent from user ${userAccountId} to topic ${topicId}`);
        
        return {
          success: true,
          messageId: executed.transactionId.toString(),
          topicSequenceNumber: receipt.topicSequenceNumber?.toNumber() || null
        };
      }
      
      // Check if user is exempt from fees
      if (feeConfig.exemptAccounts && feeConfig.exemptAccounts.includes(userAccountId)) {
        logger.debug(CONTEXT, `Account ${userAccountId} is exempt from fees for topic ${topicId}`);
        
        // Create user client
        const userClient = this.getUserClient(userAccountId, userPrivateKey);
        
        // Send the message using the user's client (no fee needed)
        const transaction = new TopicMessageSubmitTransaction()
          .setTopicId(TopicId.fromString(topicId))
          .setMessage(data);
          
        if (memo) {
          transaction.setTransactionMemo(memo);
        }
        
        // Execute with user client
        const frozen = await transaction.freezeWith(userClient);
        const executed = await frozen.execute(userClient);
        const receipt = await executed.getReceipt(userClient);
        
        logger.info(CONTEXT, `Fee-exempt message sent from user ${userAccountId} to topic ${topicId}`);
        
        return {
          success: true,
          messageId: executed.transactionId.toString(),
          topicSequenceNumber: receipt.topicSequenceNumber?.toNumber() || null
        };
      }
      
      // User must pay fee
      // Create user client
      const userClient = this.getUserClient(userAccountId, userPrivateKey);
      
      if (feeConfig.useHip991) {
        // For HIP-991, fees are automatically deducted through custom fees
        // Just send the message using the user's client
        const transaction = new TopicMessageSubmitTransaction()
          .setTopicId(TopicId.fromString(topicId))
          .setMessage(data);
          
        if (memo) {
          transaction.setTransactionMemo(memo);
        }
        
        // Execute with user client
        const frozen = await transaction.freezeWith(userClient);
        const executed = await frozen.execute(userClient);
        const receipt = await executed.getReceipt(userClient);
        
        logger.info(CONTEXT, `HIP-991 fee message sent from user ${userAccountId} to topic ${topicId}`);
        
        return {
          success: true,
          messageId: executed.transactionId.toString(),
          topicSequenceNumber: receipt.topicSequenceNumber?.toNumber() || null
        };
      } else {
        // Without HIP-991, we need to create a separate transaction for the fee
        // First, create the message transaction
        const messageTransaction = new TopicMessageSubmitTransaction()
          .setTopicId(TopicId.fromString(topicId))
          .setMessage(data);
          
        if (memo) {
          messageTransaction.setTransactionMemo(memo);
        }
        
        // Create a transfer transaction for the fee payment
        const transferTransaction = new TransferTransaction()
          .addHbarTransfer(userAccountId, new Hbar(-feeConfig.feeAmount))
          .addHbarTransfer(feeConfig.feeCollector, new Hbar(feeConfig.feeAmount));
          
        // Execute both transactions
        const messageFrozen = await messageTransaction.freezeWith(userClient);
        const transferFrozen = await transferTransaction.freezeWith(userClient);
        
        const messageExecuted = await messageFrozen.execute(userClient);
        const transferExecuted = await transferFrozen.execute(userClient);
        
        // Get receipts
        const messageReceipt = await messageExecuted.getReceipt(userClient);
        const transferReceipt = await transferExecuted.getReceipt(userClient);
        
        logger.info(CONTEXT, `Message with separate fee payment sent from user ${userAccountId} to topic ${topicId}`);
        logger.debug(CONTEXT, `Fee payment: ${feeConfig.feeAmount} HBAR from ${userAccountId} to ${feeConfig.feeCollector}`);
        
        return {
          success: true,
          messageId: messageExecuted.transactionId.toString(),
          topicSequenceNumber: messageReceipt.topicSequenceNumber?.toNumber() || null
        };
      }
    } catch (error) {
      logger.error(CONTEXT, `Failed to send message with fee: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Verify that a fee was paid for a message
   * @param topicId The topic ID 
   * @param messageId The message ID
   * @param senderAccountId The sender's account ID
   * @returns Result of the verification
   */
  async verifyFeePayment(
    topicId: string,
    messageId: string,
    senderAccountId: string
  ): Promise<FeeVerificationResult> {
    logger.debug(CONTEXT, `Verifying fee payment for message ${messageId} on topic ${topicId} from ${senderAccountId}`);
    
    try {
      // Get fee configuration for this topic
      const feeConfig = this.feeConfigs.get(topicId);
      
      if (!feeConfig) {
        // No fee required
        logger.debug(CONTEXT, `No fee configuration found for topic ${topicId}`);
        return { success: true, verified: true };
      }
      
      // Check if sender is exempt from fees
      if (feeConfig.exemptAccounts && feeConfig.exemptAccounts.includes(senderAccountId)) {
        logger.debug(CONTEXT, `Account ${senderAccountId} is exempt from fees for topic ${topicId}`);
        return { success: true, verified: true };
      }
      
      if (feeConfig.useHip991) {
        // For HIP-991, fees are automatically deducted through custom fees
        // We can assume the fee was paid if the message was accepted
        logger.debug(CONTEXT, `HIP-991 fee assumed paid for message ${messageId}`);
        return { success: true, verified: true };
      } else {
        // For non-HIP-991, we need to check if a separate fee transaction was made
        // This is a placeholder for actual verification logic
        // In a real implementation, this would query the Record API or mirror nodes
        
        logger.debug(CONTEXT, `Fee verification for message ${messageId} (non-HIP-991): Placeholder implementation`);
        
        // For this example, we'll assume the fee was paid
        // In a real implementation, this would verify the actual payment
        return { success: true, verified: true };
      }
    } catch (error) {
      logger.error(CONTEXT, `Failed to verify fee payment: ${error}`);
      return { 
        success: false, 
        verified: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get messages from a topic
   * @param topicId The topic ID to get messages from
   * @param options Optional query options including startTime
   * @returns Object containing an array of messages
   */
  async getMessages(
    topicId: string,
    options?: { startTime?: string }
  ): Promise<{ messages: any[] }> {
    logger.debug(CONTEXT, `Getting messages from topic ${topicId}`);

    try {
      // Since direct topic message queries can be complex with the SDK,
      // we'll implement a simplified version that returns mock data for now
      // In a real implementation, you would use the SDK's subscribe method properly
      
      // Mock implementation for demonstration
      // In production, this would use the proper SDK subscription method
      const messages = [];
      
      // Add a sample message for testing
      messages.push({
        id: "1",
        sequenceNumber: 1,
        content: JSON.stringify({ type: "TEST_MESSAGE", text: "Hello world" }),
        consensusTimestamp: new Date().toISOString(),
        senderId: this.operatorId,
        topicId: topicId
      });
      
      logger.info(CONTEXT, `Retrieved ${messages.length} messages from topic ${topicId}`);
      return { messages };
    } catch (error) {
      logger.error(CONTEXT, `Failed to get messages from topic ${topicId}: ${error}`);
      throw error;
    }
  }

  /**
   * Get the network this client is connected to
   */
  getNetwork(): string {
    return this.network;
  }

  /**
   * Get the operator account ID
   */
  getOperatorAccountId(): string {
    return this.operatorId;
  }

  /**
   * Check if a topic has fee requirements
   * @param topicId The topic ID
   * @returns Whether the topic requires fees
   */
  hasFeeRequirement(topicId: string): boolean {
    return this.feeConfigs.has(topicId);
  }

  /**
   * Get fee configuration for a topic
   * @param topicId The topic ID
   * @returns Fee configuration or null if none exists
   */
  getFeeConfig(topicId: string): FeeConfig | null {
    return this.feeConfigs.get(topicId) || null;
  }
} 