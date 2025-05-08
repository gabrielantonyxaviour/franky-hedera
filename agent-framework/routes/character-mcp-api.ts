import dotenv from 'dotenv';
import { OpenAI } from 'openai';
// @ts-ignore
import {
  HCS10Client,
  HCSMessage,
  Logger,
  ConnectionsManager,
  Connection,
} from '@hashgraphonline/standards-sdk';
import { getOrCreateBob } from './agent-utils';
import { getAgent } from './get-agent';
import { generateResponse, initializeMCPState } from '../src/utils/response-generator';
import { MCPOpenAIClient } from '../src/utils/mcp-openai';
import { Character } from '../src/types';
import { PrivateKey } from '@hashgraph/sdk';

const logger = new Logger({
  module: 'Agent',
  level: 'debug',
  prettyPrint: true,
});

dotenv.config();

// Initialize MCPOpenAIClient
const mcpClient = new MCPOpenAIClient(
  process.env.OPENAI_API_KEY || '',
  'http://localhost:3005',
  process.env.OPENAI_MODEL || 'gpt-4.1'
);

// Character definition for the agent
const agentCharacter: Character = {
  id: 'bob-agent',
  name: 'Bob',
  description: 'A friendly and helpful Hedera agent that can assist with blockchain operations.',
  personality: 'Friendly, helpful, and knowledgeable about blockchain technology.',
  scenario: 'You are helping users interact with the Hedera network.',
  first_mes: 'Hello! I\'m Bob, your friendly Hedera agent! How can I assist you today?',
  mes_example: 'I can help you with various blockchain operations. What would you like to do?',
  creator_notes: 'Bob is designed to help users interact with the Hedera network in a friendly way.',
  system_prompt: 'You are Bob, a helpful Hedera agent. Always maintain a friendly and professional demeanor while assisting users with blockchain operations.',
  traits: {
    expertise: 'blockchain',
    friendliness: 'high',
    helpfulness: 'high'
  }
};

// Initialize the response generator with the agent's character
initializeMCPState(mcpClient, true, agentCharacter);

const isJson = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

