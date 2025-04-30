import {
  Client,
  PrivateKey,
  AccountId,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  Hbar,
  TransactionReceiptQuery,
  CustomFixedFee,
  TopicId
} from "@hashgraph/sdk";
import { Character } from "../types";
import { v4 as uuidv4 } from "uuid";
import { logger } from "./logger";
import { get_topic_messages } from "../tools/queries/hcs/get_topic_messages";
import { MCPOpenAIClient } from "./mcp-openai";
import { generateResponse } from "./response-generator";

// Interface for the agent instance
export interface HIP991Agent {
  userId: string;
  character: Character;
  inboundTopicId: string;
  outboundTopicId: string;
  isActive: boolean;
  lastMessageTimestamp: Date;
}

// Interface for message structure
export interface TopicMessage {
  id: string;
  prompt?: string;
  response?: string;
  prompt_id?: string;
  response_id?: string;
  timestamp: number;
}

// Interface for MCP state
interface MCPState {
  openAIClient?: MCPOpenAIClient;
  ollamaAvailable: boolean;
  activeCharacter?: Character | null;
}

// Global MCP state
let mcpState: MCPState = {
  ollamaAvailable: false,
  activeCharacter: null
};

// Function to initialize MCP state
export async function initializeMCPState(openAIClient: MCPOpenAIClient, ollamaAvailable: boolean, character: Character) {
  mcpState = {
    openAIClient,
    ollamaAvailable,
    activeCharacter: character
  };
}

// Helper function to create character prompt
function createCharacterPrompt(character: Character, prompt: string): string {
  return `You are roleplaying as ${character.name}. ${character.description}\n\nUser: ${prompt}`;
}

// Wrapper for queryOllama to use our fallback model and limit response length
async function queryOllamaWithFallback(prompt: string, character?: Character): Promise<string> {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const modelToUse = process.env.OLLAMA_FALLBACK_MODEL || process.env.OLLAMA_MODEL || 'qwen2.5:3b';
  
  logger.info('API', `Using Ollama model: ${modelToUse}`);
  
  const formattedPrompt = character 
    ? createCharacterPrompt(character, prompt)
    : prompt;
  
  try {
    const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelToUse,
        prompt: formattedPrompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('API', `HTTP error ${response.status}`, {
        errorText,
        status: response.status
      });
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as { response: string };
    let ollamaResponse = data.response;
    
    if (ollamaResponse.length > 512) {
      logger.info('API', `Limiting Ollama response from ${ollamaResponse.length} to 512 characters`);
      ollamaResponse = ollamaResponse.substring(0, 509) + '...';
    }
    
    return ollamaResponse;
  } catch (error) {
    logger.error('API', 'Error querying Ollama', error);
    throw error;
  }
}

// Function to detect if input requires blockchain tools
function enhancedToolDetection(userInput: string): boolean {
  const blockchainKeywords = [
    'token', 'nft', 'transaction', 'transfer', 'balance', 'account',
    'smart contract', 'hedera', 'hbar', 'hash', 'block', 'wallet',
    'send', 'receive', 'crypto', 'blockchain', 'ledger', 'consensus',
    'node', 'network', 'fee', 'gas', 'mint', 'burn', 'deploy'
  ];

  const lowercaseInput = userInput.toLowerCase();
  return blockchainKeywords.some(keyword => 
    lowercaseInput.includes(keyword.toLowerCase())
  );
}

// Keeps track of active agent instances
const activeAgents = new Map<string, HIP991Agent>();

// Mapping of response IDs to promises that resolve when the response is received
const pendingResponses = new Map<string, { 
  resolve: (value: string) => void, 
  reject: (reason: any) => void,
  timeout: NodeJS.Timeout
}>();

// Cache of message history
const messageCache = new Map<string, TopicMessage>();

// Keep track of last processed message ID per topic
const lastProcessedMessageIds = new Map<string, string>();

/**
 * Creates a monetized HIP-991 topic for the user to post messages
 * The agent will receive fees when the user posts to this topic
 */
