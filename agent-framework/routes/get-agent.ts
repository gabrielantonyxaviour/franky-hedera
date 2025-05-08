import {
    HCS10Client,
    Logger,
} from '@hashgraphonline/standards-sdk';
import { Character } from '../src/types';
import axios from 'axios';

interface CustomAgentData {
    accountId: string;
    inboundTopicId: string;
    outboundTopicId: string;
    encryptedPrivateKey: string;
    profileTopicId: string;
    agentAddress: string;
    // Character details
    name: string;
    subname: string;
    description: string;
    personality: string;
    scenario: string;
    firstMes: string;
    mesExample: string;
    creatorComment: string;
    tags: string[];
    talkativeness: number;
}

export interface AgentData {
    accountId: string;
    inboundTopicId: string;
    outboundTopicId: string;
    client: HCS10Client;
    character: Character;
}

export async function getAgent(
    logger: Logger,
    agentAddress: string
): Promise<AgentData | null> {
    try {
        // Fetch agent data from the API
        const response = await axios.get(`https://franky-hedera.vercel.app/api/db/agents?address=${agentAddress}`);
        const agentData: CustomAgentData[] = response.data;

        if (!agentData || agentData.length === 0) {
            logger.error(`No agent found for address ${agentAddress}`);
            return null;
        }

        const agent = agentData[0]; // Get the first agent from the array

        // Create a new HCS10Client for this agent
        const client = new HCS10Client({
            network: 'testnet',
            operatorId: agent.accountId,
            operatorPrivateKey: agent.encryptedPrivateKey,
            guardedRegistryBaseUrl: process.env.REGISTRY_URL,
            prettyPrint: true,
            logLevel: 'debug',
        });

        // Create character data from agent details
        const character: Character = {
            id: agent.agentAddress,
            name: agent.name,
            description: agent.description,
            personality: agent.personality,
            scenario: agent.scenario,
            first_mes: agent.firstMes,
            mes_example: agent.mesExample,
            creator_notes: agent.creatorComment,
            system_prompt: `You are ${agent.name}, ${agent.description}. Your personality: ${agent.personality}. Scenario: ${agent.scenario}.`,
            traits: {
                expertise: agent.tags.join(', '),
                talkativeness: agent.talkativeness.toString()
            }
        };

        // Return the agent data with character
        return {
            accountId: agent.accountId,
            inboundTopicId: agent.inboundTopicId,
            outboundTopicId: agent.outboundTopicId,
            client: client,
            character: character
        };

    } catch (error) {
        logger.error('Error creating custom agent:', error);
        return null;
    }
}


