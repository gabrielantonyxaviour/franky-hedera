import { 
  Client, 
  AccountId, 
  PrivateKey, 
  TopicCreateTransaction, 
  TopicMessageSubmitTransaction, 
  TopicId, 
  TopicMessageQuery,
  TopicInfoQuery,
  TopicMessage
} from "@hashgraph/sdk";

// Environment configuration
const HEDERA_NETWORK = process.env.HEDERA_NETWORK || 'testnet';
const OPERATOR_ID = process.env.HEDERA_OPERATOR_ID || '';
const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY || '';

// Topic configuration
const DEVICE_REGISTRY_TOPIC_ID = process.env.DEVICE_REGISTRY_TOPIC_ID || '';
const CHECKER_REGISTRY_TOPIC_ID = process.env.CHECKER_REGISTRY_TOPIC_ID || '';

// Message types for different reputation operations
export enum MessageType {
  REGISTER_CHECKER = 'REGISTER_CHECKER',
  CHECKER_HEARTBEAT = 'CHECKER_HEARTBEAT',
  DEVICE_CHECK = 'DEVICE_CHECK',
  CONSENSUS_RESULT = 'CONSENSUS_RESULT'
}

// Message structure for HCS
interface HcsMessage {
  type: MessageType;
  payload: any;
  timestamp: string;
  sender: string;
  signature?: string;
}

// HCS Service for reputation system
export class HcsService {
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;
  private deviceRegistryTopic: TopicId | null = null;
  private checkerRegistryTopic: TopicId | null = null;

  constructor() {
    // Initialize Hedera client
    this.operatorId = AccountId.fromString(OPERATOR_ID);
    this.operatorKey = PrivateKey.fromString(OPERATOR_KEY);
    
    // Create client based on network setting
    if (HEDERA_NETWORK === 'mainnet') {
      this.client = Client.forMainnet();
    } else {
      this.client = Client.forTestnet();
    }
    
    this.client.setOperator(this.operatorId, this.operatorKey);
    
    // Set topic IDs if available in environment variables
    if (DEVICE_REGISTRY_TOPIC_ID) {
      this.deviceRegistryTopic = TopicId.fromString(DEVICE_REGISTRY_TOPIC_ID);
    }
    
    if (CHECKER_REGISTRY_TOPIC_ID) {
      this.checkerRegistryTopic = TopicId.fromString(CHECKER_REGISTRY_TOPIC_ID);
    }
  }

  /**
   * Initialize HCS topics for reputation system if they don't exist
   */
  async initializeTopics(): Promise<void> {
    // Create device registry topic if not already set
    if (!this.deviceRegistryTopic) {
      console.log("Creating device registry topic...");
      const deviceTopic = await this.createTopic("Franky Device Registry");
      this.deviceRegistryTopic = deviceTopic;
      console.log(`Device registry topic created: ${deviceTopic.toString()}`);
    }

    // Create checker registry topic if not already set
    if (!this.checkerRegistryTopic) {
      console.log("Creating checker registry topic...");
      const checkerTopic = await this.createTopic("Franky Checker Registry");
      this.checkerRegistryTopic = checkerTopic;
      console.log(`Checker registry topic created: ${checkerTopic.toString()}`);
    }
  }

  /**
   * Create a new topic on Hedera
   * @param memo Topic description
   * @returns TopicId of the created topic
   */
  async createTopic(memo: string): Promise<TopicId> {
    try {
      // Create a new topic
      const transaction = new TopicCreateTransaction()
        .setTopicMemo(memo)
        .setSubmitKey(this.operatorKey.publicKey);

      // Sign with the client operator key and submit
      const txResponse = await transaction.execute(this.client);
      
      // Get the receipt to confirm successful creation
      const receipt = await txResponse.getReceipt(this.client);
      
      if (!receipt.topicId) {
        throw new Error("Failed to create topic");
      }
      
      return receipt.topicId;
    } catch (error) {
      console.error(`Error creating topic: ${error}`);
      throw error;
    }
  }

