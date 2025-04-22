import { base58 } from "@scure/base";
import { bytesToHex, createPublicClient, http, recoverMessageAddress } from "viem";
import { base, baseSepolia } from 'viem/chains';
// import { FRANKY_ABI } from "../constants";

// Hardcoded contract address
const FRANKY_ADDRESS = '0x486989cd189ED5DB6f519712eA794Cee42d75b29';

// ABI for checking ownership
const FRANKY_ABI = [{"inputs":[{"internalType":"address","name":"_frankyAgentAccountImplemetation","type":"address"},{"internalType":"address","name":"_frankyToken","type":"address"},{"internalType":"uint32","name":"_protocolFeeInBps","type":"uint32"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"FailedDeployment","type":"error"},{"inputs":[{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"name":"InsufficientBalance","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"agentAddress","type":"address"},{"indexed":true,"internalType":"address","name":"deviceAddress","type":"address"},{"indexed":false,"internalType":"string","name":"avatar","type":"string"},{"indexed":false,"internalType":"string","name":"subname","type":"string"},{"indexed":false,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"uint256","name":"perApiCallFee","type":"uint256"},{"indexed":false,"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"personality","type":"string"},{"internalType":"string","name":"scenario","type":"string"},{"internalType":"string","name":"first_mes","type":"string"},{"internalType":"string","name":"mes_example","type":"string"},{"internalType":"string","name":"creatorcomment","type":"string"},{"internalType":"string","name":"tags","type":"string"},{"internalType":"string","name":"talkativeness","type":"string"}],"indexed":false,"internalType":"struct Character","name":"characterConfig","type":"tuple"},{"indexed":false,"internalType":"string","name":"secrets","type":"string"},{"indexed":false,"internalType":"bool","name":"isPublic","type":"bool"}],"name":"AgentCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"agentAddress","type":"address"},{"indexed":false,"internalType":"bytes32","name":"keyHash","type":"bytes32"}],"name":"ApiKeyRegenerated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"deviceAddress","type":"address"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"string","name":"deviceModel","type":"string"},{"indexed":false,"internalType":"string","name":"ram","type":"string"},{"indexed":false,"internalType":"string","name":"storageCapacity","type":"string"},{"indexed":false,"internalType":"string","name":"cpu","type":"string"},{"indexed":false,"internalType":"string","name":"ngrokLink","type":"string"},{"indexed":false,"internalType":"uint256","name":"hostingFee","type":"uint256"}],"name":"DeviceRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"frankyENSRegistrar","type":"address"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"deviceAddress","type":"address"},{"indexed":true,"internalType":"address","name":"metalUserAddress","type":"address"}],"name":"MetalWalletConfigured","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"agents","outputs":[{"internalType":"address","name":"agentAddress","type":"address"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"string","name":"subname","type":"string"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"personality","type":"string"},{"internalType":"string","name":"scenario","type":"string"},{"internalType":"string","name":"first_mes","type":"string"},{"internalType":"string","name":"mes_example","type":"string"},{"internalType":"string","name":"creatorcomment","type":"string"},{"internalType":"string","name":"tags","type":"string"},{"internalType":"string","name":"talkativeness","type":"string"}],"internalType":"struct Character","name":"characterConfig","type":"tuple"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"perApiCallFee","type":"uint256"},{"internalType":"uint8","name":"status","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"agentsCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"agentsKeyHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"caller","type":"address"},{"internalType":"address","name":"agentAddress","type":"address"}],"name":"allowApiCall","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"checkAvailableCredits","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"metalUserAddress","type":"address"}],"name":"configureMetalWallet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"subname","type":"string"},{"internalType":"string","name":"avatar","type":"string"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"personality","type":"string"},{"internalType":"string","name":"scenario","type":"string"},{"internalType":"string","name":"first_mes","type":"string"},{"internalType":"string","name":"mes_example","type":"string"},{"internalType":"string","name":"creatorcomment","type":"string"},{"internalType":"string","name":"tags","type":"string"},{"internalType":"string","name":"talkativeness","type":"string"}],"internalType":"struct Character","name":"characterConfig","type":"tuple"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"uint256","name":"perApiCallFee","type":"uint256"},{"internalType":"bool","name":"isPublic","type":"bool"}],"name":"createAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"deviceAgents","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"deviceRegistered","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"devices","outputs":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"uint256","name":"hostingFee","type":"uint256"},{"internalType":"uint256","name":"agentCount","type":"uint256"},{"internalType":"bool","name":"isRegistered","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"devicesCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"frankyAgentAccountImplemetation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"frankyENSRegistrar","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"frankyToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"agentAddress","type":"address"}],"name":"getAgent","outputs":[{"components":[{"internalType":"address","name":"agentAddress","type":"address"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"string","name":"subname","type":"string"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"personality","type":"string"},{"internalType":"string","name":"scenario","type":"string"},{"internalType":"string","name":"first_mes","type":"string"},{"internalType":"string","name":"mes_example","type":"string"},{"internalType":"string","name":"creatorcomment","type":"string"},{"internalType":"string","name":"tags","type":"string"},{"internalType":"string","name":"talkativeness","type":"string"}],"internalType":"struct Character","name":"characterConfig","type":"tuple"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"perApiCallFee","type":"uint256"},{"internalType":"uint8","name":"status","type":"uint8"}],"internalType":"struct Franky.Agent","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"deviceAddress","type":"address"}],"name":"getDevice","outputs":[{"components":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"uint256","name":"hostingFee","type":"uint256"},{"internalType":"uint256","name":"agentCount","type":"uint256"},{"internalType":"bool","name":"isRegistered","type":"bool"}],"internalType":"struct Franky.Device","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"agentAddress","type":"address"}],"name":"getKeyHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getRandomBytes32","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"salt","type":"bytes32"}],"name":"getSmartAccountAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_frankyENSRegistrar","type":"address"}],"name":"intialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"deviceAddress","type":"address"}],"name":"isDeviceOwned","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"deviceAddress","type":"address"}],"name":"isDeviceRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"agentAddress","type":"address"}],"name":"isHostingAgent","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"ownerDevices","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"protocolFeeInBps","outputs":[{"internalType":"uint32","name":"","type":"uint32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_hash","type":"bytes32"},{"internalType":"bytes","name":"_signature","type":"bytes"}],"name":"recoverSigner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"agentAddress","type":"address"}],"name":"regenerateApiKey","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"uint256","name":"hostingFee","type":"uint256"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"bytes32","name":"verificationHash","type":"bytes32"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"registerDevice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"reownToMetal","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}];

