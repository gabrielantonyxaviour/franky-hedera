import { 
  Client, 
  AccountId, 
  PrivateKey, 
  TopicCreateTransaction, 
  TopicMessageSubmitTransaction, 
  TopicId, 
  TopicMessageQuery,
  TopicInfoQuery,
  TopicMessage,
  Status,
  Hbar
} from "@hashgraph/sdk";

// Environment configuration with validation
const HEDERA_NETWORK = process.env.HEDERA_NETWORK || 'testnet';
const OPERATOR_ID = process.env.HEDERA_OPERATOR_ID;
const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY;
const DEVICE_REGISTRY_TOPIC_ID = process.env.DEVICE_REGISTRY_TOPIC_ID;
const CHECKER_REGISTRY_TOPIC_ID = process.env.CHECKER_REGISTRY_TOPIC_ID;

// Add fs and path for .env management
import * as fs from 'fs';
import * as path from 'path';

// Function to update .env file with new topic IDs
async function updateEnvFile(updates: { [key: string]: string }) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    
    // Read existing content if file exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Update or add each key-value pair
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${value}`;
      
      if (regex.test(envContent)) {
        // Update existing line
        envContent = envContent.replace(regex, newLine);
      } else {
        // Add new line
        envContent += `\n${newLine}`;
      }
    }

    // Write back to file
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log('Updated .env with new topic IDs');
  } catch (error) {
    console.error('Error updating .env file:', error);
    // Don't throw - this is a non-critical operation
  }
}

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

// Test result interface
interface TestResult {
  success: boolean;
  duration: number;
  status?: number;
  error?: string;
}

// HCS Service for reputation system
export class HcsService {
  private client: Client | null = null;
  private operatorId: AccountId | null = null;
  private operatorKey: PrivateKey | null = null;
  private deviceRegistryTopic: TopicId | null = null;
  private checkerRegistryTopic: TopicId | null = null;
  private initialized: boolean = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      // Validate required environment variables
      if (!OPERATOR_ID || !OPERATOR_KEY) {
        throw new Error('Missing required Hedera credentials. Please set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY');
      }

      // Initialize operator credentials
      this.operatorId = AccountId.fromString(OPERATOR_ID);
      this.operatorKey = process.env.HEDERA_KEY_TYPE === "ECDSA" 
        ? PrivateKey.fromStringECDSA(OPERATOR_KEY)
        : PrivateKey.fromString(OPERATOR_KEY);
      
      // Create client based on network setting
      this.client = HEDERA_NETWORK === 'mainnet' 
        ? Client.forMainnet()
        : Client.forTestnet();
      
      this.client.setOperator(this.operatorId, this.operatorKey);
      
      // Set existing topic IDs if available
      if (DEVICE_REGISTRY_TOPIC_ID) {
        this.deviceRegistryTopic = TopicId.fromString(DEVICE_REGISTRY_TOPIC_ID);
      }
      
      if (CHECKER_REGISTRY_TOPIC_ID) {
        this.checkerRegistryTopic = TopicId.fromString(CHECKER_REGISTRY_TOPIC_ID);
      }

      this.initialized = true;
      console.log('HCS Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize HCS Service:', error);
      this.initialized = false;
      throw error;
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.client) {
      throw new Error('HCS Service not properly initialized');
    }
  }

  /**
   * Initialize HCS topics for reputation system if they don't exist
   */
  async initializeTopics(): Promise<void> {
    this.ensureInitialized();

    try {
      // First try to use existing topic IDs from environment
      if (DEVICE_REGISTRY_TOPIC_ID && CHECKER_REGISTRY_TOPIC_ID) {
        console.log('Using existing registry topics from environment');
        
        // Verify topics exist and are accessible
        try {
          // Device Registry Topic
          this.deviceRegistryTopic = TopicId.fromString(DEVICE_REGISTRY_TOPIC_ID);
          await this.verifyTopicAccess(this.deviceRegistryTopic);
          console.log('Device registry topic verified:', DEVICE_REGISTRY_TOPIC_ID);
          
          // Checker Registry Topic
          this.checkerRegistryTopic = TopicId.fromString(CHECKER_REGISTRY_TOPIC_ID);
          await this.verifyTopicAccess(this.checkerRegistryTopic);
          console.log('Checker registry topic verified:', CHECKER_REGISTRY_TOPIC_ID);
          
          // Both topics verified successfully
          return;
        } catch (error) {
          console.error('Failed to verify existing topics:', error);
          // Reset topics to ensure clean creation
          this.deviceRegistryTopic = null;
          this.checkerRegistryTopic = null;
        }
      }

      // Create topics sequentially to ensure uniqueness
      if (!this.deviceRegistryTopic) {
        console.log("Creating device registry topic...");
        const deviceTopic = await this.createTopic(
          "Franky Device Registry",
          "Registry for device reputation topics"
        );
        this.deviceRegistryTopic = deviceTopic;
        
        // Save device registry topic immediately
        await updateEnvFile({
          DEVICE_REGISTRY_TOPIC_ID: deviceTopic.toString()
        });
        console.log(`Device registry topic created and saved: ${deviceTopic.toString()}`);
      }

      // Wait a moment before creating the second topic
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (!this.checkerRegistryTopic) {
        console.log("Creating checker registry topic...");
        const checkerTopic = await this.createTopic(
          "Franky Checker Registry",
          "Registry for reputation checker nodes"
        );
        this.checkerRegistryTopic = checkerTopic;
        
        // Save checker registry topic immediately
        await updateEnvFile({
          CHECKER_REGISTRY_TOPIC_ID: checkerTopic.toString()
        });
        console.log(`Checker registry topic created and saved: ${checkerTopic.toString()}`);
      }

    } catch (error) {
      console.error('Failed to initialize topics:', error);
      throw error;
    }
  }

  /**
   * Verify topic exists and is accessible
   */
  private async verifyTopicAccess(topicId: TopicId): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    
    try {
      const query = new TopicInfoQuery()
        .setTopicId(topicId);
      
      await query.execute(this.client);
    } catch (error) {
      throw new Error(`Topic ${topicId.toString()} is not accessible: ${error}`);
    }
  }

  /**
   * Create a new topic on Hedera
   */
  private async createTopic(name: string, memo: string): Promise<TopicId> {
    this.ensureInitialized();

    try {
      if (!this.client || !this.operatorKey) {
        throw new Error('Client or operator key not initialized');
      }

      console.log(`Creating topic: ${name}`);
      
      // Create a new topic with memo and submit key
      const transaction = await (
        new TopicCreateTransaction()
          .setTopicMemo(memo)
          .setAdminKey(this.operatorKey.publicKey)
          .setSubmitKey(this.operatorKey.publicKey)
          .setMaxTransactionFee(new Hbar(2))
          .freezeWith(this.client)
      );

      // Execute with retry logic
      let attempts = 0;
      const maxAttempts = 3;
      let lastError: Error | null = null;

      while (attempts < maxAttempts) {
        try {
          console.log(`Attempt ${attempts + 1} of ${maxAttempts} to create topic`);
          
          // Sign with the operator key
          const signedTx = await transaction.sign(this.operatorKey);
          
          // Execute the transaction
          const txResponse = await signedTx.execute(this.client);
          
          // Wait for receipt with timeout
          const receipt = await txResponse.getReceipt(this.client);
          
          if (!receipt.topicId) {
            throw new Error('No topic ID in receipt');
          }
          
          console.log(`Topic created successfully: ${receipt.topicId.toString()}`);
          return receipt.topicId;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          attempts++;
          
          if (attempts < maxAttempts) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
          }
        }
      }

      throw new Error(`Failed to create topic after ${maxAttempts} attempts: ${lastError?.message}`);
    } catch (error) {
      console.error(`Error creating topic: ${error}`);
      throw error;
    }
  }

  /**
   * Submit a message to a HCS topic
   */
  private async submitMessage(topicId: TopicId, message: any): Promise<string> {
    this.ensureInitialized();

    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      // Convert message to string if it's an object
      const messageString = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);
      
      // Create and execute the transaction
      const transaction = new TopicMessageSubmitTransaction({
        topicId: topicId,
        message: messageString,
      })
      .setMaxTransactionFee(new Hbar(2));
      
      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      
      if (receipt.status !== Status.Success) {
        throw new Error(`Message submission failed with status: ${receipt.status}`);
      }
      
      return txResponse.transactionId.toString();
    } catch (error) {
      console.error(`Error submitting message: ${error}`);
      throw error;
    }
  }

  /**
   * Get messages from a topic
   */
  private async getMessages(topicId: TopicId, limit: number = 100): Promise<any[]> {
    this.ensureInitialized();

    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const messages: any[] = [];
      
      // Set up a topic message query
      const query = new TopicMessageQuery()
        .setTopicId(topicId)
        .setLimit(limit);
      
      // Execute the query and collect messages
      await new Promise<void>((resolve, reject) => {
        let count = 0;
        
        query.subscribe(
          this.client!,
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
   */
  async registerChecker(walletAddress: string, serverUrl: string): Promise<string> {
    this.ensureInitialized();

    try {
      if (!this.checkerRegistryTopic) {
        await this.initializeTopics();
        if (!this.checkerRegistryTopic) {
          throw new Error('Failed to initialize checker registry topic');
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
        sender: this.operatorId?.toString() || 'unknown'
      };
      
      return await this.submitMessage(this.checkerRegistryTopic, message);
    } catch (error) {
      console.error(`Error registering checker: ${error}`);
      throw error;
    }
  }

  /**
   * Get registered checker nodes
   */
  async getCheckers(): Promise<any[]> {
    this.ensureInitialized();

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
   */
  async submitDeviceCheck(
    checkerAddress: string,
    deviceAddress: string,
    checkResults: any
  ): Promise<string> {
    this.ensureInitialized();

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
        sender: this.operatorId?.toString() || 'unknown'
      };
      
      // Submit to the device's topic
      return await this.submitMessage(deviceTopic, message);
    } catch (error) {
      console.error(`Error submitting device check: ${error}`);
      throw error;
    }
  }

  /**
   * Get or create a device-specific topic
   */
  private async getDeviceTopic(deviceId: string): Promise<TopicId> {
    this.ensureInitialized();

    try {
      if (!this.deviceRegistryTopic) {
        await this.initializeTopics();
        if (!this.deviceRegistryTopic) {
          throw new Error('Failed to initialize device registry topic');
        }
      }

      // First check if this device already has a topic
      const existingTopicId = await this.getDeviceTopicMapping(deviceId);
      
      if (existingTopicId) {
        return TopicId.fromString(existingTopicId);
      }
      
      // If not, create a new topic for this device
      const deviceTopic = await this.createTopic(
        `Franky Device Reputation: ${deviceId}`,
        `Reputation topic for device ${deviceId}`
      );
      
      // Register the mapping in the device registry topic
      await this.submitMessage(this.deviceRegistryTopic, {
        type: 'DEVICE_TOPIC_MAPPING',
        deviceId: deviceId.toLowerCase(),
        topicId: deviceTopic.toString(),
        timestamp: new Date().toISOString()
      });
      
      return deviceTopic;
    } catch (error) {
      console.error(`Error getting device topic: ${error}`);
      throw error;
    }
  }

  /**
   * Look up the topic ID for a specific device
   */
  private async getDeviceTopicMapping(deviceId: string): Promise<string | null> {
    this.ensureInitialized();

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
        .sort((a, b) => b.sequenceNumber - a.sequenceNumber);
      
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
   * Get reputation data for a device using HCS consensus
   */
  async getDeviceReputation(deviceAddress: string, checkCount: number = 10): Promise<any> {
    this.ensureInitialized();

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

  // Add getter methods for topic IDs
  public async getDeviceRegistryTopicId(): Promise<string> {
    this.ensureInitialized();
    return this.deviceRegistryTopic?.toString() || '';
  }

  public async getCheckerRegistryTopicId(): Promise<string> {
    this.ensureInitialized();
    return this.checkerRegistryTopic?.toString() || '';
  }
}

// Export a singleton instance
export const hcsService = new HcsService();