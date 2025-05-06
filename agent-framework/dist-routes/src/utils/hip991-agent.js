"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeMCPState = initializeMCPState;
exports.createMonetizedTopic = createMonetizedTopic;
exports.createResponseTopic = createResponseTopic;
exports.initializeAgent = initializeAgent;
exports.destroyAgent = destroyAgent;
exports.sendUserMessage = sendUserMessage;
exports.getMessage = getMessage;
exports.getAgentByUserId = getAgentByUserId;
exports.hasActiveAgent = hasActiveAgent;
const sdk_1 = require("@hashgraph/sdk");
const uuid_1 = require("uuid");
const logger_1 = require("./logger");
const get_topic_messages_1 = require("../tools/queries/hcs/get_topic_messages");
const response_generator_1 = require("./response-generator");
// Global MCP state
let mcpState = {
    ollamaAvailable: false,
    activeCharacter: null
};
// Function to initialize MCP state
async function initializeMCPState(openAIClient, ollamaAvailable, character) {
    mcpState = {
        openAIClient,
        ollamaAvailable,
        activeCharacter: character
    };
}
// Helper function to create character prompt
function createCharacterPrompt(character, prompt) {
    return `You are roleplaying as ${character.name}. ${character.description}\n\nUser: ${prompt}`;
}
// Wrapper for queryOllama to use our fallback model and limit response length
async function queryOllamaWithFallback(prompt, character) {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    const modelToUse = process.env.OLLAMA_FALLBACK_MODEL || process.env.OLLAMA_MODEL || 'qwen2.5:3b';
    logger_1.logger.info('API', `Using Ollama model: ${modelToUse}`);
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
            logger_1.logger.error('API', `HTTP error ${response.status}`, {
                errorText,
                status: response.status
            });
            throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        let ollamaResponse = data.response;
        if (ollamaResponse.length > 512) {
            logger_1.logger.info('API', `Limiting Ollama response from ${ollamaResponse.length} to 512 characters`);
            ollamaResponse = ollamaResponse.substring(0, 509) + '...';
        }
        return ollamaResponse;
    }
    catch (error) {
        logger_1.logger.error('API', 'Error querying Ollama', error);
        throw error;
    }
}
// Function to detect if input requires blockchain tools
function enhancedToolDetection(userInput) {
    const blockchainKeywords = [
        'token', 'nft', 'transaction', 'transfer', 'balance', 'account',
        'smart contract', 'hedera', 'hbar', 'hash', 'block', 'wallet',
        'send', 'receive', 'crypto', 'blockchain', 'ledger', 'consensus',
        'node', 'network', 'fee', 'gas', 'mint', 'burn', 'deploy'
    ];
    const lowercaseInput = userInput.toLowerCase();
    return blockchainKeywords.some(keyword => lowercaseInput.includes(keyword.toLowerCase()));
}
// Keeps track of active agent instances
const activeAgents = new Map();
// Mapping of response IDs to promises that resolve when the response is received
const pendingResponses = new Map();
const MESSAGE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const messageCache = new Map();
// Clean up old messages from cache periodically
setInterval(() => {
    const now = Date.now();
    let removedCount = 0;
    for (const [id, entry] of messageCache.entries()) {
        if (now - entry.timestamp > MESSAGE_CACHE_TTL) {
            messageCache.delete(id);
            removedCount++;
        }
    }
    if (removedCount > 0) {
        logger_1.logger.debug('HIP991', `Garbage collected ${removedCount} expired messages from cache`);
    }
}, 60 * 60 * 1000); // Run every hour
// Keep track of last processed message ID per topic
const lastProcessedMessageIds = new Map();
// Helper functions for working with the message cache
function getMessageFromCache(id) {
    const entry = messageCache.get(id);
    return entry ? entry.value : undefined;
}
function setMessageInCache(id, message) {
    messageCache.set(id, { value: message, timestamp: Date.now() });
}
function hasMessageInCache(id) {
    return messageCache.has(id);
}
/**
 * Creates a monetized HIP-991 topic for the user to post messages
 * The agent will receive fees when the user posts to this topic
 */
