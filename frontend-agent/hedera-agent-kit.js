const { Client, AccountId, PrivateKey, TopicCreateTransaction, TopicMessageSubmitTransaction, TopicId, TopicMessageQuery } = require('@hashgraph/sdk');
const uuid = require('uuid');

/**
 * Simplified HederaAgentKit class for Hedera operations
 */
class HederaAgentKit {
  /**
   * Create a new HederaAgentKit instance
   * @param {string} accountId - Hedera account ID
   * @param {string} privateKey - Hedera private key
   * @param {string} network - Hedera network (testnet, mainnet, previewnet)
   */
  constructor(accountId, privateKey, network = 'testnet') {
    this.accountId = accountId;
    this.privateKey = privateKey;
    this.network = network;
    
    // Initialize Hedera client - using direct method as in sendTopicMessage.js
    console.log(`Initializing client for account ${accountId} on ${network}`);
    
    // Create account and key objects
    this.accountIdObj = AccountId.fromString(this.accountId);
    this.privateKeyObj = PrivateKey.fromStringECDSA(this.privateKey);
    
    // Create client for testnet only for now
    this.client = Client.forTestnet();
    this.client.setOperator(this.accountIdObj, this.privateKeyObj);
    
    console.log(`HederaAgentKit initialized for ${accountId} on ${network}`);
  }
  
  /**
   * Initialize Hedera client - kept for reference, now using direct method above
   * @returns {Client} Hedera client
   */
  initializeClient() {
    let client;
    
    // Create client for the specified network
    switch (this.network) {
      case 'mainnet':
        client = Client.forMainnet();
        break;
      case 'previewnet':
        client = Client.forPreviewnet();
        break;
      default:
        client = Client.forTestnet();
    }
    
    // Set operator account and key
    const operatorId = AccountId.fromString(this.accountId);
    const operatorKey = PrivateKey.fromString(this.privateKey);
    client.setOperator(operatorId, operatorKey);
    
    return client;
  }
  
  /**
   * Simple addition operation (for demo purposes)
   * @param {number} a - First number
   * @param {number} b - Second number
   * @returns {Object} Addition result
   */
  add(a, b) {
    const result = a + b;
    return {
      status: "success",
      result: result,
      operation: "addition",
      inputs: { a, b }
    };
  }
  
  /**
   * Create a topic on Hedera
   * @param {string} name - Topic name
   * @param {boolean} isSubmitKey - Whether to set submit key
   * @param {boolean} isCustodial - Whether to use custodial mode
   * @returns {Object} Creation result
   */
  async createTopic(name, isSubmitKey = false, isCustodial = true) {
    try {
      console.log(`Creating topic "${name}"`);
      
      // Create the transaction
      const transaction = new TopicCreateTransaction()
        .setTopicMemo(name);
      
      // Set submit key if needed
      if (isSubmitKey) {
        transaction.setSubmitKey(PrivateKey.fromString(this.privateKey).publicKey);
      }
      
      // Execute the transaction
      const txResponse = await transaction.execute(this.client);
      
      // Get the receipt
      const receipt = await txResponse.getReceipt(this.client);
      
      // Get the topic ID
      const topicId = receipt.topicId.toString();
      
      console.log(`Topic created: ${topicId}`);
      
      return {
        status: "success",
        topicId: topicId,
        memo: name,
        getStringifiedResponse: function() {
          return JSON.stringify({
            status: "success",
            topicId: topicId,
            memo: name
          });
        }
      };
    } catch (error) {
      console.error("Error creating topic:", error);
      throw error;
    }
  }
  
