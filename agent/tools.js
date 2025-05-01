/**
 * Tool class for implementing MCP-compatible tools
 */
const axios = require('axios');
const uuid = require('uuid');

class Tool {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }

  async _call(input, config) {
    throw new Error("Not implemented");
  }
  
  async call(input, config = {}) {
    console.log(`Tool ${this.name} called with:`, input);
    return this._call(input, config);
  }
}

/**
 * Simple addition tool for demonstration
 */
class AdditionTool extends Tool {
  constructor(hederaKit) {
    super("addition", 
      `Simple addition calculator tool.
Inputs (input is a JSON string):
a: number, first number to add,
b: number, second number to add
Example usage:
'{"a": 5, "b": 3}'`);
      
    this.hederaKit = hederaKit;
  }
  
  async _call(input, config) {
    try {
      console.log(`AdditionTool called with input:`, input);
      
      // Parse the input
      const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      
      // Validate input parameters
      if (typeof parsedInput.a !== 'number' || typeof parsedInput.b !== 'number') {
        console.error("AdditionTool: Invalid parameters - both must be numbers");
        return JSON.stringify({
          status: "error",
          message: "Both parameters must be numbers",
          code: "INVALID_PARAMS"
        });
      }
      
      // Execute the addition via HederaAgentKit
      console.log(`AdditionTool: Adding ${parsedInput.a} + ${parsedInput.b}`);
      const result = this.hederaKit.add(parsedInput.a, parsedInput.b);
      
      // Return result as a JSON string
      console.log(`AdditionTool result:`, result);
      return JSON.stringify(result);
    } catch (error) {
      console.error("AdditionTool error:", error);
      return JSON.stringify({
        status: "error",
        message: error.message,
        code: error.code || "UNKNOWN_ERROR"
      });
    }
  }
}

/**
 * Character creation tool
 */
class CreateCharacterTool extends Tool {
  constructor(hederaKit) {
    super("create_character", 
      `Create a character and submit it to the character topic.
Inputs (input is a JSON string):
name: string, the character's name,
description: string, physical appearance description,
personality: string, the character's personality traits,
scenario: string, background setting/scenario for the character,
first_mes: string, the first message the character should say,
mes_example: string, example messages from this character,
creator_notes: string, notes from the creator,
system_prompt: string, system instructions for the character
Example usage:
'{"name": "Alice", "description": "A tall woman with blue eyes", "personality": "Friendly and outgoing", "scenario": "In a coffee shop", "first_mes": "Hello, nice to meet you!", "mes_example": "How are you today?", "creator_notes": "Speaks formally", "system_prompt": "You are Alice, a friendly barista."}'`);
      
    this.hederaKit = hederaKit;
    console.log("CreateCharacterTool initialized");
  }
  