async function createMonetizedTopic(serverClient, serverAccountId, serverKey, userAccountId, userPublicKey, fee = 0.5, // Default to 0.5 HBAR if not specified
memo = "Agent Inbound Topic") {
    try {
        logger_1.logger.info('HIP991', `Creating monetized topic for user ${userAccountId.toString()}`);
        // Create a fixed fee with the specified HBAR amount
        const customFee = new sdk_1.CustomFixedFee()
            .setHbarAmount(new sdk_1.Hbar(fee))
            .setFeeCollectorAccountId(serverAccountId);
        logger_1.logger.debug('HIP991', `Custom fee created with ${fee} HBAR per message`);
        // Create a monetized topic following HIP-991
        const topicCreateTx = new sdk_1.TopicCreateTransaction()
            .setTopicMemo(memo)
            .setMaxTransactionFee(new sdk_1.Hbar(50))
            .setAdminKey(serverKey.publicKey)
            .setSubmitKey(userPublicKey) // Allow only this user to submit messages
            .setCustomFees([customFee])
            .setFeeScheduleKey(serverKey.publicKey);
        logger_1.logger.debug('HIP991', 'Topic transaction prepared, executing...');
        // Server creates the topic (server pays for topic creation)
        const submitTx = await topicCreateTx.execute(serverClient);
        logger_1.logger.debug('HIP991', 'Topic transaction submitted');
        // Get the receipt
        const receipt = await submitTx.getReceipt(serverClient);
        const topicId = receipt.topicId;
        logger_1.logger.info('HIP991', `Created monetized topic ${topicId} for user ${userAccountId.toString()}`);
        return topicId;
    }
    catch (error) {
        logger_1.logger.error('HIP991', 'Error creating monetized topic', error);
        throw error;
    }
}
/**
 * Creates a regular (non-monetized) topic for the agent to post responses
 */
async function createResponseTopic(serverClient, serverKey, userAccountId, memo = "Agent Outbound Topic") {
    try {
        logger_1.logger.info('HIP991', `Creating response topic for user ${userAccountId.toString()}`);
        // Create a topic with the server as the sole submitter
        const topicCreateTx = new sdk_1.TopicCreateTransaction()
            .setTopicMemo(memo)
            .setMaxTransactionFee(new sdk_1.Hbar(50))
            .setAdminKey(serverKey.publicKey)
            .setSubmitKey(serverKey.publicKey); // Only the server can post responses
        logger_1.logger.debug('HIP991', 'Response topic transaction prepared, executing...');
        // Server creates the topic
        const submitTx = await topicCreateTx.execute(serverClient);
        logger_1.logger.debug('HIP991', 'Response topic transaction submitted');
        // Get the receipt
        const receipt = await submitTx.getReceipt(serverClient);
        const topicId = receipt.topicId;
        logger_1.logger.info('HIP991', `Created response topic ${topicId} for user ${userAccountId.toString()}`);
        return topicId;
    }
    catch (error) {
        logger_1.logger.error('HIP991', 'Error creating response topic', error);
        throw error;
    }
}
/**
 * Set up polling for the inbound topic to receive user messages
 */
