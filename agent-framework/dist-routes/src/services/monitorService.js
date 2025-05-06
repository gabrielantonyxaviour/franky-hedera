"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopMonitoringConnectionTopic = exports.startMonitoringConnectionTopic = void 0;
const logger_1 = require("../utils/logger");
const hederaService_1 = require("./hederaService");
const storageService_1 = require("./storageService");
const registryService_1 = require("./registryService");
const aiService_1 = require("./aiService");
// Initialize logger
const logger = logger_1.Logger.getInstance({
    level: process.env.LOG_LEVEL || 'info',
    module: 'monitor',
});
// Map to store active monitors
const activeMonitors = new Map();
/**
 * Connection Monitor class to handle message processing
 */
class ConnectionMonitor {
    constructor(client, connectionTopicId, characterData) {
        this.client = client;
        this.connectionTopicId = connectionTopicId;
        this.characterData = characterData;
        this.lastProcessedSequence = 0;
        this.running = false;
        this.pollInterval = 3000; // 3 seconds
    }
    /**
     * Start monitoring for messages
     */
    start() {
        if (this.running)
            return;
        this.running = true;
        logger.info(`Starting monitor for connection ${this.connectionTopicId}`);
        // Begin polling
        this.poll();
    }
    /**
     * Stop monitoring
     */
    stop() {
        this.running = false;
        logger.info(`Stopped monitor for connection ${this.connectionTopicId}`);
    }
    /**
     * Poll for new messages
     */
    async poll() {
        if (!this.running)
            return;
        try {
            // Get messages from the connection topic
            const { messages } = await this.client.getMessages(this.connectionTopicId);
            // Filter for new messages
            const newMessages = messages
                .filter((msg) => msg.sequence_number > this.lastProcessedSequence)
                .sort((a, b) => a.sequence_number - b.sequence_number);
            // Process new messages
            for (const message of newMessages) {
                this.lastProcessedSequence = message.sequence_number;
                try {
                    // Parse the message content
                    const content = JSON.parse(message.data);
                    // Check if this is a user message requiring a response
                    if (content.prompt && content.id && content.response_id) {
                        logger.info(`Processing message ${content.id} from user`);
                        // Generate response using AI/LLM with character data
                        const response = await this.generateResponse(content.prompt);
                        // Send the response back to the same connection topic
                        const responsePayload = {
                            id: content.response_id,
                            response: response,
                            prompt_id: content.id,
                            timestamp: Date.now()
                        };
                        await this.client.sendMessage(this.connectionTopicId, JSON.stringify(responsePayload), "Character response");
                        logger.info(`Sent response for message ${content.id}`);
                    }
                }
                catch (error) {
                    logger.error(`Error processing message: ${error}`);
                }
            }
        }
        catch (error) {
            logger.error(`Error polling connection ${this.connectionTopicId}: ${error}`);
        }
        // Schedule next poll if still running
        if (this.running) {
            setTimeout(() => this.poll(), this.pollInterval);
        }
    }
    /**
     * Generate a character response to a user prompt
     */
    async generateResponse(prompt) {
        try {
            return await (0, aiService_1.generateCharacterResponse)(prompt, this.characterData);
        }
        catch (error) {
            logger.error(`Error generating character response: ${error}`);
            return "I'm sorry, I couldn't process your message right now.";
        }
    }
}
/**
 * Start monitoring a connection topic for user messages
 */
const startMonitoringConnectionTopic = async (connectionTopicId, characterId) => {
    try {
        // Check if we already have a monitor for this connection
        if (activeMonitors.has(connectionTopicId)) {
            logger.info(`Monitor already exists for connection ${connectionTopicId}`);
            return true;
        }
        // Get agent information for the character
        const agentInfo = await (0, storageService_1.getAgentInfoForCharacter)(characterId);
        if (!agentInfo) {
            logger.error(`No agent info found for character ${characterId}`);
            return false;
        }
        // Get character data from registry or storage
        const characterData = await (0, registryService_1.getCharacterFromRegistry)(characterId);
        if (!characterData) {
            logger.error(`No character data found for character ${characterId}`);
            return false;
        }
        // Create a client with the agent's credentials
        const client = await (0, hederaService_1.createCustomClient)(agentInfo.accountId, agentInfo.privateKey);
        // Create a new monitor
        const monitor = new ConnectionMonitor(client, connectionTopicId, characterData);
        // Start the monitor
        monitor.start();
        // Store the monitor reference
        activeMonitors.set(connectionTopicId, monitor);
        logger.info(`Started monitoring connection ${connectionTopicId} for character ${characterId}`);
        return true;
    }
    catch (error) {
        logger.error(`Failed to start monitoring connection: ${error}`);
        return false;
    }
};
exports.startMonitoringConnectionTopic = startMonitoringConnectionTopic;
/**
 * Stop monitoring a connection topic
 */
const stopMonitoringConnectionTopic = (connectionTopicId) => {
    try {
        // Check if we have a monitor for this connection
        const monitor = activeMonitors.get(connectionTopicId);
        if (!monitor) {
            logger.info(`No monitor found for connection ${connectionTopicId}`);
            return false;
        }
        // Stop the monitor
        monitor.stop();
        // Remove from active monitors
        activeMonitors.delete(connectionTopicId);
        logger.info(`Stopped monitoring connection ${connectionTopicId}`);
        return true;
    }
    catch (error) {
        logger.error(`Failed to stop monitoring connection: ${error}`);
        return false;
    }
};
exports.stopMonitoringConnectionTopic = stopMonitoringConnectionTopic;