export async function createMonetizedTopic(
  serverClient: Client, 
  serverAccountId: AccountId, 
  serverKey: PrivateKey,
  userAccountId: AccountId,
  userPublicKey: any,
  fee: number = 0.5, // Default to 0.5 HBAR if not specified
  memo: string = "Agent Inbound Topic"
): Promise<TopicId> {
  try {
    logger.info('HIP991', `Creating monetized topic for user ${userAccountId.toString()}`);
    
    // Create a fixed fee with the specified HBAR amount
    const customFee = new CustomFixedFee()
      .setHbarAmount(new Hbar(fee))
      .setFeeCollectorAccountId(serverAccountId);
    
    logger.debug('HIP991', `Custom fee created with ${fee} HBAR per message`);
      
    // Create a monetized topic following HIP-991
    const topicCreateTx = new TopicCreateTransaction()
      .setTopicMemo(memo)
      .setMaxTransactionFee(new Hbar(50))
      .setAdminKey(serverKey.publicKey)
      .setSubmitKey(userPublicKey) // Allow only this user to submit messages
      .setCustomFees([customFee])
      .setFeeScheduleKey(serverKey.publicKey);
    
    logger.debug('HIP991', 'Topic transaction prepared, executing...');
    
    // Server creates the topic (server pays for topic creation)
    const submitTx = await topicCreateTx.execute(serverClient);
    logger.debug('HIP991', 'Topic transaction submitted');
    
    // Get the receipt
    const receipt = await submitTx.getReceipt(serverClient);
    const topicId = receipt.topicId;
    
    logger.info('HIP991', `Created monetized topic ${topicId} for user ${userAccountId.toString()}`);
    return topicId;
  } catch (error) {
    logger.error('HIP991', 'Error creating monetized topic', error);
    throw error;
  }
}

/**
 * Creates a regular (non-monetized) topic for the agent to post responses
 */
export async function createResponseTopic(
  serverClient: Client, 
  serverKey: PrivateKey,
  userAccountId: AccountId,
  memo: string = "Agent Outbound Topic"
): Promise<TopicId> {
  try {
    logger.info('HIP991', `Creating response topic for user ${userAccountId.toString()}`);
    
    // Create a topic with the server as the sole submitter
    const topicCreateTx = new TopicCreateTransaction()
      .setTopicMemo(memo)
      .setMaxTransactionFee(new Hbar(50))
      .setAdminKey(serverKey.publicKey)
      .setSubmitKey(serverKey.publicKey); // Only the server can post responses
    
    logger.debug('HIP991', 'Response topic transaction prepared, executing...');
    
    // Server creates the topic
    const submitTx = await topicCreateTx.execute(serverClient);
    logger.debug('HIP991', 'Response topic transaction submitted');
    
    // Get the receipt
    const receipt = await submitTx.getReceipt(serverClient);
    const topicId = receipt.topicId;
    
    logger.info('HIP991', `Created response topic ${topicId} for user ${userAccountId.toString()}`);
    return topicId;
  } catch (error) {
    logger.error('HIP991', 'Error creating response topic', error);
    throw error;
  }
}

/**
 * Set up polling for the inbound topic to receive user messages
 */
function setupTopicPolling(
  serverClient: Client,
  serverKey: PrivateKey,
  agent: HIP991Agent
): void {
  logger.info('HIP991', `Setting up polling for inbound topic ${agent.inboundTopicId}`);
  
  // Poll for new messages every 5 seconds
  setInterval(async () => {
    try {
      const topicId = TopicId.fromString(agent.inboundTopicId);
      const messages = await get_topic_messages(topicId, 'testnet');
      
      if (messages.length === 0) {
        return;
      }

      // Get the most recent message
      const latestMessage = messages[0]; // Messages are returned in desc order
      
      // Convert message contents to string
      const messageContent = Buffer.from(latestMessage.message).toString();

      console.log(messageContent);
      const parsed = JSON.parse(messageContent) as TopicMessage;
      
      // Check if we've already processed this message
      const lastProcessedId = lastProcessedMessageIds.get(agent.inboundTopicId);
      if (lastProcessedId === parsed.id) {
        return;
      }
      
      logger.info('HIP991', `Received new message from user ${agent.userId}`, { messageId: parsed.id });
      
      // Process the message
      await processUserMessage(serverClient, serverKey, agent, parsed);
      
      // Update the last processed message ID
      lastProcessedMessageIds.set(agent.inboundTopicId, parsed.id);
      
    } catch (error) {
      logger.error('HIP991', `Error polling inbound topic ${agent.inboundTopicId}`, error);
    }
  }, 5000); // Poll every 5 seconds
}

