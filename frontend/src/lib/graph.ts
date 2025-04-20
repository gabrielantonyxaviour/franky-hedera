import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import { FRANY_INDEXER_API } from './constants';
import { Hex } from 'viem';

// Set up the Apollo Client with your subgraph endpoint
const client = new ApolloClient({
    uri: FRANY_INDEXER_API,
    cache: new InMemoryCache(),
});

// 1. Query all available devices (devices that are not hosting any agents)
export const getAvailableDevices = async () => {
    const AVAILABLE_DEVICES_QUERY = `
    query {
      devices(where: {agents_: {id: null}}) {
        id
        owner {
          id
        }
        deviceMetadata
        ngrokLink
        hostingFee
        createdAt
        updatedAt
      }
    }
  `;

    try {
        const { data } = await client.query({
            query: gql(AVAILABLE_DEVICES_QUERY),
        });
        return data.devices;
    } catch (error) {
        console.error('Error fetching available devices:', error);
        throw error;
    }
};

// 2. Query all public agents (agents that are enabled for public use)
export const getPublicAgents = async () => {
    const PUBLIC_AGENTS_QUERY = `
    query {
      agents(where: {isPublic: true}) {
        id
        deviceAddress {
          id
          ngrokLink
        }
        owner {
          id
        }
        avatar
        subname
        perApiCallFee
        characterConfig
        createdAt
        updatedAt
      }
    }
  `;

    try {
        const { data } = await client.query({
            query: gql(PUBLIC_AGENTS_QUERY),
        });
        return data.agents;
    } catch (error) {
        console.error('Error fetching public agents:', error);
        throw error;
    }
};

// 3. Query devices by owner address
export const getDevicesByOwner = async (ownerAddress: Hex) => {
    const DEVICES_BY_OWNER_QUERY = `
    query($ownerId: ID!) {
      devices(where: {owner: $ownerId}) {
        id
        deviceMetadata
        ngrokLink
        hostingFee
        agents {
          id
          subname
        }
        createdAt
        updatedAt
      }
    }
  `;

    try {
        const { data } = await client.query({
            query: gql(DEVICES_BY_OWNER_QUERY),
            variables: {
                ownerId: ownerAddress
            }
        });
        return data.devices;
    } catch (error) {
        console.error('Error fetching devices by owner:', error);
        throw error;
    }
};

// 4. Query agents by owner address
export const getAgentsByOwner = async (ownerAddress: Hex) => {
    const AGENTS_BY_OWNER_QUERY = `
    query($ownerId: ID!) {
      agents(where: {owner: $ownerId}) {
        id
        deviceAddress {
          id
          ngrokLink
        }
        avatar
        subname
        perApiCallFee
        characterConfig
        isPublic
        createdAt
        updatedAt
      }
    }
  `;

    try {
        const { data } = await client.query({
            query: gql(AGENTS_BY_OWNER_QUERY),
            variables: {
                ownerId: ownerAddress
            }
        });
        return data.agents;
    } catch (error) {
        console.error('Error fetching agents by owner:', error);
        throw error;
    }
};

// 5. Query agent details by agent address
export const getAgentDetails = async (agentAddress: Hex) => {
    const AGENT_DETAILS_QUERY = `
    query($agentId: ID!) {
      agent(id: $agentId) {
        id
        deviceAddress {
          id
          ngrokLink
          deviceMetadata
          hostingFee
        }
        owner {
          id
          serverWalletAddress
        }
        avatar
        subname
        perApiCallFee
        characterConfig
        isPublic
        keyHash
        createdAt
        updatedAt
      }
    }
  `;

    try {
        const { data } = await client.query({
            query: gql(AGENT_DETAILS_QUERY),
            variables: {
                agentId: agentAddress
            }
        });
        return data.agent;
    } catch (error) {
        console.error('Error fetching agent details:', error);
        throw error;
    }
};

// 6. Get key hash for an agent
export const getAgentKeyHash = async (agentAddress: Hex) => {
    const AGENT_KEY_HASH_QUERY = `
    query($agentId: ID!) {
      agent(id: $agentId) {
        id
        keyHash
      }
    }
  `;

    try {
        const { data } = await client.query({
            query: gql(AGENT_KEY_HASH_QUERY),
            variables: {
                agentId: agentAddress
            }
        });
        return data.agent?.keyHash;
    } catch (error) {
        console.error('Error fetching agent key hash:', error);
        throw error;
    }
};

// 7. Query device details by device address
export const getDeviceDetails = async (deviceAddress: Hex) => {
    const DEVICE_DETAILS_QUERY = `
    query($deviceId: ID!) {
      device(id: $deviceId) {
        id
        owner {
          id
          serverWalletAddress
        }
        deviceMetadata
        ngrokLink
        hostingFee
        agents {
          id
          subname
          avatar
          isPublic
          perApiCallFee
        }
        createdAt
        updatedAt
      }
    }
  `;

    try {
        const { data } = await client.query({
            query: gql(DEVICE_DETAILS_QUERY),
            variables: {
                deviceId: deviceAddress
            }
        });
        return data.device;
    } catch (error) {
        console.error('Error fetching device details:', error);
        throw error;
    }
};