function setupTopicPolling(serverClient, serverKey, agent) {
    logger_1.logger.info('HIP991', `Setting up polling for inbound topic ${agent.inboundTopicId}`);
    // Track the last consensus timestamp we've processed
    let lastConsensusTimestamp = null;
    // Poll for new messages every 5 seconds
    setInterval(async () => {
        try {
            const topicId = sdk_1.TopicId.fromString(agent.inboundTopicId);
            // Use timestamp filtering to only fetch messages newer than the last one processed
            // This is more reliable than just checking message IDs
            const messages = await (0, get_topic_messages_1.get_topic_messages)(topicId, 'testnet', lastConsensusTimestamp ? parseFloat(lastConsensusTimestamp) : undefined);
            if (messages.length === 0) {
                return;
            }
            // Process messages in chronological order (oldest first)
            // This ensures messages are handled in the order they were sent
            for (let i = messages.length - 1; i >= 0; i--) {
                const message = messages[i];
                // Update our consensus timestamp tracker with the latest one
                if (!lastConsensusTimestamp || message.consensus_timestamp > lastConsensusTimestamp) {
                    lastConsensusTimestamp = message.consensus_timestamp;
                }
                // Convert message contents to string
                const messageContent = Buffer.from(message.message).toString();
                try {
                    const parsed = JSON.parse(messageContent);
                    // Check if this is a duplicate message (already processed)
                    if (hasMessageInCache(parsed.id)) {
                        // logger.debug('HIP991', `Skipping already processed message ${parsed.id}`);
                        continue;
                    }
                    logger_1.logger.info('HIP991', `Received new message from user ${agent.userId}`, { messageId: parsed.id });
                    // Process the message
                    await processUserMessage(serverClient, serverKey, agent, parsed);
                    // Update the last processed message ID
                    lastProcessedMessageIds.set(agent.inboundTopicId, parsed.id);
                }
                catch (parseError) {
                    logger_1.logger.error('HIP991', `Error parsing message: ${messageContent}`, parseError);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('HIP991', `Error polling inbound topic ${agent.inboundTopicId}`, error);
        }
    }, 5000); // Poll every 5 seconds
}
/**
 * Initialize a new agent instance for a user with a specific character
 */
async function initializeAgent(serverClient, serverAccountId, serverKey, userAccountId, userPublicKey, character, fee = 0.5 // Default to 0.5 HBAR if not specified
) {
    try {
        logger_1.logger.info('HIP991', `Initializing agent for user ${userAccountId.toString()} with character ${character.name}`);
        // Check if user already has an active agent
        const userId = userAccountId.toString();
        if (activeAgents.has(userId)) {
            logger_1.logger.info('HIP991', `User ${userId} already has an active agent, destroying previous instance`);
            await destroyAgent(serverClient, userId);
        }
        // Create inbound (monetized) topic for user messages
        const inboundTopicId = await createMonetizedTopic(serverClient, serverAccountId, serverKey, userAccountId, userPublicKey, fee, `${character.name} Inbound Topic for ${userId}`);
        // Create outbound (non-monetized) topic for agent responses
        const outboundTopicId = await createResponseTopic(serverClient, serverKey, userAccountId, `${character.name} Outbound Topic for ${userId}`);
        // Create agent instance
        const agent = {
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
        logger_1.logger.info('HIP991', 'Agent initialized successfully', {
            userId,
            character: character.name,
            inboundTopicId: inboundTopicId.toString(),
            outboundTopicId: outboundTopicId.toString()
        });
        return agent;
    }
    catch (error) {
        logger_1.logger.error('HIP991', 'Error initializing agent', error);
        throw error;
    }
}
/**
 * Process a user message and generate a response
 */
async function processUserMessage(serverClient, serverKey, agent, message) {
    try {
        if (!message.prompt || !message.response_id) {
            logger_1.logger.warn('HIP991', 'Invalid message format, missing prompt or response_id', { message });
            return;
        }
        // Check if this is a duplicate message (already processed)
        if (hasMessageInCache(message.id)) {
            logger_1.logger.warn('HIP991', `Duplicate message detected: ${message.id}, skipping processing`);
            return;
        }
        // Check if a response for this message has already been sent
        if (hasMessageInCache(message.response_id)) {
            logger_1.logger.warn('HIP991', `Response for message ${message.id} already exists, skipping processing`);
            return;
        }
        logger_1.logger.info('HIP991', `Processing user message: ${message.id}`, {
            prompt: message.prompt.substring(0, 50) + (message.prompt.length > 50 ? '...' : ''),
            responseId: message.response_id
        });
        // Update agent timestamp
        agent.lastMessageTimestamp = new Date();
        // Store message in cache BEFORE processing to prevent duplicate processing
        setMessageInCache(message.id, message);
        // Generate response using the character
        const response = await (0, response_generator_1.generateResponse)(message.prompt, agent.character);
        // Create response message
        const responseMessage = {
            id: message.response_id,
            response: response,
            prompt_id: message.id,
            timestamp: Date.now()
        };
        // Send the response to the outbound topic
        await sendAgentResponse(serverClient, serverKey, agent, responseMessage);
        // Store response in cache
        setMessageInCache(message.response_id, responseMessage);
        // If there's a pending promise for this response, resolve it
        const pending = pendingResponses.get(message.response_id);
        if (pending) {
            clearTimeout(pending.timeout);
            pending.resolve(response);
            pendingResponses.delete(message.response_id);
        }
        logger_1.logger.info('HIP991', `Successfully processed message ${message.id} with response ${message.response_id}`);
    }
    catch (error) {
        logger_1.logger.error('HIP991', `Error processing user message ${message.id}`, error);
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
async function sendAgentResponse(serverClient, serverKey, agent, message) {
    try {
        logger_1.logger.info('HIP991', `Sending agent response to topic ${agent.outboundTopicId}`, { messageId: message.id });
        // Prepare the message
        const messageJson = JSON.stringify(message);
        // Send the message to the outbound topic
        const messageTx = new sdk_1.TopicMessageSubmitTransaction()
            .setTopicId(agent.outboundTopicId)
            .setMessage(messageJson)
            .setMaxTransactionFee(new sdk_1.Hbar(1));
        // Execute the transaction
        const submitTx = await messageTx.execute(serverClient);
        const receipt = await submitTx.getReceipt(serverClient);
        logger_1.logger.info('HIP991', `Agent response sent successfully: ${receipt.status.toString()}`);
    }
    catch (error) {
        logger_1.logger.error('HIP991', 'Error sending agent response', error);
        throw error;
    }
}
/**
 * Destroy an agent instance and clean up resources
 */
async function destroyAgent(serverClient, userId) {
    try {
        logger_1.logger.info('HIP991', `Destroying agent for user ${userId}`);
        // Get the agent
        const agent = activeAgents.get(userId);
        if (!agent) {
            logger_1.logger.warn('HIP991', `No active agent found for user ${userId}`);
            return false;
        }
        // Mark as inactive
        agent.isActive = false;
        // Remove from active agents
        activeAgents.delete(userId);
        logger_1.logger.info('HIP991', `Agent for user ${userId} destroyed successfully`);
        return true;
    }
    catch (error) {
        logger_1.logger.error('HIP991', 'Error destroying agent', error);
        return false;
    }
}
/**
 * Send a message to an agent's inbound topic on behalf of a user
 */
async function sendUserMessage(userClient, agent, prompt, timeoutMs = 300000) {
    return new Promise(async (resolve, reject) => {
        try {
            logger_1.logger.info('HIP991', `Sending user message to topic ${agent.inboundTopicId}`);
            // Generate IDs for message and response
            const messageId = (0, uuid_1.v4)();
            const responseId = (0, uuid_1.v4)();
            // Create message
            const message = {
                id: messageId,
                prompt: prompt,
                response_id: responseId,
                timestamp: Date.now()
            };
            // Create a promise that will resolve when the response is received
            const responsePromise = new Promise((resolveResponse, rejectResponse) => {
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
            const messageTx = new sdk_1.TopicMessageSubmitTransaction()
                .setTopicId(agent.inboundTopicId)
                .setMessage(messageJson)
                .setMaxTransactionFee(new sdk_1.Hbar(50));
            // User pays for the message (including the HIP-991 fee)
            const submitTx = await messageTx.execute(userClient);
            const receipt = await submitTx.getReceipt(userClient);
            logger_1.logger.info('HIP991', `User message sent successfully: ${receipt.status.toString()}`);
            // Return the message details and the promise for the response
            resolve({
                messageId,
                responseId,
                responsePromise
            });
        }
        catch (error) {
            logger_1.logger.error('HIP991', 'Error sending user message', error);
            reject(error);
        }
    });
}
/**
 * Get a stored message by its ID
 */
function getMessage(messageId) {
    return getMessageFromCache(messageId);
}
/**
 * Get an active agent by user ID
 */
function getAgentByUserId(userId) {
    return activeAgents.get(userId);
}
/**
 * Check if a user has an active agent
 */
function hasActiveAgent(userId) {
    const agent = activeAgents.get(userId);
    return !!agent && agent.isActive;
}