  /**
   * Submit a message to a topic
   * @param {string} topicId - Topic ID
   * @param {string} message - Message content
   * @param {boolean} isCustodial - Whether to use custodial mode
   * @returns {Object} Submission result
   */
  async submitTopicMessage(topicId, message, isCustodial = true) {
    try {
      console.log(`Submitting message to topic ${topicId}`);
      
      // Create a TopicId from string
      const topicIdObj = TopicId.fromString(topicId);
      
      // Create the transaction using object notation like in sendTopicMessage.js
      const transaction = new TopicMessageSubmitTransaction({
        topicId: topicIdObj,
        message: message
      });
      
      // Execute the transaction
      const txResponse = await transaction.execute(this.client);
      
      // Get the receipt
      const receipt = await txResponse.getReceipt(this.client);
      
      // Get the transaction status
      const transactionStatus = receipt.status.toString();
      
      console.log(`Message submitted successfully!`);
      console.log(`Status: ${transactionStatus}`);
      console.log(`Transaction ID: ${txResponse.transactionId.toString()}`);
      
      return {
        status: "success",
        sequenceNumber: receipt.topicSequenceNumber?.toString() || "unknown",
        topicId: topicId,
        transactionId: txResponse.transactionId.toString(),
        getStringifiedResponse: function() {
          return JSON.stringify({
            status: "success",
            message: "Message submitted successfully",
            topicId: topicId,
            transactionId: this.transactionId
          });
        }
      };
    } catch (error) {
      console.error("Error submitting topic message:", error.message);
      throw error;
    }
  }
  
  /**
   * Create a new character and send to topic
   * @param {Object} characterData - Character data with name, description, etc.
   * @param {string} targetTopicId - Topic ID to send the message to
   * @param {boolean} isCustodial - Whether to use custodial mode
   * @returns {Object} Result object
   */
  async createCharacter(characterData, targetTopicId = "0.0.5882994", isCustodial = true) {
    try {
      console.log(`Creating character "${characterData.name}" and sending to topic ${targetTopicId}`);
      
      // Validate required fields
      const requiredFields = ['name', 'description', 'personality', 'scenario', 
                             'first_mes', 'mes_example', 'creator_notes', 'system_prompt'];
      
      const missingFields = requiredFields.filter(field => !characterData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required character fields: ${missingFields.join(', ')}`);
      }
      
      // Generate a UUID for the character
      const characterId = uuid.v4();
      
      // Add the UUID to the character data
      const characterDataWithId = {
        uuid: characterId,
        ...characterData
      };
      
      // Create input and output topics for this character
      console.log(`Creating input and output topics for character "${characterData.name}"`);
      
      try {
        // Create input topic
        const inputTopicName = `${characterData.name} input topic`;
        const inputTopicResult = await this.createTopic(inputTopicName);
        const inputTopicId = inputTopicResult.topicId;
        console.log(`Created input topic: ${inputTopicId}`);
        
        // Create output topic
        const outputTopicName = `${characterData.name} output topic`;
        const outputTopicResult = await this.createTopic(outputTopicName);
        const outputTopicId = outputTopicResult.topicId;
        console.log(`Created output topic: ${outputTopicId}`);
        
        // Add topic IDs to character data
        characterDataWithId.inputTopicId = inputTopicId;
        characterDataWithId.outputTopicId = outputTopicId;
        console.log(`Assigned topics - Input: ${inputTopicId}, Output: ${outputTopicId}`);
      } catch (topicError) {
        console.error(`Error creating topics for character: ${topicError.message}`);
        // Continue even if topic creation fails - don't stop character creation
      }
      
      // Create a message with character data
      const message = JSON.stringify(characterDataWithId, null, 2);
      
      // Submit the character data to the topic
      return await this.submitTopicMessage(targetTopicId, message, isCustodial);
    } catch (error) {
      console.error("Error creating character:", error);
      throw error;
    }
  }
  
  /**
   * Fetch messages from a topic
   * @param {string} topicId - Topic ID to fetch messages from
   * @returns {Promise<Array>} - Array of messages
   */
  async getTopicMessages(topicId = "0.0.5882994") {
    try {
      console.log(`Fetching messages from topic ${topicId}...`);
      
      // Create a TopicId object
      const topicIdObj = TopicId.fromString(topicId);
      
      // Array to store messages
      const messages = [];
      
      // Create a promise to wait for message collection
      return new Promise((resolve, reject) => {
        try {
          console.log('Setting up topic message query...');
          
          // Set a timeout to resolve after waiting for messages
          const timeout = setTimeout(() => {
            console.log(`Timeout reached, returning ${messages.length} messages`);
            resolve(messages);
          }, 15000); // 15 second timeout
          
          // Create the topic message query based on what worked in getTopicMessages.js
          const query = new TopicMessageQuery()
            .setTopicId(topicIdObj)
            .setStartTime(0); // Start from the beginning of the topic
          
          console.log('Subscribing to topic message query...');
          
          // Key insight from the logs: The subscription is firing events but treating them as errors
          // We need to handle the TopicMessage objects differently
          query.subscribe(
            this.client,
            (message) => {
              try {
                // This is a successful message callback, not an error
                const messageContent = Buffer.from(message.contents).toString();
                const consensusTimestamp = message.consensusTimestamp.toDate();
                const sequenceNumber = message.sequenceNumber.toString();
                
                console.log(`\nReceived message #${sequenceNumber}:`);
                console.log(`- Timestamp: ${consensusTimestamp.toISOString()}`);
                console.log(`- Content: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`);
                
                // Store the message
                messages.push({
                  content: messageContent,
                  sequenceNumber: sequenceNumber,
                  timestamp: consensusTimestamp.toISOString()
                });
              } catch (messageError) {
                console.error('Error processing message:', messageError);
              }
            },
            (error) => {
              // This is the actual error handler for the subscription
              console.error('Subscription error:', error);
            }
          );
          