function stripAnsiCodes(text: string): string {
  return text.replace(/\u001b\[\d+m/g, '');
}


function extractAccountId(operatorId: string): string | null {
  if (!operatorId) return null;
  const parts = operatorId.split('@');
  return parts.length === 2 ? parts[1] : null;
}

/**
 * Loads existing connections using ConnectionsManager
 * @param agent - The agent configuration data
 * @returns A map of connections and the last processed timestamp
 */
async function loadConnectionsUsingManager(agent: {
  client: HCS10Client;
  accountId: string;
  inboundTopicId: string;
  outboundTopicId: string;
}): Promise<{
  connections: Map<string, Connection>;
  connectionManager: ConnectionsManager;
  lastProcessedTimestamp: Date;
}> {
  logger.info('Loading existing connections using ConnectionsManager');

  const connectionManager = new ConnectionsManager({
    baseClient: agent.client,
    logLevel: 'debug',
  });

  const connectionsArray = await connectionManager.fetchConnectionData(
    agent.accountId
  );
  logger.info(`Found ${connectionsArray.length} connections`);

  const connections = new Map<string, Connection>();
  let lastTimestamp = new Date(0);

  for (const connection of connectionsArray) {
    connections.set(connection.connectionTopicId, connection);

    if (
      connection.created &&
      connection.created.getTime() > lastTimestamp.getTime()
    ) {
      lastTimestamp = connection.created;
      }
    if (
      connection.lastActivity &&
      connection.lastActivity.getTime() > lastTimestamp.getTime()
    ) {
      lastTimestamp = connection.lastActivity;
    }
  }

  logger.info(
    `Finished loading. ${connections.size} active connections found, last outbound timestamp: ${lastTimestamp}`
  );

  return {
    connections,
    connectionManager,
    lastProcessedTimestamp: lastTimestamp,
  };
}

async function handleConnectionRequest(
  agent: {
    client: HCS10Client;
    accountId: string;
    operatorId: string;
    inboundTopicId: string;
    outboundTopicId: string;
    character: Character;
  },
  message: HCSMessage,
  connectionManager: ConnectionsManager
): Promise<string | null> {
  if (!message.operator_id) {
    logger.warn('Missing operator_id in connection request');
    return null;
  }
  if (!message.created) {
    logger.warn('Missing created timestamp in connection request');
    return null;
  }
  if (
    typeof message.sequence_number !== 'number' ||
    message.sequence_number <= 0
  ) {
    logger.warn(
      `Invalid sequence_number in connection request: ${message.sequence_number}`
    );
    return null;
  }

  const requesterOperatorId = message.operator_id;
  const requesterAccountId = extractAccountId(requesterOperatorId);
  if (!requesterAccountId) {
    logger.warn(`Invalid operator_id format: ${requesterOperatorId}`);
    return null;
  }

  logger.info(
    `Processing connection request #${message.sequence_number} from ${requesterOperatorId}`
  );

  // Look for any existing connection for this sequence number
  let existingConnection;
  for (const conn of connectionManager.getAllConnections()) {
    if (conn.inboundRequestId === message.sequence_number) {
      existingConnection = conn;
      break;
    }
  }
  
  if (existingConnection) {
    // Make sure we have a valid topic ID, not a reference key
    if (existingConnection.connectionTopicId.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)) {
      logger.warn(
        `Connection already exists for request #${message.sequence_number} from ${requesterOperatorId}. Topic: ${existingConnection.connectionTopicId}`
      );
      return existingConnection.connectionTopicId;
    } else {
      logger.warn(
        `Connection exists for request #${message.sequence_number} but has invalid topic ID format: ${existingConnection.connectionTopicId}`
      );
    }
  }

  try {
    const { connectionTopicId, confirmedConnectionSequenceNumber } =
      await agent.client.handleConnectionRequest(
        agent.inboundTopicId,
        requesterAccountId,
        message.sequence_number
      );

    await connectionManager.fetchConnectionData(agent.accountId);

    // Send connection_created message to outbound topic
    const connectionCreatedPayload = {
      op: 'connection_created',
      connection_topic_id: connectionTopicId,
      connection_id: message.sequence_number,
      target_account_id: requesterAccountId,
      timestamp: new Date().toISOString(),
      memo: 'Connection created confirmation'
    };

    await agent.client.submitPayload(
      agent.outboundTopicId,
      connectionCreatedPayload,
      undefined,
      false
    );

    // Generate and send welcome message
    const welcomeMessage = agent.character.first_mes || 
      `Hello! I'm ${agent.character.name}. ${agent.character.description} How can I assist you today?`;

    const welcomePayload = {
      op: 'message',
      data: welcomeMessage,
      timestamp: new Date().toISOString(),
      memo: 'Welcome message after connection established'
    };

    await agent.client.submitPayload(
      connectionTopicId,
      welcomePayload,
      undefined,
      false
    );

    logger.info(
      `Connection established with ${requesterOperatorId} on topic ${connectionTopicId}`
    );
    return connectionTopicId;
  } catch (error) {
    logger.error(
      `Error handling connection request #${message.sequence_number} from ${requesterOperatorId}: ${error}`
    );
    return null;
  }
}



function extractAllText(obj: any): string {
  if (typeof obj === 'string') return stripAnsiCodes(obj);
  if (!obj || typeof obj !== 'object') return '';

  if (Array.isArray(obj)) {
    return obj.map(extractAllText).filter(Boolean).join(' ');
  }

  if (obj.text && typeof obj.text === 'string') return stripAnsiCodes(obj.text);

  return Object.values(obj).map(extractAllText).filter(Boolean).join(' ');
}