  /**
   * Get or create a device-specific topic
   * @param deviceId Device address
   * @returns TopicId for the device reputation
   */
  async getDeviceTopic(deviceId: string): Promise<TopicId> {
    try {
      if (!this.deviceRegistryTopic) {
        await this.initializeTopics();
      }

      // First check if this device already has a topic
      const deviceTopicKey = `device:${deviceId.toLowerCase()}`;
      const existingTopicId = await this.getDeviceTopicMapping(deviceId);
      
      if (existingTopicId) {
        return TopicId.fromString(existingTopicId);
      }
      
      // If not, create a new topic for this device
      const deviceTopic = await this.createTopic(`Franky Device Reputation: ${deviceId}`);
      
      // Register the mapping in the device registry topic
      if (this.deviceRegistryTopic) {
        await this.submitMessage(this.deviceRegistryTopic, {
          type: 'DEVICE_TOPIC_MAPPING',
          deviceId: deviceId.toLowerCase(),
          topicId: deviceTopic.toString(),
          timestamp: new Date().toISOString()
        });
      }
      
      return deviceTopic;
    } catch (error) {
      console.error(`Error getting device topic: ${error}`);
      throw error;
    }
  }

  /**
   * Look up the topic ID for a specific device
   * @param deviceId Device address
   * @returns TopicId as string if found, null otherwise
   */
  async getDeviceTopicMapping(deviceId: string): Promise<string | null> {
    try {
      if (!this.deviceRegistryTopic) {
        await this.initializeTopics();
        if (!this.deviceRegistryTopic) {
          return null;
        }
      }

      const messages = await this.getMessages(this.deviceRegistryTopic);
      
      // Find the most recent mapping for this device
      const deviceLower = deviceId.toLowerCase();
      const mappings = messages
        .filter(msg => {
          try {
            const content = JSON.parse(msg.message);
            return content.type === 'DEVICE_TOPIC_MAPPING' && content.deviceId === deviceLower;
          } catch {
            return false;
          }
        })
        .sort((a, b) => {
          // Sort by sequence number (most recent first)
          return b.sequenceNumber - a.sequenceNumber;
        });
      
      if (mappings.length > 0) {
        const content = JSON.parse(mappings[0].message);
        return content.topicId;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting device topic mapping: ${error}`);
      return null;
    }
  }

  /**
   * Submit a message to a HCS topic
   * @param topicId Topic to submit to
   * @param message Message object to submit
   * @returns Transaction ID
   */
  async submitMessage(topicId: TopicId, message: any): Promise<string> {
    try {
      // Convert message to string if it's an object
      const messageString = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);
      
      // Create the transaction
      const transaction = new TopicMessageSubmitTransaction({
        topicId: topicId,
        message: messageString,
      });
      
      // Sign and submit
      const txResponse = await transaction.execute(this.client);
      
      // Get receipt
      const receipt = await txResponse.getReceipt(this.client);
      
      return txResponse.transactionId.toString();
    } catch (error) {
      console.error(`Error submitting message: ${error}`);
      throw error;
    }
  }

  /**
   * Get messages from a topic
   * @param topicId Topic to query
   * @param limit Maximum number of messages to retrieve
   * @returns Array of topic messages
   */
  async getMessages(topicId: TopicId, limit: number = 100): Promise<any[]> {
    try {
      const messages: any[] = [];
      
      // Set up a topic message query
      const query = new TopicMessageQuery()
        .setTopicId(topicId)
        .setLimit(limit);
      
      // Execute the query and collect messages
      await new Promise<void>((resolve, reject) => {
        let count = 0;
        
        query.subscribe(
          this.client,
          (message: TopicMessage | null) => {
            if (!message) return;
            
            count++;
            
            // Convert message content to string
            const messageContent = Buffer.from(message.contents).toString();
            
            messages.push({
              sequenceNumber: message.sequenceNumber,
              consensusTimestamp: message.consensusTimestamp.toDate(),
              message: messageContent,
              runningHash: Buffer.from(message.runningHash).toString('hex'),
              topicId: topicId.toString()
            });
            
            // Resolve when we've reached our limit
            if (count >= limit) {
              resolve();
            }
          },
          (error) => {
            reject(error);
          }
        );
        
        // Set a timeout to resolve if fewer than limit messages exist
        setTimeout(() => {
          if (messages.length < limit) {
            resolve();
          }
        }, 10000); // 10 second timeout
      });
      
      return messages;
    } catch (error) {
      console.error(`Error getting messages: ${error}`);
      return [];
    }
  }

  /**
   * Register a new checker node
   * @param walletAddress Checker's wallet address
   * @param serverUrl Checker's server URL
   * @returns Transaction ID
   */
  async registerChecker(walletAddress: string, serverUrl: string): Promise<string> {
    try {
      if (!this.checkerRegistryTopic) {
        await this.initializeTopics();
        if (!this.checkerRegistryTopic) {
          throw new Error("Failed to initialize checker registry topic");
        }
      }

      const message: HcsMessage = {
        type: MessageType.REGISTER_CHECKER,
        payload: {
          walletAddress: walletAddress.toLowerCase(),
          serverUrl,
          registeredAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        sender: this.operatorId.toString()
      };
      
      return await this.submitMessage(this.checkerRegistryTopic, message);
    } catch (error) {
      console.error(`Error registering checker: ${error}`);
      throw error;
    }
  }

  /**
   * Get registered checker nodes
   * @returns Array of checker nodes
   */
  async getCheckers(): Promise<any[]> {
    try {
      if (!this.checkerRegistryTopic) {
        await this.initializeTopics();
        if (!this.checkerRegistryTopic) {
          return [];
        }
      }

      const messages = await this.getMessages(this.checkerRegistryTopic);
      const checkers = new Map<string, any>();
      
      // Process messages to build checker list
      messages.forEach(msg => {
        try {
          const content = JSON.parse(msg.message);
          
          if (content.type === MessageType.REGISTER_CHECKER) {
            const checker = content.payload;
            
            // Update or add checker info
            checkers.set(checker.walletAddress.toLowerCase(), {
              walletAddress: checker.walletAddress.toLowerCase(),
              serverUrl: checker.serverUrl,
              registeredAt: checker.registeredAt,
              lastSeen: content.timestamp,
              // Track when we last saw activity from this checker
              lastActivity: msg.consensusTimestamp
            });
          } else if (content.type === MessageType.CHECKER_HEARTBEAT) {
            // Update last seen time for heartbeats
            const checker = checkers.get(content.payload.walletAddress.toLowerCase());
            if (checker) {
              checker.lastSeen = content.timestamp;
              checker.lastActivity = msg.consensusTimestamp;
              checkers.set(content.payload.walletAddress.toLowerCase(), checker);
            }
          }
        } catch (e) {
          console.error("Error processing checker message:", e);
        }
      });
      
      return Array.from(checkers.values());
    } catch (error) {
      console.error(`Error getting checkers: ${error}`);
      return [];
    }
  }

  /**
   * Submit a device check result
   * @param checkerAddress Checker's wallet address
   * @param deviceAddress Device address being checked
   * @param checkResults Results of the device check
   * @returns Transaction ID
   */
  async submitDeviceCheck(
    checkerAddress: string,
    deviceAddress: string,
    checkResults: any
  ): Promise<string> {
    try {
      // Get the topic for this device
      const deviceTopic = await this.getDeviceTopic(deviceAddress);
      
      // Format the check message
      const message: HcsMessage = {
        type: MessageType.DEVICE_CHECK,
        payload: {
          checkerAddress: checkerAddress.toLowerCase(),
          deviceAddress: deviceAddress.toLowerCase(),
          results: checkResults,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        sender: this.operatorId.toString()
      };
      
      // Submit to the device's topic
      return await this.submitMessage(deviceTopic, message);
    } catch (error) {
      console.error(`Error submitting device check: ${error}`);
      throw error;
    }
  }

  /**
   * Get reputation data for a device using HCS consensus
   * @param deviceAddress Device address to check
   * @param checkCount Number of recent checks to include
   * @returns Consensus reputation data
   */
  async getDeviceReputation(deviceAddress: string, checkCount: number = 10): Promise<any> {
    try {
      // Get the topic for this device
      const deviceTopicId = await this.getDeviceTopicMapping(deviceAddress);
      
      if (!deviceTopicId) {
        return {
          deviceAddress,
          status: 'unknown',
          message: 'No reputation data found for this device'
        };
      }
      
      const deviceTopic = TopicId.fromString(deviceTopicId);
      
      // Get messages from the device topic
      const messages = await this.getMessages(deviceTopic, checkCount);
      
      if (messages.length === 0) {
        return {
          deviceAddress,
          status: 'unknown',
          message: 'No check results found for this device'
        };
      }
      
      // Extract check results
      const checkResults = messages
        .filter(msg => {
          try {
            const content = JSON.parse(msg.message);
            return content.type === MessageType.DEVICE_CHECK;
          } catch (e) {
            return false;
          }
        })
        .map(msg => {
          const content = JSON.parse(msg.message);
          return {
            ...content.payload,
            consensusTimestamp: msg.consensusTimestamp,
            sequenceNumber: msg.sequenceNumber
          };
        });
      
      if (checkResults.length === 0) {
        return {
          deviceAddress,
          status: 'unknown',
          message: 'No valid check results found for this device'
        };
      }
      
      // Calculate consensus reputation
      const reputationScore = this.calculateReputationConsensus(checkResults);
      
      return {
        deviceAddress,
        status: 'checked',
        reputationScore,
        lastChecked: new Date().toISOString(),
        checkResults: checkResults.slice(0, 10), // Include the 10 most recent checks
        checkCount: checkResults.length,
        consensusTimestamp: checkResults[0].consensusTimestamp
      };
    } catch (error: unknown) {
      console.error(`Error getting device reputation: ${error}`);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        deviceAddress,
        status: 'error',
        message: `Error retrieving reputation: ${errorMessage}`
      };
    }
  }

  /**
   * Calculate consensus reputation score from check results
   * @param checkResults Array of check results from different checkers
   * @returns Consensus reputation score and metrics
   */
  private calculateReputationConsensus(checkResults: any[]): any {
    // Group results by checker to prevent a single checker from dominating
    const checkerResults = new Map<string, any[]>();
    
    checkResults.forEach(result => {
      const checker = result.checkerAddress.toLowerCase();
      if (!checkerResults.has(checker)) {
        checkerResults.set(checker, []);
      }
      checkerResults.get(checker)?.push(result);
    });
    
    // For each checker, get their most recent result
    const latestResults = Array.from(checkerResults.entries())
      .map(([checker, results]) => {
        // Sort by consensus timestamp (most recent first)
        results.sort((a, b) => 
          new Date(b.consensusTimestamp).getTime() - 
          new Date(a.consensusTimestamp).getTime()
        );
        return results[0]; // Return the most recent result
      });
    
    if (latestResults.length === 0) {
      return {
        score: 0,
        message: 'No valid results to calculate consensus'
      };
    }
    
    // Calculate median values for key metrics
    const successRates = latestResults
      .map(r => r.results.retrievalStats?.successRate || 0);
    const responseTimes = latestResults
      .map(r => r.results.retrievalStats?.averageResponseTime || 0);
    const reputationScores = latestResults
      .map(r => r.results.reputationScore || 0);
    
    // Calculate consensus values using median
    const consensusScore = this.calculateMedian(reputationScores);
    const consensusSuccessRate = this.calculateMedian(successRates);
    const consensusResponseTime = this.calculateMedian(responseTimes);
    
    return {
      score: consensusScore,
      successRate: consensusSuccessRate,
      responseTime: consensusResponseTime,
      checkerCount: latestResults.length,
      consensus: 'median'
    };
  }

  /**
   * Calculate median value from an array of numbers
   * @param values Array of numeric values
   * @returns Median value
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    // Sort values
    const sorted = [...values].sort((a, b) => a - b);
    
    // Get median
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      // Even number of values, average the middle two
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      // Odd number of values, return the middle one
      return sorted[mid];
    }
  }
}

// Export a singleton instance
export const hcsService = new HcsService(); 