          // Set up another timeout to resolve after collection period
          setTimeout(() => {
            try {
              console.log(`Collection period ended, returning ${messages.length} messages`);
              clearTimeout(timeout);
              resolve(messages);
            } catch (error) {
              console.error('Error ending collection:', error);
              resolve(messages); // Still return any messages we collected
            }
          }, 10000); // 10 seconds collection period
          
        } catch (error) {
          console.error(`Error setting up query: ${error.message}`);
          reject(error);
        }
      });
    } catch (error) {
      console.error("Error getting topic messages:", error.message);
      throw error;
    }
  }
  
  /**
   * Find character information in topic messages
   * @param {string} searchTerm - Term to search for (character name, type, etc.)
   * @param {string} topicId - Topic ID to search
   * @returns {Object} Search results
   */
  async findCharacter(searchTerm, topicId = "0.0.5882994") {
    try {
      console.log(`Searching for '${searchTerm}' in topic ${topicId}`);
      
      // Create a fake response for testing when bypass is enabled
      if (process.env.BYPASS_HEDERA === 'true') {
        console.log("BYPASS_HEDERA is set to true, returning fake character information");
        
        // Create a pirate character if searching for pirate
        if (searchTerm.toLowerCase().includes('pirate') || 
            searchTerm.toLowerCase().includes('blackbeard')) {
          return {
            status: "success",
            message: `Found character information for "Blackbeard"`,
            character: {
              name: "Blackbeard",
              description: "A fearsome pirate with a long black beard",
              personality: "Ruthless and intimidating, but fair to his crew",
              scenario: "Sailing the high seas on the Queen Anne's Revenge",
              first_mes: "Arr, who dares approach my ship?",
              mes_example: "Stand and deliver your valuables or walk the plank!",
              creator_notes: "Based on the historical Edward Teach",
              system_prompt: "You are Blackbeard, the most feared pirate of the Caribbean."
            },
            getStringifiedResponse: function() {
              return JSON.stringify({
                status: "success",
                message: this.message,
                character: this.character
              });
            }
          };
        }
        
        // Default fake character
        return {
          status: "success",
          message: `Found character information for "${searchTerm}"`,
          character: {
            name: searchTerm,
            description: "This is a simulated character description (BYPASS MODE)",
            personality: "Friendly and helpful",
            scenario: "In a virtual world",
            first_mes: "Hello there! Nice to meet you!",
            mes_example: "How can I assist you today?",
            creator_notes: "This is a test character",
            system_prompt: "You are a helpful assistant character"
          },
          getStringifiedResponse: function() {
            return JSON.stringify({
              status: "success",
              message: this.message,
              character: this.character
            });
          }
        };
      }
      
      try {
        // Get all messages from the topic
        console.log("Attempting to retrieve messages from topic...");
        const messages = await this.getTopicMessages(topicId);
        console.log(`Retrieved ${messages.length} messages from topic ${topicId}`);
        
        if (messages.length === 0) {
          return {
            status: "success",
            message: "No messages found in the topic",
            matches: 0,
            getStringifiedResponse: function() {
              return JSON.stringify({
                status: "success",
                message: this.message,
                matches: 0
              });
            }
          };
        }
        
        // Parse messages and look for character data matching the search term
        const matchingCharacters = [];
        
        for (const message of messages) {
          try {
            // Check if content exists and is a string
            if (!message.content || typeof message.content !== 'string') {
              console.log(`Skipping message with invalid content: ${JSON.stringify(message)}`);
              continue;
            }
            
            let content;
            
            // Try to parse message content as JSON
            try {
              content = JSON.parse(message.content);
            } catch (jsonError) {
              // Not valid JSON, check if it might be a character description in plain text
              const textContent = message.content;
              if (textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
                console.log(`Found text match in message: ${message.sequenceNumber}`);
                // Simple extraction of potential character info from text
                matchingCharacters.push({
                  character: {
                    name: "Unknown Character",
                    description: textContent.substring(0, 200) + "...",
                    note: "Text content matching search term"
                  },
                  sequenceNumber: message.sequenceNumber,
                  timestamp: message.timestamp,
                  rawContent: textContent
                });
              }
              continue;
            }
            
            // Check if this is a character data message
            if (content && typeof content === 'object' && content.name) {
              // Check if it matches the search term
              const searchLower = searchTerm.toLowerCase();
              const nameLower = (content.name || '').toLowerCase();
              const descLower = (content.description || '').toLowerCase();
              const personalityLower = (content.personality || '').toLowerCase();
              const scenarioLower = (content.scenario || '').toLowerCase();
              
              if (nameLower.includes(searchLower) || 
                  descLower.includes(searchLower) || 
                  personalityLower.includes(searchLower) ||
                  scenarioLower.includes(searchLower)) {
                
                console.log(`Found matching character: ${content.name}`);
                matchingCharacters.push({
                  character: content,
                  sequenceNumber: message.sequenceNumber,
                  timestamp: message.timestamp
                });
              }
            }
          } catch (parseError) {
            // Skip messages that can't be processed
            console.log(`Error processing message ${message.sequenceNumber}: ${parseError.message}`);
          }
        }
        
        if (matchingCharacters.length === 0) {
          return {
            status: "success",
            message: `No characters found matching "${searchTerm}"`,
            matches: 0,
            searchTerm: searchTerm,
            getStringifiedResponse: function() {
              return JSON.stringify({
                status: "success",
                message: this.message,
                matches: 0,
                searchTerm: this.searchTerm
              });
            }
          };
        }
        
        // Return the matching characters
        return {
          status: "success",
          message: `Found ${matchingCharacters.length} characters matching "${searchTerm}"`,
          matches: matchingCharacters.length,
          characters: matchingCharacters,
          searchTerm: searchTerm,
          getStringifiedResponse: function() {
            return JSON.stringify({
              status: "success",
              message: this.message,
              matches: this.matches,
              characters: this.characters,
              searchTerm: this.searchTerm
            });
          }
        };
      } catch (topicError) {
        console.error(`Error retrieving messages: ${topicError.message}`);
        throw new Error(`Failed to retrieve messages: ${topicError.message}`);
      }
      
    } catch (error) {
      console.error("Error finding character:", error.message);
      throw error;
    }
  }
}

module.exports = HederaAgentKit; 