// ABI for getting the key hash
const keyHashAbi = [{
    "inputs": [
        {
            "internalType": "address",
            "name": "agentAddress",
            "type": "address"
        }
    ],
    "name": "getKeyHash",
    "outputs": [
        {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
        }
    ],
    "stateMutability": "view",
    "type": "function"
}];

const isMainnet = false;

// Function to fetch agent details including keyHash
async function fetchAgentDetails(agentAddress) {
    console.log(`\n🔍 Fetching agent details for: ${agentAddress}`);
    try {
        const response = await fetch(`https://www.frankyagent.xyz/api/graph/agent?address=${agentAddress}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch agent details: ${response.status}`);
        }
        const agentData = await response.json();
        console.log(`✅ Successfully fetched agent details`);
        return agentData;
    } catch (error) {
        console.error(`❌ Error fetching agent details: ${error.message}`);
        throw error;
    }
}

async function recoverApiKey(apiKey, agentAddress) {
    console.log("\n--- Recovering API Key ---");
    console.log(`API Key: ${apiKey}`);
    console.log(`Agent address: ${agentAddress}`);

    // Fetch agent details to get the correct keyHash
    const agentDetails = await fetchAgentDetails(agentAddress);
    const keyHash = agentDetails.keyHash;
    console.log(`Using keyHash: ${keyHash}`);
    
    // Decode base58 API key to get the original signature
    console.log("Decoding API key...");
    const bytes = base58.decode(apiKey);
    const signature = bytesToHex(bytes);
    console.log(`Signature: ${signature.substring(0, 10)}...${signature.substring(signature.length - 10)}`);
    
    // Recover the signing address using the fetched keyHash
    console.log("Recovering address...");
    const address = await recoverMessageAddress({
        message: keyHash,
        signature
    });
    console.log(`Recovered address: ${address}`);
    
    // Check if the recovered address matches either the owner or their server wallet
    const isOwner = address.toLowerCase() === agentDetails.owner.id.toLowerCase();
    const isServerWallet = address.toLowerCase() === agentDetails.owner.serverWalletAddress.toLowerCase();
    
    return {
        address,
        isOwner,
        isServerWallet,
        ownerAddress: agentDetails.owner.id,
        serverWalletAddress: agentDetails.owner.serverWalletAddress
    };
}

export async function isCallerOwner(agentAddress, apiKey) {
    console.log("\n--- Checking Ownership ---");
    const client = createPublicClient({
        chain: isMainnet ? base : baseSepolia,
        transport: http()
    });
    
    try {
        // Recover the address from the API key and check ownership
        const {
            address,
            isOwner,
            isServerWallet,
            ownerAddress,
            serverWalletAddress
        } = await recoverApiKey(apiKey, agentAddress);
        
        console.log("Checking permissions...");
        console.log(`Caller Address: ${address}`);
        console.log(`Owner Address: ${ownerAddress}`);
        console.log(`Server Wallet Address: ${serverWalletAddress}`);
        console.log(`Is Owner: ${isOwner}`);
        console.log(`Is Server Wallet: ${isServerWallet}`);
        
        // If the caller is either the owner or their server wallet, they have full access
        if (isOwner || isServerWallet) {
            return { status: 2, caller: address };
        }
        
        // Otherwise, check if they have API call permission
        const isCallerAllowed = Boolean(await client.readContract({
            address: FRANKY_ADDRESS,
            abi: FRANKY_ABI,
            functionName: 'allowApiCall',
            args: [address, agentAddress]
        }));
        
        console.log(`API Call Permission: ${isCallerAllowed}`);
        return { status: isCallerAllowed ? 1 : 0, caller: address };
        
    } catch (error) {
        console.error(`Verification failed: ${error.message}`);
        // No fallback - if we can't verify, we deny access
        return { status: 0, caller: null };
    }
} 