/**
 * Initialize a new agent instance for a user with a specific character
 */
export async function initializeAgent(
  serverClient: Client,
  serverAccountId: AccountId,
  serverKey: PrivateKey,
  userAccountId: AccountId,
  userPublicKey: any,
  character: Character,
  fee: number = 0.5 // Default to 0.5 HBAR if not specified
): Promise<HIP991Agent> {
  try {
    logger.info('HIP991', `Initializing agent for user ${userAccountId.toString()} with character ${character.name}`);
    
    // Check if user already has an active agent
    const userId = userAccountId.toString();
    if (activeAgents.has(userId)) {
      logger.info('HIP991', `User ${userId} already has an active agent, destroying previous instance`);
      await destroyAgent(serverClient, userId);
    }
    
    // Create inbound (monetized) topic for user messages
    const inboundTopicId = await createMonetizedTopic(
      serverClient,
      serverAccountId,
      serverKey,
      userAccountId,
      userPublicKey,
      fee,
      `${character.name} Inbound Topic for ${userId}`
    );
    
    // Create outbound (non-monetized) topic for agent responses
    const outboundTopicId = await createResponseTopic(
      serverClient,
      serverKey,
      userAccountId,
      `${character.name} Outbound Topic for ${userId}`
    );
    
    // Create agent instance
    const agent: HIP991Agent = {
      userId,
      character,
      inboundTopicId: inboundTopicId.toString(),
      outboundTopicId: outboundTopicId.toString(),
      isActive: true,
      lastMessageTimestamp: new Date()
    };
    
    // Store agent instance
    activeAgents.set(userId, agent);
    
    // Set up topic polling instead of subscriptions
    setupTopicPolling(serverClient, serverKey, agent);
    
    logger.info('HIP991', 'Agent initialized successfully', {
      userId,
      character: character.name,
      inboundTopicId: inboundTopicId.toString(),
      outboundTopicId: outboundTopicId.toString()
    });
    
    return agent;
  } catch (error) {
    logger.error('HIP991', 'Error initializing agent', error);
    throw error;
  }
}

/**
 * Process a user message and generate a response
 */
async function processUserMessage(
  serverClient: Client,
  serverKey: PrivateKey,
  agent: HIP991Agent,
  message: TopicMessage
): Promise<void> {
  try {
    if (!message.prompt || !message.response_id) {
      logger.warn('HIP991', 'Invalid message format, missing prompt or response_id', { message });
      return;
    }
    
    logger.info('HIP991', `Processing user message: ${message.id}`, { 
      prompt: message.prompt.substring(0, 50) + (message.prompt.length > 50 ? '...' : ''),
      responseId: message.response_id
    });
    
    // Update agent timestamp
    agent.lastMessageTimestamp = new Date();
    
    // Store message in cache
    messageCache.set(message.id, message);
    
    // Generate response using the character
    const response = await generateResponse(message.prompt, agent.character);
    
    // Create response message
    const responseMessage: TopicMessage = {
      id: message.response_id,
      response: response,
      prompt_id: message.id,
      timestamp: Date.now()
    };
    
    // Send the response to the outbound topic
    await sendAgentResponse(serverClient, serverKey, agent, responseMessage);
    
    // Store response in cache
    messageCache.set(message.response_id, responseMessage);
    
    // If there's a pending promise for this response, resolve it
    const pending = pendingResponses.get(message.response_id);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(response);
      pendingResponses.delete(message.response_id);
    }
  } catch (error) {
    logger.error('HIP991', 'Error processing user message', error);
    
    // If there's a pending promise, reject it
    const pending = pendingResponses.get(message.response_id);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      pendingResponses.delete(message.response_id);
    }
  }
}

/**
 * Send an agent response to the outbound topic
 */
