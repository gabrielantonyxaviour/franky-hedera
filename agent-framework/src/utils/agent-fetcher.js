import { createPublicClient, http } from "viem";
import { base, baseSepolia } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config();

const FRANKY_ADDRESS = '0xA150363e58bF57363fBce25d40e98AC59bCc8E85';

// Full contract ABI
const agentAbi = [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"agentId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"deviceId","type":"uint256"},{"indexed":false,"internalType":"string","name":"prefix","type":"string"},{"indexed":false,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"bytes32","name":"keyHash","type":"bytes32"},{"indexed":false,"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"indexed":false,"internalType":"string","name":"character","type":"string"},{"indexed":false,"internalType":"string","name":"secrets","type":"string"}],"name":"AgentCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"agentId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"deviceId","type":"uint256"}],"name":"AgentTerminated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"agentId","type":"uint256"},{"indexed":false,"internalType":"bytes32","name":"keyHash","type":"bytes32"}],"name":"ApiKeyRegenerated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"deviceId","type":"uint256"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"string","name":"deviceModel","type":"string"},{"indexed":false,"internalType":"string","name":"ram","type":"string"},{"indexed":false,"internalType":"string","name":"storageCapacity","type":"string"},{"indexed":false,"internalType":"string","name":"cpu","type":"string"},{"indexed":false,"internalType":"string","name":"ngrokLink","type":"string"},{"indexed":false,"internalType":"address","name":"deviceAddress","type":"address"}],"name":"DeviceRegistered","type":"event"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"agents","outputs":[{"internalType":"uint256","name":"deviceId","type":"uint256"},{"internalType":"string","name":"prefix","type":"string"},{"internalType":"string","name":"config","type":"string"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"keyHash","type":"bytes32"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"bool","name":"isActive","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"checkENSPrefixAvailable","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"string","name":"prefix","type":"string"},{"internalType":"string","name":"config","type":"string"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"uint256","name":"deviceId","type":"uint256"}],"name":"createAgent","outputs":[{"internalType":"uint256","name":"agentId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"deviceAgents","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"deviceRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"devices","outputs":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"uint256","name":"agentCount","type":"uint256"},{"internalType":"bool","name":"isRegistered","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"agentId","type":"uint256"}],"name":"getAgent","outputs":[{"components":[{"internalType":"uint256","name":"deviceId","type":"uint256"},{"internalType":"string","name":"prefix","type":"string"},{"internalType":"string","name":"config","type":"string"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"keyHash","type":"bytes32"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"bool","name":"isActive","type":"bool"}],"internalType":"struct Franky.Agent","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"deviceId","type":"uint256"}],"name":"getDevice","outputs":[{"components":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"uint256","name":"agentCount","type":"uint256"},{"internalType":"bool","name":"isRegistered","type":"bool"}],"internalType":"struct Franky.Device","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"agentId","type":"uint256"}],"name":"getKeyHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getRandomBytes32","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"agentId","type":"uint256"}],"name":"isAgentOwned","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"deviceId","type":"uint256"}],"name":"isDeviceOwned","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"deviceId","type":"uint256"}],"name":"isDeviceRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isRegisteredDevice","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"ownerDevices","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_hash","type":"bytes32"},{"internalType":"bytes","name":"_signature","type":"bytes"}],"name":"recoverSigner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"agentId","type":"uint256"}],"name":"regenerateApiKey","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"bytes32","name":"verificationHash","type":"bytes32"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"registerDevice","outputs":[{"internalType":"uint256","name":"deviceId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"agentId","type":"uint256"}],"name":"terminateAgent","outputs":[],"stateMutability":"nonpayable","type":"function"}];

const isMainnet = false;

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
    try {
        console.log(`\n🔍 Fetching agent data for ID: ${agentId}`);
        
        // Create client for contract interaction
        const client = createPublicClient({
            chain: isMainnet ? base : baseSepolia,
            transport: http()
        });

        const request = await fetch(`https://frankyagent.xyz/api/agents`)
        const {agents}= await request.json();
        // TODO: To call Nodit 


        // const request = await fetch(`https://web3.nodit.io/v1/ethereum/mainnet/ens/getEnsRecordsByAccount`,{
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'X-API-KEY': 'Bearer ' + process.env.NODIT_API_KEY,
        //         accept: "application/json"
        //     },
        //     body: JSON.stringify({
        //         account: agentId
        //     })
        // });

        // const reponse =request.json();

        // console.log(reponse);
        
        // Get the agent data from contract
        console.log("📝 Getting agent config from contract...");
        const result = await client.readContract({
            address: FRANKY_ADDRESS,
            abi: agentAbi,
            functionName: 'getAgent',
            args: [BigInt(agentId)]
        });
        
        // Log the raw result for debugging
        console.log('Raw contract result:', result);
        
        // // The result should be an object with the Agent struct fields
        // // We know config is the third field in the struct
        // let config;
        // if (result && typeof result === 'object') {
        //     if ('config' in result) {
        //         config = result.config;
        //     } else if (Array.isArray(result)) {
        //         config = result[2];
        //     }
        // }
        
        // if (typeof config !== 'string') {
        //     throw new Error('Invalid config data received from contract');
        // }
        
        // // Extract IPFS hash from config URL
        // const configUrl = config;
        // console.log(`📋 Agent config URL: ${configUrl}`);
        
        // const ipfsHash = configUrl.split('/ipfs/')[1];
        // if (!ipfsHash) {
        //     throw new Error('Invalid IPFS URL format');
        // }
        
        // // Fetch character data from IPFS
        // console.log(`📥 Fetching character data from IPFS (hash: ${ipfsHash})...`);
        // const characterJson = await fetchIPFSData(ipfsHash);
        
        // // Parse and validate character data
        // const characterData = JSON.parse(characterJson);
        // if (!characterData.name || !characterData.personality) {
        //     throw new Error('Invalid character data format');
        // }
        
        // console.log(`✅ Successfully fetched character data for "${characterData.name}"`);
        return characterData;
    } catch (error) {
        console.error('❌ Error fetching agent character:', error);
        throw error;
    }
} 