async function handleStandardMessage(
  agent: {
    client: HCS10Client;
    accountId: string;
    operatorId: string;
    character: Character;
  },
  message: HCSMessage,
  connectionTopicId: string
): Promise<void> {
  if (message.data === undefined) {
    return;
  }

  if (
    !connectionTopicId ||
    !connectionTopicId.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)
  ) {
    logger.error(`Invalid connection topic ID format: ${connectionTopicId}`);
    return;
  }

  let rawContent: string = message.data;

  if (rawContent.startsWith('hcs://')) {
    try {
      const content = await agent.client.getMessageContent(rawContent);
      rawContent = content as string;
    } catch (error) {
      logger.error(`Failed to resolve message content: ${error}`);
      return;
    }
  }

  let messageContent = rawContent;

  if (isJson(rawContent)) {
    try {
      const parsed = JSON.parse(rawContent);
      const extracted = extractAllText(parsed);
      if (extracted.trim()) {
        messageContent = extracted;
        logger.debug(
          `Extracted from JSON: "${messageContent}" (original: "${rawContent.substring(
            0,
            50
          )}${rawContent.length > 50 ? '...' : ''}")`
        );
      }
    } catch {
      messageContent = rawContent;
    }
  }

  try {
    // Generate response using our AI service with the agent's character
    const response = await generateResponse(messageContent, agent.character);
    
    // Send the response using submitPayload
    const responsePayload = {
      op: 'message',
      data: response,
      timestamp: new Date().toISOString(),
      memo: `${agent.character.name} response`
    };

    logger.info(`Sending response to topic ${connectionTopicId}`);
    await agent.client.submitPayload(
      connectionTopicId,
      responsePayload,
      undefined,
      false
    );
  } catch (error) {
    logger.error(
      `Failed to generate or send response to topic ${connectionTopicId}: ${error}`
    );
  }
}