  async _call(input, config) {
    try {
      console.log(`CreateCharacterTool called with input:`, input);
      
      const isCustodial = config?.configurable?.isCustodial === true;
      console.log(`CreateCharacterTool: custodial mode: ${isCustodial}`);
      
      // Parse input
      const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      console.log("CreateCharacterTool: parsed input:", parsedInput);
      
      // Validate required parameters
      const requiredFields = ['name', 'description', 'personality', 'scenario', 
                            'first_mes', 'mes_example', 'creator_notes', 'system_prompt'];
      
      const missingFields = requiredFields.filter(field => !parsedInput[field]);
      if (missingFields.length > 0) {
        console.error(`CreateCharacterTool: Missing fields: ${missingFields.join(', ')}`);
        return JSON.stringify({
          status: "error",
          message: `Missing required character fields: ${missingFields.join(', ')}`,
          code: "MISSING_PARAMETER"
        });
      }
      
      // Create a simple fake success response for testing connection issues
      if (process.env.BYPASS_HEDERA === 'true') {
        console.log("BYPASS_HEDERA is set to true, returning fake success response");
        return JSON.stringify({
          status: "success",
          message: "Character created successfully (BYPASS MODE)",
          characterId: "char_" + Date.now(),
          name: parsedInput.name
        });
      }
      
      // Standardize input format to match character schema
      const characterData = {
        name: parsedInput.name,
        description: parsedInput.description,
        personality: parsedInput.personality,
        scenario: parsedInput.scenario,
        first_mes: parsedInput.first_mes,
        mes_example: parsedInput.mes_example,
        creator_notes: parsedInput.creator_notes,
        system_prompt: parsedInput.system_prompt
      };
      
      console.log("CreateCharacterTool: Preparing to send character data to topic:", characterData);
      
      try {
        // Execute character creation and submission to topic
        console.log(`CreateCharacterTool: Sending to topic 0.0.5882994`);
        const response = await this.hederaKit.createCharacter(
          characterData, 
          "0.0.5882994", // hardcoded topic ID as specified
          isCustodial
        );
        
        console.log("CreateCharacterTool: Response received:", response);
        return response.getStringifiedResponse();
      } catch (hederaError) {
        console.error("CreateCharacterTool: Hedera transaction error:", hederaError);
        
        // Provide a more user-friendly error
        if (hederaError.message && hederaError.message.includes("INVALID_SIGNATURE")) {
          return JSON.stringify({
            status: "error",
            message: "Failed to create character due to authentication issues with Hedera. The account may not have permission to submit messages to this topic.",
            code: "INVALID_SIGNATURE",
            characterName: parsedInput.name, // Include the name for reference
            details: hederaError.message
          });
        }
        
        // Return general error
        return JSON.stringify({
          status: "error",
          message: `Failed to create character "${parsedInput.name}": ${hederaError.message}`,
          code: hederaError.code || "HEDERA_ERROR"
        });
      }
    } catch (error) {
      console.error("CreateCharacterTool error:", error);
      return JSON.stringify({
        status: "error",
        message: error.message,
        code: error.code || "UNKNOWN_ERROR"
      });
    }
  }
}

/**
 * Character search tool
 */
class FindCharacterTool extends Tool {
  constructor(hederaKit) {
    super("find_character", 
      `Find character information from the topic.
Inputs (input is a JSON string):
search_term: string, the term to search for (character name, type, etc.)
Example usage:
'{"search_term": "pirate"}'`);
      
    this.hederaKit = hederaKit;
    this.apiUrl = 'https://getmessages.onrender.com/get-complete-characters';
    console.log("FindCharacterTool initialized with dynamic API endpoint");
  }
  
  async _call(input, config) {
    try {
      console.log(`FindCharacterTool called with input:`, input);
      
      // Parse input
      const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      console.log("FindCharacterTool: parsed input:", parsedInput);
      
      const searchTerm = parsedInput.search_term || "";
      console.log(`FindCharacterTool: Searching for "${searchTerm}" via API`);
      
      // Fetch characters from the API
      console.log(`Fetching characters from ${this.apiUrl}`);
      const response = await axios.get(this.apiUrl);
      
      if (!response.data || !response.data.characters || !Array.isArray(response.data.characters)) {
        console.error("FindCharacterTool: Invalid API response format");
        throw new Error("Invalid API response format");
      }
      
      const allCharacters = response.data.characters;
      console.log(`FindCharacterTool: Retrieved ${allCharacters.length} characters from API`);
      
      // Filter characters based on search term if provided
      let characters;
      if (searchTerm && searchTerm.trim() !== "") {
        const searchTermLower = searchTerm.toLowerCase();
        characters = allCharacters.filter(char => {
          // Search in name, description, and personality
          return (
            char.name?.toLowerCase().includes(searchTermLower) ||
            char.description?.toLowerCase().includes(searchTermLower) ||
            char.personality?.toLowerCase().includes(searchTermLower)
          );
        });
        console.log(`FindCharacterTool: Found ${characters.length} characters matching "${searchTerm}"`);
      } else {
        characters = allCharacters;
        console.log(`FindCharacterTool: Returning all ${characters.length} characters (no search term provided)`);
      }
      
      return JSON.stringify({
        status: "success",
        message: `Found ${characters.length} characters${searchTerm ? ` matching "${searchTerm}"` : ""}`,
        matches: characters.length,
        characters: characters,
        searchTerm: searchTerm
      });
    } catch (error) {
      console.error("FindCharacterTool error:", error);
      return JSON.stringify({
        status: "error",
        message: error.message,
        code: error.code || "UNKNOWN_ERROR"
      });
    }
  }
}

/**
 * Tool to list all characters from the topic
 */
