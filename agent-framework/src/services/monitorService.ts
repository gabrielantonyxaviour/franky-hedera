import { HCS10Client, HCSMessage } from '@hashgraphonline/standards-sdk';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import { FeeConfig } from '../utils/feeUtils';
import * as fs from 'fs';
import * as path from 'path';

// Import AI service for generating responses
import { generateCharacterResponse } from './aiService';
import { getConnectionByTopicId } from './storageService';

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
 * Service to monitor message topics and verify fee payments
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
   * Start monitoring a topic for messages
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
          const result = await this.client.getMessages(topicId);
          if (result && result.messages && result.messages.length > 0) {
            // Get the last processed sequence number for this topic
            const lastProcessed = this.lastProcessedMessage.get(topicId) || 0;
            
            // Filter for new messages
            const newMessages = result.messages
              .filter(msg => msg.sequence_number > lastProcessed)
              .sort((a, b) => a.sequence_number - b.sequence_number);
              
            // Process each new message
            for (const message of newMessages) {
              // Update last processed sequence
              this.lastProcessedMessage.set(topicId, message.sequence_number);
              
              // Process the message content
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
   * Process a message and generate a response if needed
   * @param topicId The topic ID where the message was received
   * @param message The message to process
   */
  private async processMessage(topicId: string, message: HCSMessage): Promise<void> {
    try {
      // Only process if it's a message with data
      if (!message.data || typeof message.data !== 'string') {
        return;
      }
      
      // Try to parse the message content
      let content;
      try {
        content = JSON.parse(message.data);
      } catch (e) {
        // Not a JSON message, skip
        return;
      }
      
      // Only respond to message with prompt, id, and response_id
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
        
        // Send response
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
    } catch (error) {
      logger.error('MONITOR', `Error processing message on topic ${topicId}: ${error}`, error);
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