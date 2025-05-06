"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupAgent = exports.getResponse = exports.sendMessage = exports.initializeAgent = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
// @ts-ignore
const standards_sdk_1 = require("@hashgraphonline/standards-sdk");
const hederaService_1 = require("../services/hederaService");
const storageService_1 = require("../services/storageService");
const registryService_1 = require("../services/registryService");
const monitorService_1 = require("../services/monitorService");
// Initialize logger
const logger = logger_1.Logger.getInstance({
    level: process.env.LOG_LEVEL || 'info',
    module: 'agentController',
});
/**
 * Initialize an agent for character interaction
 */
const initializeAgent = async (req, res) => {
    try {
        // Get account ID from header
        const accountId = req.headers['account-id'];
        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: 'Missing account-id header'
            });
        }
        // Get character ID from request body
        const { characterId } = req.body;
        if (!characterId) {
            return res.status(400).json({
                success: false,
                error: 'Missing characterId in request body'
            });
        }
        logger.info(`Initializing agent for character ${characterId} requested by account ${accountId}`);
        // Look up character data in the registry
        const characterData = await (0, registryService_1.getCharacterFromRegistry)(characterId);
        if (!characterData) {
            return res.status(404).json({
                success: false,
                error: `Character ${characterId} not found in registry`
            });
        }
        // Check if we already have an agent for this character
        let agentInfo = await (0, storageService_1.getAgentInfoForCharacter)(characterId);
        // If no existing agent, create one
        if (!agentInfo) {
            logger.info(`Creating new agent for character ${characterId}`);
            // Get HCS10 client
            const client = await (0, hederaService_1.getHederaClient)();
            // Create a fee configuration for the inbound topic
            const feeAmount = (0, hederaService_1.getDefaultFeeAmount)();
            const feeCollectorId = client.getClient().operatorAccountId?.toString();
            if (!feeCollectorId) {
                throw new Error('No operator account ID available for fee collection');
            }
            const feeConfig = standards_sdk_1.FeeConfigBuilder.forHbar(feeAmount, feeCollectorId)
                .addExemptAccount(feeCollectorId)
                .build();
            // Build the agent with character data
            const agentBuilder = new standards_sdk_1.AgentBuilder()
                .setName(characterData.name)
                .setDescription(characterData.description || `Character agent for ${characterData.name}`)
                .setAgentType("manual")
                .setNetwork("testnet")
                .setInboundTopicType(standards_sdk_1.InboundTopicType.FEE_BASED) // Make it fee-based
                .setFeeConfig(feeConfig) // Apply the fee configuration
                .setMetadata({
                characterId: characterId,
                traits: characterData.traits || {},
            });
            // Create and register the agent
            const result = await client.createAndRegisterAgent(agentBuilder);
            if (!result.success) {
                throw new Error(`Failed to create agent: ${result.error}`);
            }
            // Store agent info
            agentInfo = {
                accountId: result.metadata.accountId,
                privateKey: result.metadata.privateKey,
                inboundTopicId: result.metadata.inboundTopicId,
                outboundTopicId: result.metadata.outboundTopicId,
                profileTopicId: result.metadata.profileTopicId
            };
            await (0, storageService_1.storeAgentInfoForCharacter)(characterId, agentInfo);
            logger.info(`Created new agent ${agentInfo.accountId} for character ${characterId}`);
        }
        else {
            logger.info(`Using existing agent ${agentInfo.accountId} for character ${characterId}`);
        }
        // Check if we already have a connection for this user-character pair
        let connectionTopicId = await (0, storageService_1.getConnectionTopicId)(accountId, characterId);
        // If no existing connection, create one
        if (!connectionTopicId) {
            logger.info(`Creating new connection for user ${accountId} and character ${characterId}`);
            // Create a client with the agent's credentials
            const agentClient = await (0, hederaService_1.createCustomClient)(agentInfo.accountId, agentInfo.privateKey);
            // Submit a connection request to the agent's inbound topic
            const connectionRequest = await agentClient.submitConnectionRequest(agentInfo.inboundTopicId, `Connection request from user ${accountId} for character ${characterId}`);
            // Get connection request ID
            const requestId = connectionRequest.topicSequenceNumber.toNumber();
            // Wait for connection confirmation
            const confirmation = await agentClient.waitForConnectionConfirmation(agentInfo.inboundTopicId, requestId, 60 // Maximum wait time (seconds)
            );
            // Store the connection topic ID
            connectionTopicId = confirmation.connectionTopicId;
            // Fix the connection handling to avoid null errors
            if (!connectionTopicId) {
                logger.error('Connection topic ID is null after creation');
                return res.status(500).json({
                    success: false,
                    error: 'Failed to create connection topic'
                });
            }
            // Now connectionTopicId is guaranteed to be non-null
            await (0, storageService_1.storeConnectionTopicId)(accountId, characterId, connectionTopicId);
            await (0, monitorService_1.startMonitoringConnectionTopic)(connectionTopicId, characterId);
            logger.info(`Created new connection topic ${connectionTopicId}`);
        }
        else {
            logger.info(`Using existing connection ${connectionTopicId} for user ${accountId} and character ${characterId}`);
        }
        // Return success response with connection details
        res.json({
            success: true,
            characterId,
            inboundTopicId: agentInfo.inboundTopicId,
            outboundTopicId: agentInfo.outboundTopicId,
            connectionTopicId,
        });
    }
    catch (error) {
        logger.error(`Error initializing agent: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};
exports.initializeAgent = initializeAgent;
/**
 * Send a message to an agent
 */
const sendMessage = async (req, res) => {
    try {
        // Get account ID from header
        const accountId = req.headers['account-id'];
        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: 'Missing account-id header'
            });
        }
        // Get message details from request body
        const { characterId, message } = req.body;
        if (!characterId) {
            return res.status(400).json({
                success: false,
                error: 'Missing characterId in request body'
            });
        }
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Missing message in request body'
            });
        }
        logger.info(`Sending message to character ${characterId} from user ${accountId}`);
        // Get connection topic ID
        const connectionTopicId = await (0, storageService_1.getConnectionTopicId)(accountId, characterId);
        if (!connectionTopicId) {
            return res.status(404).json({
                success: false,
                error: 'No connection found. Please initialize the agent first.'
            });
        }
        // Get agent information
        const agentInfo = await (0, storageService_1.getAgentInfoForCharacter)(characterId);
        if (!agentInfo) {
            return res.status(404).json({
                success: false,
                error: 'Agent information not found'
            });
        }
        // Create client with agent credentials
        const client = await (0, hederaService_1.createCustomClient)(agentInfo.accountId, agentInfo.privateKey);
        // Generate message and response IDs
        const messageId = (0, uuid_1.v4)();
        const responseId = (0, uuid_1.v4)();
        // Prepare message payload
        const payload = {
            id: messageId,
            prompt: message,
            response_id: responseId,
            timestamp: Date.now()
        };
        // Send message to connection topic
        const result = await client.sendMessage(connectionTopicId, JSON.stringify(payload), 'User message');
        // Store message information for later retrieval
        await (0, storageService_1.storeMessageInfo)(messageId, {
            userId: accountId,
            characterId,
            responseId,
            timestamp: Date.now()
        });
        // Return success response
        res.json({
            success: true,
            messageId,
            responseId,
            sequenceNumber: result.topicSequenceNumber.toNumber()
        });
    }
    catch (error) {
        logger.error(`Error sending message: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};
exports.sendMessage = sendMessage;
/**
 * Get a response from an agent
 */
const getResponse = async (req, res) => {
    try {
        // Get account ID from header
        const accountId = req.headers['account-id'];
        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: 'Missing account-id header'
            });
        }
        // Get message ID from URL parameter
        const messageId = req.params.messageId;
        if (!messageId) {
            return res.status(400).json({
                success: false,
                error: 'Missing messageId parameter'
            });
        }
        logger.info(`Getting response for message ${messageId} requested by user ${accountId}`);
        // Get message information
        const messageInfo = await (0, storageService_1.getMessageInfo)(messageId);
        if (!messageInfo) {
            return res.status(404).json({
                success: false,
                error: 'Message not found'
            });
        }
        // Verify that the message belongs to this user
        if (messageInfo.userId !== accountId) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized access to message'
            });
        }
        // Get connection topic ID
        const connectionTopicId = await (0, storageService_1.getConnectionTopicId)(accountId, messageInfo.characterId);
        if (!connectionTopicId) {
            return res.status(404).json({
                success: false,
                error: 'Connection not found'
            });
        }
        // Get agent information
        const agentInfo = await (0, storageService_1.getAgentInfoForCharacter)(messageInfo.characterId);
        if (!agentInfo) {
            return res.status(404).json({
                success: false,
                error: 'Agent information not found'
            });
        }
        // Create client with agent credentials
        const client = await (0, hederaService_1.createCustomClient)(agentInfo.accountId, agentInfo.privateKey);
        // Get messages from the connection topic
        const { messages } = await client.getMessages(connectionTopicId);
        // Find the response message with matching response ID
        const responseMessage = messages.find((msg) => {
            try {
                const content = JSON.parse(msg.data);
                return content.id === messageInfo.responseId && content.prompt_id === messageId;
            }
            catch (e) {
                return false;
            }
        });
        if (responseMessage) {
            const content = JSON.parse(responseMessage.data);
            res.json({
                success: true,
                response: content.response,
                timestamp: content.timestamp
            });
        }
        else {
            res.json({
                success: false,
                error: 'Response not ready yet',
                status: 'processing'
            });
        }
    }
    catch (error) {
        logger.error(`Error getting response: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};
exports.getResponse = getResponse;
/**
 * Cleanup an agent connection
 */
const cleanupAgent = async (req, res) => {
    try {
        // Get account ID from header
        const accountId = req.headers['account-id'];
        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: 'Missing account-id header'
            });
        }
        // Get character ID from request body
        const { characterId } = req.body;
        if (!characterId) {
            return res.status(400).json({
                success: false,
                error: 'Missing characterId in request body'
            });
        }
        logger.info(`Cleaning up connection for character ${characterId} and user ${accountId}`);
        // Get connection topic ID
        const connectionTopicId = await (0, storageService_1.getConnectionTopicId)(accountId, characterId);
        if (!connectionTopicId) {
            return res.status(404).json({
                success: false,
                error: 'No connection found to clean up'
            });
        }
        // Get agent information
        const agentInfo = await (0, storageService_1.getAgentInfoForCharacter)(characterId);
        if (!agentInfo) {
            return res.status(404).json({
                success: false,
                error: 'Agent information not found'
            });
        }
        // Create client with agent credentials
        const client = await (0, hederaService_1.createCustomClient)(agentInfo.accountId, agentInfo.privateKey);
        // Send a connection close message
        await client.sendMessage(connectionTopicId, JSON.stringify({
            type: 'close_connection',
            reason: 'User requested connection close',
            timestamp: Date.now()
        }), "Connection close");
        // Stop monitoring this connection
        (0, monitorService_1.stopMonitoringConnectionTopic)(connectionTopicId);
        // Remove connection data
        await (0, storageService_1.removeConnectionData)(accountId, characterId);
        res.json({
            success: true,
            message: 'Connection closed successfully'
        });
    }
    catch (error) {
        logger.error(`Error cleaning up agent: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};
exports.cleanupAgent = cleanupAgent;
