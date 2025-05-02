require('dotenv').config();

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
    this.apiUrl = `${process.env.API_BASE_URL}/api/db/agents`;
    console.log("FindCharacterTool initialized with dynamic API endpoint:", this.apiUrl);
  }
  
  async _call(input, config) {
    try {
      console.log("=== FindCharacterTool Execution Start ===");
      console.log("Input received:", JSON.stringify(input, null, 2));
      
      // Parse input
      const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      console.log("Parsed input:", JSON.stringify(parsedInput, null, 2));
      
      const searchTerm = parsedInput.search_term || "";
      console.log("Search term:", searchTerm);
      
      // Fetch characters from the API
      console.log("Making API request to:", this.apiUrl);
      const response = await axios.get(this.apiUrl);
      
      console.log("API Response Status:", response.status);
      console.log("API Response Headers:", response.headers);
      console.log("API Response Type:", typeof response.data);
      console.log("API Response Data:", JSON.stringify(response.data, null, 2));
      
      // Validate that response.data is an array
      if (!response.data) {
        console.error("API Response data is null or undefined");
        throw new Error("API Response data is missing");
      }
      
      if (!Array.isArray(response.data)) {
        console.error("API Response is not an array. Type:", typeof response.data);
        console.error("Response structure:", Object.keys(response.data));
        throw new Error(`Invalid API response format - expected array, got ${typeof response.data}`);
      }
      
      const allCharacters = response.data;
      console.log("Total characters retrieved:", allCharacters.length);
      
      if (allCharacters.length > 0) {
        console.log("Sample character structure:", Object.keys(allCharacters[0]));
      }
      
      // Filter characters based on search term if provided
      let characters;
      if (searchTerm && searchTerm.trim() !== "") {
        const searchTermLower = searchTerm.toLowerCase();
        characters = allCharacters.filter(char => {
          const matches = (
            char.name?.toLowerCase().includes(searchTermLower) ||
            char.description?.toLowerCase().includes(searchTermLower) ||
            char.personality?.toLowerCase().includes(searchTermLower)
          );
          console.log(`Character ${char.name}: ${matches ? 'matches' : 'does not match'} search term`);
          return matches;
        });
        console.log(`Filtered results: ${characters.length} matches found for "${searchTerm}"`);
      } else {
        characters = allCharacters;
        console.log("No search term provided, returning all characters");
      }
      
      const result = {
        status: "success",
        message: `Found ${characters.length} characters${searchTerm ? ` matching "${searchTerm}"` : ""}`,
        matches: characters.length,
        characters: characters,
        searchTerm: searchTerm
      };
      
      console.log("=== FindCharacterTool Execution Complete ===");
      console.log("Returning result with", characters.length, "characters");
      
      return JSON.stringify(result);
    } catch (error) {
      console.error("=== FindCharacterTool Error ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      if (error.response) {
        console.error("API Error Response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        });
      }
      return JSON.stringify({
        status: "error",
        message: error.message,
        code: error.code || "UNKNOWN_ERROR",
        details: error.response?.data || error.stack
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
    this.apiUrl = `${process.env.API_BASE_URL}/api/db/agents`;
    console.log("ListAllCharactersTool initialized with dynamic API endpoint:", this.apiUrl);
  }
  
  async _call(input, config) {
    try {
      console.log("=== ListAllCharactersTool Execution Start ===");
      
      // Create a fake response for testing when bypass is enabled
      if (process.env.BYPASS_HEDERA === 'true') {
        console.log("BYPASS_HEDERA mode active, returning test data");
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
          }
        ];
        
        return JSON.stringify({
          status: "success",
          message: `Found ${characters.length} characters (BYPASS mode)`,
          characters: characters
        });
      }
      
      // Fetch characters from the API
      console.log("Making API request to:", this.apiUrl);
      console.log("Request headers:", axios.defaults.headers);
      
      const response = await axios.get(this.apiUrl);
      
      console.log("API Response Status:", response.status);
      console.log("API Response Headers:", response.headers);
      console.log("API Response Type:", typeof response.data);
      console.log("Is Array?", Array.isArray(response.data));
      console.log("Raw Response Data:", JSON.stringify(response.data, null, 2));
      
      // Validate response
      if (!response.data) {
        console.error("API Response data is null or undefined");
        throw new Error("API Response data is missing");
      }
      
      if (!Array.isArray(response.data)) {
        console.error("API Response is not an array. Type:", typeof response.data);
        console.error("Response structure:", Object.keys(response.data));
        throw new Error(`Invalid API response format - expected array, got ${typeof response.data}`);
      }
      
      const characters = response.data;
      console.log("Total characters found:", characters.length);
      
      if (characters.length > 0) {
        console.log("First character structure:", Object.keys(characters[0]));
        console.log("Sample character data:", JSON.stringify(characters[0], null, 2));
      }
      
      const result = {
        status: "success",
        message: `Found ${characters.length} characters`,
        characters: characters
      };
      
      console.log("=== ListAllCharactersTool Execution Complete ===");
      console.log("Returning result with", characters.length, "characters");
      
      return JSON.stringify(result);
    } catch (error) {
      console.error("=== ListAllCharactersTool Error ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      if (error.response) {
        console.error("API Error Response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        });
      }
      return JSON.stringify({
        status: "error",
        message: error.message,
        code: error.code || "UNKNOWN_ERROR",
        details: error.response?.data || error.stack
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
    this.ownerAddress = null;
  }

  updateValues(secrets, secretsHash, avatarUrl, deviceAddress, perApiCallFee, ownerAddress) {
    this.secrets = secrets;
    this.secretsHash = secretsHash;
    this.avatarUrl = avatarUrl;
    this.deviceAddress = deviceAddress || "0x8f9506909b3b8cddb6891bc925099188f383a262"; // Default device address
    this.perApiCallFee = perApiCallFee || "1000000000000000"; // Default to 0.001 ETH in wei
    this.ownerAddress = ownerAddress || "0x0000000000000000000000000000000000000000"; // Default owner address
    console.log('Updated request values:', {
      secrets: secrets ? '*** (hidden) ***' : null,
      secretsHash: secretsHash ? '*** (hidden) ***' : null,
      avatarUrl,
      deviceAddress: this.deviceAddress,
      perApiCallFee: this.perApiCallFee,
      ownerAddress: this.ownerAddress
    });
  }

  getValues() {
    return {
      secrets: this.secrets || "encrypted_secrets_here",
      secretsHash: this.secretsHash || "hash_of_encrypted_secrets",
      avatarUrl: this.avatarUrl || "https://amethyst-impossible-ptarmigan-368.mypinata.cloud/files/your_avatar_cid",
      deviceAddress: this.deviceAddress || "0x8f9506909b3b8cddb6891bc925099188f383a262",
      perApiCallFee: this.perApiCallFee || "1000000000000000",
      ownerAddress: this.ownerAddress || "0x0000000000000000000000000000000000000000"
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
      
      // Get dynamic values including owner_address
      const { secrets, secretsHash, avatarUrl, deviceAddress, perApiCallFee, ownerAddress } = requestValues.getValues();
      
      // Log the request values for debugging
      console.log("===== REQUEST VALUES BEFORE API CALL =====");
      console.log("Full requestValues object:", JSON.stringify(requestValues, null, 2));
      console.log("secrets:", secrets ? "*** (hidden) ***" : null);
      console.log("secretsHash:", secretsHash ? "*** (hidden) ***" : null);
      console.log("avatarUrl:", avatarUrl);
      console.log("deviceAddress:", deviceAddress);
      console.log("perApiCallFee:", perApiCallFee);
      console.log("ownerAddress:", ownerAddress);
      console.log("===========================================");
      
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
          perApiCallFee,
          ownerAddress
        }
      };

      // Log the raw request body
      console.log('Raw request body being sent to endpoint:');
      console.log(JSON.stringify(requestBody, null, 2));

      // Make the POST request to the new endpoint
      console.log("SENDING REQUEST TO PINATA API...");
      const response = await fetch(`${process.env.API_BASE_URL}/api/pinata/json`, {
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

      // Create the agent database entry
      console.log("CREATING AGENT DATABASE ENTRY...");
      const dbRequestBody = {
        name: parsedInput.name,
        subname: parsedInput.subdomain,
        description: parsedInput.description,
        personality: parsedInput.personality,
        scenario: parsedInput.scenario,
        first_mes: parsedInput.first_mes,
        mes_example: parsedInput.mes_example,
        creator_comment: parsedInput.creator_notes,
        tags: [parsedInput.system_prompt],
        talkativeness: 0.7,
        is_favorite: true,
        device_address: deviceAddress,
        owner_address: ownerAddress,
        per_api_call_fee: perApiCallFee,
        is_public: parsedInput.isPublic,
        tools: ["balance", "gas", "price"],
        metadata_url: characterConfigUrl,
        tx_hash: contractResult.transactionId
      };

      console.log("===== DATABASE REQUEST DETAILS =====");
      console.log("DB Request Body:", JSON.stringify(dbRequestBody, null, 2));
      console.log("owner_address from requestValues:", ownerAddress);
      console.log("owner_address in DB request:", dbRequestBody.owner_address);
      console.log("===================================");

      const dbResponse = await fetch(`${process.env.API_BASE_URL}/api/db/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dbRequestBody)
      });

      if (!dbResponse.ok) {
        throw new Error(`Database error! status: ${dbResponse.status}`);
      }

      const dbResult = await dbResponse.json();
      console.log("DATABASE RESPONSE:", dbResult);
      
      return JSON.stringify({
        status: "success",
        message: `Agent "${parsedInput.name}" created successfully and registered on blockchain!`,
        data: {
          ...result,
          contract: contractResult,
          database: dbResult
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
  createHederaTools,
  requestValues
}; 