class ListAllCharactersTool extends Tool {
  constructor(hederaKit) {
    super("list_all_characters", 
      `List all characters from the topic without filtering.
This tool returns all character information from the topic.
No input parameters required.
Example usage:
'{}'`);
      
    this.hederaKit = hederaKit;
    this.apiUrl = 'https://getmessages.onrender.com/get-complete-characters';
    console.log("ListAllCharactersTool initialized with dynamic API endpoint");
  }
  
  async _call(input, config) {
    try {
      console.log(`ListAllCharactersTool called`);
      
      // Create a fake response for testing when bypass is enabled
      if (process.env.BYPASS_HEDERA === 'true') {
        console.log("ListAllCharactersTool: BYPASS_HEDERA is true, returning API fallback data");
        
        const characters = [
          {
            name: "Captain Blackbeard",
            description: "A rugged pirate with a large beard and a patch over one eye.",
            personality: "Bold",
            scenario: "Commanding his ship on the high seas.",
            first_mes: "Arrr mateys! Ye be in the presence of Captain Blackbeard!",
            mes_example: "Hoist the sails and prepare for plunder",
            creator_notes: "Known for his intimidating presence and strategic mind.",
            system_prompt: "You are Captain Blackbeard"
          },
          // ... previous fallback characters ...
        ];
        
        return JSON.stringify({
          status: "success",
          message: `Found ${characters.length} characters (BYPASS mode)`,
          characters: characters
        });
      }
      
      // Fetch characters from the API
      console.log(`Fetching characters from ${this.apiUrl}`);
      const response = await axios.get(this.apiUrl);
      
      if (!response.data || !response.data.characters || !Array.isArray(response.data.characters)) {
        console.error("ListAllCharactersTool: Invalid API response format");
        throw new Error("Invalid API response format");
      }
      
      const characters = response.data.characters;
      console.log(`ListAllCharactersTool: Retrieved ${characters.length} characters from API`);
      
      return JSON.stringify({
        status: "success",
        message: `Found ${characters.length} characters`,
        characters: characters,
        topicId: response.data.topicId
      });
    } catch (error) {
      console.error("ListAllCharactersTool error:", error);
      return JSON.stringify({
        status: "error",
        message: error.message,
        code: error.code || "UNKNOWN_ERROR"
      });
    }
  }
}

/**
 * Class to store and manage dynamic values from requests
 */
class RequestValues {
  constructor() {
    this.secrets = null;
    this.secretsHash = null;
    this.avatarUrl = null;
    this.deviceAddress = null;
    this.perApiCallFee = null;
  }

  updateValues(secrets, secretsHash, avatarUrl, deviceAddress, perApiCallFee) {
    this.secrets = secrets;
    this.secretsHash = secretsHash;
    this.avatarUrl = avatarUrl;
    this.deviceAddress = deviceAddress || "0x7339b922a04ad2c0ddd9887e5f043a65759543b8"; // Default device address
    this.perApiCallFee = perApiCallFee || "1000000000000000"; // Default to 0.001 ETH in wei
    console.log('Updated request values:', {
      secrets: secrets ? '*** (hidden) ***' : null,
      secretsHash: secretsHash ? '*** (hidden) ***' : null,
      avatarUrl,
      deviceAddress: this.deviceAddress,
      perApiCallFee: this.perApiCallFee
    });
  }

  getValues() {
    return {
      secrets: this.secrets || "encrypted_secrets_here",
      secretsHash: this.secretsHash || "hash_of_encrypted_secrets",
      avatarUrl: this.avatarUrl || "https://amethyst-impossible-ptarmigan-368.mypinata.cloud/files/your_avatar_cid",
      deviceAddress: this.deviceAddress || "0x7339b922a04ad2c0ddd9887e5f043a65759543b8",
      perApiCallFee: this.perApiCallFee || "1000000000000000"
    };
  }
}

// Create a singleton instance
const requestValues = new RequestValues();

/**
 * Franky Agent creation tool
 */