async function sendAgentResponse(
  serverClient: Client,
  serverKey: PrivateKey,
  agent: HIP991Agent,
  message: TopicMessage
): Promise<void> {
  try {
    logger.info('HIP991', `Sending agent response to topic ${agent.outboundTopicId}`, { messageId: message.id });
    
    // Prepare the message
    const messageJson = JSON.stringify(message);
    
    // Send the message to the outbound topic
    const messageTx = new TopicMessageSubmitTransaction()
      .setTopicId(agent.outboundTopicId)
      .setMessage(messageJson)
      .setMaxTransactionFee(new Hbar(1));
    
    // Execute the transaction
    const submitTx = await messageTx.execute(serverClient);
    const receipt = await submitTx.getReceipt(serverClient);
    
    logger.info('HIP991', `Agent response sent successfully: ${receipt.status.toString()}`);
  } catch (error) {
    logger.error('HIP991', 'Error sending agent response', error);
    throw error;
  }
}

/**
 * Destroy an agent instance and clean up resources
 */
export async function destroyAgent(
  serverClient: Client,
  userId: string
): Promise<boolean> {
  try {
    logger.info('HIP991', `Destroying agent for user ${userId}`);
    
    // Get the agent
    const agent = activeAgents.get(userId);
    if (!agent) {
      logger.warn('HIP991', `No active agent found for user ${userId}`);
      return false;
    }
    
    // Mark as inactive
    agent.isActive = false;
    
    // Remove from active agents
    activeAgents.delete(userId);
    
    logger.info('HIP991', `Agent for user ${userId} destroyed successfully`);
    return true;
  } catch (error) {
    logger.error('HIP991', 'Error destroying agent', error);
    return false;
  }
}

/**
 * Send a message to an agent's inbound topic on behalf of a user
 */
export async function sendUserMessage(
  userClient: Client,
  agent: HIP991Agent,
  prompt: string,
  timeoutMs: number = 300000
): Promise<{ messageId: string, responseId: string, responsePromise: Promise<string> }> {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('HIP991', `Sending user message to topic ${agent.inboundTopicId}`);
      
      // Generate IDs for message and response
      const messageId = uuidv4();
      const responseId = uuidv4();
      
      // Create message
      const message: TopicMessage = {
        id: messageId,
        prompt: prompt,
        response_id: responseId,
        timestamp: Date.now()
      };
      
      // Create a promise that will resolve when the response is received
      const responsePromise = new Promise<string>((resolveResponse, rejectResponse) => {
        // Set up timeout
        const timeout = setTimeout(() => {
          pendingResponses.delete(responseId);
          rejectResponse(new Error('Response timeout'));
        }, timeoutMs);
        
        // Store the promise resolve/reject functions
        pendingResponses.set(responseId, {
          resolve: resolveResponse,
          reject: rejectResponse,
          timeout
        });
      });
      
      // Send the message
      const messageJson = JSON.stringify(message);
      
      // Create and execute the transaction
      const messageTx = new TopicMessageSubmitTransaction()
        .setTopicId(agent.inboundTopicId)
        .setMessage(messageJson)
        .setMaxTransactionFee(new Hbar(50));
      
      // User pays for the message (including the HIP-991 fee)
      const submitTx = await messageTx.execute(userClient);
      const receipt = await submitTx.getReceipt(userClient);
      
      logger.info('HIP991', `User message sent successfully: ${receipt.status.toString()}`);
      
      // Return the message details and the promise for the response
      resolve({
        messageId,
        responseId,
        responsePromise
      });
    } catch (error) {
      logger.error('HIP991', 'Error sending user message', error);
      reject(error);
    }
  });
}

/**
 * Get a stored message by its ID
 */
export function getMessage(messageId: string): TopicMessage | undefined {
  return messageCache.get(messageId);
}

/**
 * Get an active agent by user ID
 */
export function getAgentByUserId(userId: string): HIP991Agent | undefined {
  return activeAgents.get(userId);
}

/**
 * Check if a user has an active agent
 */
export function hasActiveAgent(userId: string): boolean {
  const agent = activeAgents.get(userId);
  return !!agent && agent.isActive;
} 