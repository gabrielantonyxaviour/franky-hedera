import { base58 } from "@scure/base";
import { bytesToHex, createPublicClient, http, recoverMessageAddress } from "viem";
import { base, baseSepolia } from 'viem/chains';

// Hardcoded contract address
const FRANKY_ADDRESS = '0x486989cd189ED5DB6f519712eA794Cee42d75b29';

// ABI for checking ownership
const ownershipAbi = [{
    "inputs": [
        {
            "internalType": "address",
            "name": "caller",
            "type": "address"
        },
        {
            "internalType": "address",
            "name": "agentAddress",
            "type": "address"
        }
    ],
    "name": "allowApiCall",
    "outputs": [
        {
            "internalType": "bool",
            "name": "",
            "type": "bool"
        }
    ],
    "stateMutability": "view",
    "type": "function"
}];

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

async function recoverApiKey(apiKey, agentAddress, ownerKeyHash) {
    console.log("\n--- Recovering API Key ---");
    console.log(`API Key: ${apiKey}`);
    console.log(`Agent address: ${agentAddress}`);

    const keyHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
    
    // Create client for contract interaction
    const client = createPublicClient({
        chain: isMainnet ? base : baseSepolia,
        transport: http()
    });
    
    // Decode base58 API key to get the original signature
    console.log("Decoding API key...");
    const bytes = base58.decode(apiKey);
    const signature = bytesToHex(bytes);
    console.log(`Signature: ${signature.substring(0, 10)}...${signature.substring(signature.length - 10)}`);
    
    // Recover the signing address using the correct key hash
    console.log("Recovering address...");
    const address = await recoverMessageAddress({
        message: keyHash,
        signature
    });
    const ownerAddress = await recoverMessageAddress({
        message: ownerKeyHash,
        signature
    });
    console.log(`Recovered address: ${address}`);
    console.log(`Owner address: ${ownerAddress}`);

    return {address, ownerAddress};
}

export async function isCallerOwner(agentAddress, apiKey, ownerKeyHash) {
    console.log("\n--- Checking Ownership ---");
    const client = createPublicClient({
        chain: isMainnet ? base : baseSepolia,
        transport: http()
    });
    
    // Recover the address from the API key
    const {address, ownerAddress} = await recoverApiKey(apiKey, agentAddress, ownerKeyHash);
    
    // Check if this address is the owner of the agent
    console.log("Checking if address is owner...");
    console.log(`Caller Address: ${address}`);
    console.log(`Owner Address: ${ownerAddress}`);
    console.log(`Agent ID: ${agentAddress}`);
    const isCallerUser = await client.readContract({
        address: FRANKY_ADDRESS,
        abi: ownershipAbi,
        functionName: 'allowApiCall',
        args: [address, agentAddress]
    });

    const isCallerOwner = await client.readContract({
        address: FRANKY_ADDRESS,
        abi: ownershipAbi,
        functionName: 'isAgentOwned',
        args: [ownerAddress, agentAddress]
    });

    return isCallerUser ? 1 : isCallerOwner ? 2 : 0;
} 