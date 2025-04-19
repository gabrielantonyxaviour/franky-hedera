import { createPublicClient, http } from "viem";
import { base, baseSepolia } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config();

const FRANKY_ADDRESS = '0xA150363e58bF57363fBce25d40e98AC59bCc8E85';

// Full contract ABI
const agentAbi = [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"agentId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"deviceId","type":"uint256"},{"indexed":false,"internalType":"string","name":"prefix","type":"string"},{"indexed":false,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"bytes32","name":"keyHash","type":"bytes32"},{"indexed":false,"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"indexed":false,"internalType":"string","name":"character","type":"string"},{"indexed":false,"internalType":"string","name":"secrets","type":"string"}],"name":"AgentCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"agentId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"deviceId","type":"uint256"}],"name":"AgentTerminated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"agentId","type":"uint256"},{"indexed":false,"internalType":"bytes32","name":"keyHash","type":"bytes32"}],"name":"ApiKeyRegenerated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"deviceId","type":"uint256"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"string","name":"deviceModel","type":"string"},{"indexed":false,"internalType":"string","name":"ram","type":"string"},{"indexed":false,"internalType":"string","name":"storageCapacity","type":"string"},{"indexed":false,"internalType":"string","name":"cpu","type":"string"},{"indexed":false,"internalType":"string","name":"ngrokLink","type":"string"},{"indexed":false,"internalType":"address","name":"deviceAddress","type":"address"}],"name":"DeviceRegistered","type":"event"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"agents","outputs":[{"internalType":"uint256","name":"deviceId","type":"uint256"},{"internalType":"string","name":"prefix","type":"string"},{"internalType":"string","name":"config","type":"string"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"keyHash","type":"bytes32"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"bool","name":"isActive","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"checkENSPrefixAvailable","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"string","name":"prefix","type":"string"},{"internalType":"string","name":"config","type":"string"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"uint256","name":"deviceId","type":"uint256"}],"name":"createAgent","outputs":[{"internalType":"uint256","name":"agentId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"deviceAgents","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"deviceRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"devices","outputs":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"uint256","name":"agentCount","type":"uint256"},{"internalType":"bool","name":"isRegistered","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"agentId","type":"uint256"}],"name":"getAgent","outputs":[{"components":[{"internalType":"uint256","name":"deviceId","type":"uint256"},{"internalType":"string","name":"prefix","type":"string"},{"internalType":"string","name":"config","type":"string"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"keyHash","type":"bytes32"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"bool","name":"isActive","type":"bool"}],"internalType":"struct Franky.Agent","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"deviceId","type":"uint256"}],"name":"getDevice","outputs":[{"components":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"uint256","name":"agentCount","type":"uint256"},{"internalType":"bool","name":"isRegistered","type":"bool"}],"internalType":"struct Franky.Device","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"agentId","type":"uint256"}],"name":"getKeyHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getRandomBytes32","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"agentId","type":"uint256"}],"name":"isAgentOwned","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"deviceId","type":"uint256"}],"name":"isDeviceOwned","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"deviceId","type":"uint256"}],"name":"isDeviceRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isRegisteredDevice","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"ownerDevices","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_hash","type":"bytes32"},{"internalType":"bytes","name":"_signature","type":"bytes"}],"name":"recoverSigner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"agentId","type":"uint256"}],"name":"regenerateApiKey","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"bytes32","name":"verificationHash","type":"bytes32"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"registerDevice","outputs":[{"internalType":"uint256","name":"deviceId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"agentId","type":"uint256"}],"name":"terminateAgent","outputs":[],"stateMutability":"nonpayable","type":"function"}];

const isMainnet = true;

async function fetchIPFSData(hash) {
    // Try different gateways
    const gateways = [
        `https://ipfs.io/ipfs/${hash}`
    ];
    
    for (const gateway of gateways) {
        try {
            console.log(`Trying ${gateway}...`);
            const response = await fetch(gateway);
            const text = await response.text();
            console.log(`Success with ${gateway}`);
            console.log(text); // Log the actual content
            return text;
        } catch (err) {
            console.log(`Failed with ${gateway}: ${err.message}`);
        }
    }
    
    throw new Error('Failed to retrieve content from any gateway');
}

export async function getAgentCharacter(agentId) {
    const startTime = new Date();
    console.log(`\n🔍 [${startTime.toISOString()}] AGENT FETCH: Starting agent data fetch for ID: ${agentId}`);
    
    try {
        // Step 1: Initialize blockchain client
        console.log(`🔗 [${new Date().toISOString()}] AGENT FETCH: Initializing blockchain client...`);
        const client = createPublicClient({
            chain: base,
            transport: http()
        });
        console.log(`✅ [${new Date().toISOString()}] AGENT FETCH: Client initialized for ${isMainnet ? 'mainnet (Base)' : 'testnet (Base Sepolia)'}`);

        // Step 2: Fetch agents from API
        console.log(`🌐 [${new Date().toISOString()}] AGENT FETCH: Requesting data from https://frankyagent.xyz/api/agents`);
        const apiStartTime = new Date();
        const request = await fetch(`https://frankyagent.xyz/api/agents`);
        
        // Step 3: Parse API response
        console.log(`📊 [${new Date().toISOString()}] AGENT FETCH: Parsing API response (Status: ${request.status})`);
        const { agents } = await request.json();
        const apiEndTime = new Date();
        const apiDuration = apiEndTime.getTime() - apiStartTime.getTime();
        console.log(`📋 [${new Date().toISOString()}] AGENT FETCH: Retrieved ${agents.length} agents in ${apiDuration}ms`);

        // Step 4: Find specific agent by address
        console.log(`🔎 [${new Date().toISOString()}] AGENT FETCH: Searching for agent with address: ${agentId}`);
        const agent = agents.find(a => a.agentAddress.toLowerCase() === agentId.toLowerCase());
        
        // Step 5: Validate agent exists
        if (!agent) {
            console.error(`❌ [${new Date().toISOString()}] AGENT FETCH: Agent not found with address ${agentId}`);
            throw new Error(`Agent with address ${agentId} not found`);
        }
        
        console.log(`✅ [${new Date().toISOString()}] AGENT FETCH: Found agent "${agent.name}" (prefix: ${agent.prefix})`);
        console.log(`👤 [${new Date().toISOString()}] AGENT FETCH: Owner address: ${agent.owner || 'UNDEFINED'}`);
        
        // Step 6: Process agent data for return
        console.log(`🔄 [${new Date().toISOString()}] AGENT FETCH: Processing agent data...`);
        
        // Create return object with comprehensive agent data
        const agentData = {
            // Basic agent info
            prefix: agent.prefix,
            name: agent.name,
            description: agent.description,
            owner: agent.owner,
            agentAddress: agent.agentAddress,
            deviceAddress: agent.deviceAddress,
            
            // Fee information
            perApiCallAmount: parseFloat(agent.perApiCallFee),
            
            // Character configuration - the complete object
            character: agent.characterConfig,
            
            // Additional metadata
            isPublic: agent.isPublic,
            txHash: agent.txHash,
            blockNumber: agent.blockNumber,
            timestamp: agent.timestamp,
            secretsHash: agent.secretsHash,
            
            // Original character URL if needed
            characterUrl: agent.character
        };

        if (!agentData.owner) {
            console.error(`⚠️ [${new Date().toISOString()}] AGENT FETCH: WARNING - Owner field is undefined or null in processed data`);
            console.log(`🔍 [${new Date().toISOString()}] AGENT FETCH: Raw agent data:`, JSON.stringify(agent));
        } else {
            console.log(`✅ [${new Date().toISOString()}] AGENT FETCH: Owner field verified: ${agentData.owner}`);
        }
        
        // Step 7: Log completion and return data
        const endTime = new Date();
        const totalDuration = endTime.getTime() - startTime.getTime();
        console.log(`✅ [${endTime.toISOString()}] AGENT FETCH: Completed agent fetch in ${totalDuration}ms`);
        
        // Log selected important fields for debugging
        console.log(`📌 AGENT FETCH SUMMARY:
  - Name: ${agentData.name}
  - Address: ${agentData.agentAddress}
  - Owner: ${agentData.owner}
  - API Fee: ${agentData.perApiCallAmount}
  - Character Config: ${JSON.stringify(agentData.character.name || {})}
`);
        
        return agentData;
    } catch (error) {
        const endTime = new Date();
        const totalDuration = endTime.getTime() - startTime.getTime();
        console.error(`❌ [${endTime.toISOString()}] AGENT FETCH ERROR (${totalDuration}ms):`, error);
        console.error(`❌ AGENT FETCH STACK: ${error.stack}`);
        throw error;
    }
} 