class CreateFrankyAgentTool extends Tool {
  constructor(hederaKit) {
    super("create_franky_agent", 
      `Create a Franky agent by submitting character data to the Franky contract.
Inputs (input is a JSON string):
subdomain: string, the agent's subdomain name,
name: string, the character's name,
description: string, physical appearance description,
personality: string, the character's personality traits,
scenario: string, background setting/scenario for the character,
first_mes: string, the first message the character should say,
mes_example: string, example messages from this character,
creator_notes: string, notes from the creator,
system_prompt: string, system instructions for the character,
perApiCallFee: number, fee per API call in tinybars (REQUIRED),
isPublic: boolean, whether the agent is public or private (REQUIRED)
Example usage:
'{"subdomain": "agent-x", "name": "Agent X", "description": "A mysterious figure", "personality": "Cool and calm", "scenario": "On a mission", "first_mes": "Hello.", "mes_example": "I'm here for the mission.", "creator_notes": "Blend into any environment", "system_prompt": "You are Agent X.", "perApiCallFee": 100, "isPublic": false}'`);
      
    this.hederaKit = hederaKit;
    this.frankyContractId = process.env.FRANKY_CONTRACT_ID || "0.0.5918696"; // Default Franky contract ID
    console.log("CreateFrankyAgentTool initialized with contract ID:", this.frankyContractId);
  }
  
  // Generate a UUID
  generateUUID() {
    return uuid.v4();
  }
  
  // Create input and output topics for this agent
  async createAgentTopics(agentName) {
    try {
      console.log(`Creating input and output topics for agent "${agentName}"`);
      
      // Create input topic
      const inputTopicName = `${agentName} input topic`;
      const inputTopicResult = await this.hederaKit.createTopic(inputTopicName);
      const inputTopicId = inputTopicResult.topicId;
      console.log(`Created input topic: ${inputTopicId}`);
      
      // Create output topic
      const outputTopicName = `${agentName} output topic`;
      const outputTopicResult = await this.hederaKit.createTopic(outputTopicName);
      const outputTopicId = outputTopicResult.topicId;
      console.log(`Created output topic: ${outputTopicId}`);
      
      return {
        inputTopicId,
        outputTopicId
      };
    } catch (error) {
      console.error(`Error creating topics for agent: ${error.message}`);
      throw error;
    }
  }