async function monitorTopics(agent: {
  client: HCS10Client;
  accountId: string;
  operatorId: string;
  inboundTopicId: string;
  outboundTopicId: string;
  character: Character;
}) {
  let { connections, connectionManager } = await loadConnectionsUsingManager(
    agent
  );

  const processedMessages = new Map<string, Set<number>>();
  processedMessages.set(agent.inboundTopicId, new Set<number>());

  // Only monitor actual connection topics (not reference keys)
  const connectionTopics = new Set<string>();
  for (const [topicId, connection] of connections.entries()) {
    // Only add topic IDs that follow the 0.0.number format
    if (topicId.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)) {
      connectionTopics.add(topicId);
    } else {
      logger.debug(`Skipping invalid topic ID format: ${topicId}`);
    }
  }

  logger.info('Pre-populating processed messages for existing connections...');
  
  for (const topicId of connectionTopics) {
    const initialProcessedSet = new Set<number>();
    processedMessages.set(topicId, initialProcessedSet);
    
    const connection = connections.get(topicId);
    if (!connection) continue;
    
    try {
      const history = await agent.client.getMessageStream(topicId);
      
      for (const msg of history.messages) {
        if (
          typeof msg.sequence_number === 'number' &&
          msg.sequence_number > 0 &&
          msg.created
        ) {
          if (
            connection.lastActivity &&
            msg.created.getTime() <= connection.lastActivity.getTime()
          ) {
            initialProcessedSet.add(msg.sequence_number);
            logger.debug(
              `Pre-populated message #${msg.sequence_number} on topic ${topicId} based on timestamp`
            );
          } else if (
            msg.operator_id &&
            msg.operator_id.endsWith(`@${agent.accountId}`)
            ) {
              initialProcessedSet.add(msg.sequence_number);
            }
          }
        }
      
      logger.debug(
        `Pre-populated ${initialProcessedSet.size} messages for topic ${topicId}`
      );
    } catch (error: any) {
      logger.warn(
        `Failed to pre-populate messages for topic ${topicId}: ${error.message}. It might be closed or invalid.`
      );
      if (
        error.message &&
        (error.message.includes('INVALID_TOPIC_ID') ||
          error.message.includes('TopicId Does Not Exist'))
      ) {
        connectionTopics.delete(topicId);
        processedMessages.delete(topicId);
        connections.delete(topicId);
      }
    }
  }

  logger.info(`Starting polling agent for ${agent.operatorId}`);
  logger.info(`Monitoring inbound topic: ${agent.inboundTopicId}`);
  logger.info(
    `Monitoring ${connectionTopics.size} active connection topics after pre-population.`
  );

  while (true) {
    try {
      await connectionManager.fetchConnectionData(agent.accountId);
      const updatedConnections = connectionManager.getAllConnections();
      
      // Update our local map of connections
      connections.clear();
      for (const connection of updatedConnections) {
        connections.set(connection.connectionTopicId, connection);
      }
      
      // Update connection topics set - only use valid topic IDs
      const currentTrackedTopics = new Set<string>();
      for (const [topicId, _] of connections.entries()) {
        if (topicId.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)) {
          currentTrackedTopics.add(topicId);
        }
      }
      
      const previousTrackedTopics = new Set(connectionTopics);
      
      // Add new topics to track
      for (const topicId of currentTrackedTopics) {
        if (!previousTrackedTopics.has(topicId)) {
          connectionTopics.add(topicId);
          if (!processedMessages.has(topicId)) {
            processedMessages.set(topicId, new Set<number>());
          }
          logger.info(
            `Discovered new connection topic: ${topicId} for ${
              connections.get(topicId)?.targetAccountId
            }`
          );
        }
      }
      
      // Remove closed topics
      for (const topicId of previousTrackedTopics) {
        if (!currentTrackedTopics.has(topicId)) {
          connectionTopics.delete(topicId);
          processedMessages.delete(topicId);
          logger.info(`Removed connection topic: ${topicId}`);
        }
      }

      const inboundMessages = await agent.client.getMessages(
        agent.inboundTopicId
      );
      const inboundProcessed = processedMessages.get(agent.inboundTopicId)!;

      inboundMessages.messages.sort((a: HCSMessage, b: HCSMessage) => {
        const seqA =
          typeof a.sequence_number === 'number' ? a.sequence_number : 0;
        const seqB =
          typeof b.sequence_number === 'number' ? b.sequence_number : 0;
        return seqA - seqB;
      });

      for (const message of inboundMessages.messages) {
        if (
          !message.created ||
          typeof message.sequence_number !== 'number' ||
          message.sequence_number <= 0
        )
          continue;

        if (!inboundProcessed.has(message.sequence_number)) {
          inboundProcessed.add(message.sequence_number);

          if (
            message.operator_id &&
            message.operator_id.endsWith(`@${agent.accountId}`)
          ) {
            logger.debug(
              `Skipping own inbound message #${message.sequence_number}`
            );
            continue;
          }

          if (message.op === 'connection_request') {
            // Find any existing connection for this sequence number
            let existingConnection;
            for (const conn of connectionManager.getAllConnections()) {
              if (conn.inboundRequestId === message.sequence_number) {
                existingConnection = conn;
                break;
              }
            }
            
            if (existingConnection) {
              // Make sure we have a valid topic ID, not a reference key
              if (existingConnection.connectionTopicId.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)) {
                logger.debug(
                  `Skipping already handled connection request #${message.sequence_number}. Connection exists with topic: ${existingConnection.connectionTopicId}`
                );
                continue;
              }
            }
            
            logger.info(
              `Processing inbound connection request #${message.sequence_number}`
            );
            const newTopicId = await handleConnectionRequest(
              agent,
              message,
              connectionManager
            );
            if (newTopicId && !connectionTopics.has(newTopicId)) {
              connectionTopics.add(newTopicId);
              if (!processedMessages.has(newTopicId)) {
                processedMessages.set(newTopicId, new Set<number>());
              }
              logger.info(`Now monitoring new connection topic: ${newTopicId}`);
            }
          } else if (message.op === 'connection_created') {
            logger.info(
              `Received connection_created confirmation #${message.sequence_number} on inbound topic for topic ${message.connection_topic_id}`
            );
          }
        }
      }

      const topicsToProcess = Array.from(connectionTopics);
      for (const topicId of topicsToProcess) {
        try {
          if (!connections.has(topicId)) {
            logger.warn(
              `Skipping processing for topic ${topicId} as it's no longer in the active connections map.`
            );
            if (connectionTopics.has(topicId)) connectionTopics.delete(topicId);
            if (processedMessages.has(topicId))
              processedMessages.delete(topicId);
            continue;
          }

          const messages = await agent.client.getMessageStream(topicId);

          if (!processedMessages.has(topicId)) {
            processedMessages.set(topicId, new Set<number>());
          }
          const processedSet = processedMessages.get(topicId)!;

          messages.messages.sort((a: HCSMessage, b: HCSMessage) => {
            const seqA =
              typeof a.sequence_number === 'number' ? a.sequence_number : 0;
            const seqB =
              typeof b.sequence_number === 'number' ? b.sequence_number : 0;
            return seqA - seqB;
          });

          const connection = connections.get(topicId);
          const lastActivityTimestamp =
            connection?.lastActivity?.getTime() || 0;

          for (const message of messages.messages) {
            if (
              !message.created ||
              typeof message.sequence_number !== 'number' ||
              message.sequence_number <= 0
            )
              continue;

            if (message.created.getTime() <= lastActivityTimestamp) {
              processedSet.add(message.sequence_number);
              continue;
            }

            if (!processedSet.has(message.sequence_number)) {
              processedSet.add(message.sequence_number);

              if (
                message.operator_id &&
                message.operator_id.endsWith(`@${agent.accountId}`)
              ) {
                logger.debug(
                  `Skipping own message #${message.sequence_number} on connection topic ${topicId}`
                );
                continue;
              }

              if (message.op === 'message') {
                logger.info(
                  `Processing message #${message.sequence_number} on topic ${topicId}`
                );
                await handleStandardMessage(agent, message, topicId);
              } else if (message.op === 'close_connection') {
                logger.info(
                  `Received close_connection message #${message.sequence_number} on topic ${topicId}. Removing topic from monitoring.`
                );
                connections.delete(topicId);
                connectionTopics.delete(topicId);
                processedMessages.delete(topicId);
                break;
              }
            }
          }
        } catch (error: any) {
          if (
            error.message &&
            (error.message.includes('INVALID_TOPIC_ID') ||
              error.message.includes('TopicId Does Not Exist'))
          ) {
            logger.warn(
              `Connection topic ${topicId} likely deleted or expired. Removing from monitoring.`
            );
            connections.delete(topicId);
            connectionTopics.delete(topicId);
            processedMessages.delete(topicId);
          } else {
            logger.error(
              `Error processing connection topic ${topicId}: ${error}`
            );
          }
        }
      }
    } catch (error) {
      logger.error(`Error in main monitoring loop: ${error}`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

async function main() {
  try {
    const agentAddress = process.env.AGENT_ADDRESS;
    if (!agentAddress) {
      throw new Error('AGENT_ADDRESS environment variable must be set');
    }

    const registryUrl = process.env.REGISTRY_URL;
    logger.info(`Using registry URL: ${registryUrl}`);

    if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
      throw new Error(
        'HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY environment variables must be set'
      );
    }

    const baseClient = new HCS10Client({
      network: 'testnet',
      operatorId: process.env.HEDERA_ACCOUNT_ID,
      operatorPrivateKey: process.env.HEDERA_PRIVATE_KEY,
      guardedRegistryBaseUrl: registryUrl,
      prettyPrint: true,
      logLevel: 'debug',
    });

    const agent = await getAgent(logger, agentAddress);
    if (!agent) {
      throw new Error(`Failed to get agent for address ${agentAddress}`);
    }

    // Initialize the response generator with the agent's character
    initializeMCPState(mcpClient, true, agent.character);

    const agentData = {
      client: agent.client,
      accountId: agent.accountId,
      operatorId: `${agent.inboundTopicId}@${agent.accountId}`,
      inboundTopicId: agent.inboundTopicId,
      outboundTopicId: agent.outboundTopicId,
      character: agent.character
    };

    logger.info('===== AGENT POLLING DETAILS =====');
    logger.info(`Agent Address: ${agentAddress}`);
    logger.info(`Account ID: ${agentData.accountId}`);
    logger.info(`Operator ID: ${agentData.operatorId}`);
    logger.info(`Inbound Topic: ${agentData.inboundTopicId}`);
    logger.info(`Outbound Topic: ${agentData.outboundTopicId}`);
    logger.info(`Character Name: ${agentData.character.name}`);
    logger.info('=====================================');

    await monitorTopics(agentData);
  } catch (error) {
    logger.error(`Error in main function: ${error}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
main();
}