  // Execute contract call to create agent on the blockchain
  async executeContractCall(subname, characterConfigUrl, cid, deviceAddress, perApiCallFee, isPublic) {
    try {
      const { 
        ContractId, 
        ContractExecuteTransaction,
        ContractFunctionParameters,
        Hbar
      } = require("@hashgraph/sdk");

      console.log("===== CONTRACT EXECUTION - STARTING =====");
      console.log("PREPARING CONTRACT CALL with parameters:");
      console.log({
        contractId: this.frankyContractId,
        subname,
        characterConfigUrl,
        cid,
        deviceAddress: deviceAddress.toLowerCase(),
        perApiCallFee,
        isPublic
      });

      // Create contract parameters
      const contractParams = new ContractFunctionParameters()
        .addString(subname)
        .addString(characterConfigUrl)
        .addString(cid)
        .addAddress(deviceAddress.toLowerCase()) 
        .addUint256(perApiCallFee)
        .addBool(isPublic);
      
      console.log("CONTRACT PARAMETERS CREATED");

      // Create the transaction
      const transaction = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(this.frankyContractId))
        .setFunction("createAgent", contractParams)
        .setGas(1_000_000)
        .setPayableAmount(new Hbar(1)); // Send 1 HBAR
      
      console.log("TRANSACTION PREPARED");
      
      // Sign and execute the transaction
      console.log("EXECUTING CONTRACT TRANSACTION...");
      const txResponse = await transaction.execute(this.hederaKit.client);
      console.log("CONTRACT TRANSACTION EXECUTED with ID:", txResponse.transactionId.toString());
      
      // Get the receipt
      console.log("WAITING FOR TRANSACTION RECEIPT...");
      const receipt = await txResponse.getReceipt(this.hederaKit.client);
      console.log("RECEIPT RECEIVED with status:", receipt.status.toString());
      
      console.log("===== CONTRACT EXECUTION - COMPLETED =====");
      
      return {
        status: receipt.status.toString(),
        transactionId: txResponse.transactionId.toString()
      };
    } catch (error) {
      console.error("===== CONTRACT EXECUTION - FAILED =====");
      console.error("Error executing contract:", error);
      throw error;
    }
  }
  
  async _call(input, config) {
    try {
      console.log(`CreateFrankyAgentTool called with input:`, input);
      
      // Parse input
      const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      console.log("CreateFrankyAgentTool: parsed input:", parsedInput);
      
      // Get dynamic values
      const { secrets, secretsHash, avatarUrl, deviceAddress, perApiCallFee } = requestValues.getValues();
      
      // Create the request body in the new format
      const requestBody = {
        json: {
          character: {
            name: parsedInput.name,
            description: parsedInput.description,
            personality: parsedInput.personality,
            scenario: parsedInput.scenario,
            first_mes: parsedInput.first_mes,
            mes_example: parsedInput.mes_example,
            creatorcomment: parsedInput.creator_notes,
            tags: [parsedInput.system_prompt],
            talkativeness: 0.7,
            fav: true
          },
          subname: parsedInput.subdomain,
          secrets,
          secretsHash,
          avatarUrl,
          deviceAddress,
          perApiCallFee
        }
      };

      // Log the raw request body
      console.log('Raw request body being sent to endpoint:');
      console.log(JSON.stringify(requestBody, null, 2));

      // Make the POST request to the new endpoint
      console.log("SENDING REQUEST TO PINATA API...");
      const response = await fetch('http://localhost:3000/api/pinata/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("PINATA API RESPONSE:", result);
      
      // Extract the CID from the URL
      // URL format: https://amethyst-impossible-ptarmigan-368.mypinata.cloud/files/bafkreics2qb6tzhneoeskujr7kx5swoa7yv46itvhefpm3bpqanzkrg7t4
      const characterConfigUrl = result.url;
      const cid = characterConfigUrl.split('/files/')[1];
      
      console.log("EXTRACTED CID:", cid);
      console.log("CHARACTER CONFIG URL:", characterConfigUrl);
      
      // Execute contract call to register the agent on blockchain
      console.log("INITIATING CONTRACT CALL...");
      const contractResult = await this.executeContractCall(
        parsedInput.subdomain,
        characterConfigUrl,
        cid,
        deviceAddress,
        perApiCallFee,
        parsedInput.isPublic
      );
      
      console.log("CONTRACT EXECUTION RESULT:", contractResult);
      
      return JSON.stringify({
        status: "success",
        message: `Agent "${parsedInput.name}" created successfully and registered on blockchain!`,
        data: {
          ...result,
          contract: contractResult
        }
      });

    } catch (error) {
      console.error("CreateFrankyAgentTool error:", error);
      return JSON.stringify({
        status: "error",
        message: error.message,
        code: error.code || "UNKNOWN_ERROR"
      });
    }
  }
  
  // Helper function to convert accountId to Solidity address
  accountIdToSolidityAddress(accountId) {
    const parts = accountId.split('.');
    if (parts.length !== 3) throw new Error("Invalid account ID format");
    
    const shard = BigInt(parts[0]);
    const realm = BigInt(parts[1]);
    const num = BigInt(parts[2]);
    
    const bytes = new Uint8Array(20);
    const view = new DataView(bytes.buffer);
    
    // First 4 bytes: shard and realm (big endian)
    view.setUint32(0, Number((shard << 32n) | realm));
    
    // Remaining bytes: account number (big endian)
    for (let i = 0; i < 8; i++) {
      bytes[12 + i] = Number((num >> BigInt(8 * (7 - i)))) & 0xff;
    }
    
    return '0x' + Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

/**
 * Create Hedera tools for the MCP server
 * @param {HederaAgentKit} hederaKit - HederaAgentKit instance
 * @returns {Tool[]} - Array of tools
 */
function createHederaTools(hederaKit) {
  console.log("Creating Hedera tools with kit:", hederaKit ? "HederaKit available" : "HederaKit missing");
  return [
    new AdditionTool(hederaKit),
    new CreateCharacterTool(hederaKit),
    new FindCharacterTool(hederaKit),
    new ListAllCharactersTool(hederaKit),
    new CreateFrankyAgentTool(hederaKit)
  ];
}

module.exports = {
  AdditionTool,
  CreateCharacterTool,
  FindCharacterTool,
  ListAllCharactersTool,
  CreateFrankyAgentTool,
  createHederaTools
}; 