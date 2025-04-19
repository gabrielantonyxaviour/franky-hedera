import { createPublicClient, Hex, hexToBytes, http } from 'viem';
import { base58 } from '@scure/base';
import { base, baseSepolia } from 'viem/chains';

// Updated contract address for Base Mainnet
const FRANKY_ADDRESS = '0x486989cd189ED5DB6f519712eA794Cee42d75b29';

const abi = [{
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

/**
 * Generates an API key for the given agent address
 * @param agentAddress - The address of the agent to generate a key for
 * @param account - The user's wallet account
 * @param isMainnet - Whether to use mainnet or testnet
 * @param signer - Optional signer function for environments where account.signMessage isn't available
 * @returns Promise<string> - The generated API key
 */
export async function getApiKey(
    agentAddress: string, 
    account: any, 
    isMainnet = false, 
    signer?: (message: string) => Promise<`0x${string}`>
): Promise<string> {
    console.log('getApiKey called with:', {
        agentAddress,
        account,
        isMainnet,
        hasSigner: !!signer
    });

    // Use the appropriate contract address based on network
    const contractAddress = FRANKY_ADDRESS;
    console.log(`Using contract address: ${contractAddress} on ${isMainnet ? 'mainnet' : 'testnet'}`);

    const client = createPublicClient({
        chain: isMainnet ? base : baseSepolia,
        transport: http()
    });
    
    console.log('Fetching key hash from contract...');
    try {
        const keyHash = await client.readContract({
            address: contractAddress as `0x${string}`,
            abi: abi,
            functionName: 'getKeyHash',
            args: [agentAddress as `0x${string}`]
        });
        console.log('Key hash received:', keyHash);
        
        const messageHash = keyHash as Hex;
        if (!messageHash.startsWith("0x")) {
            throw new Error("Message hash must be a hex string starting with 0x");
        }

        if (messageHash.length !== 66) { // 0x + 64 chars
            throw new Error("Message hash must be a bytes32 value (32 bytes / 64 hex chars)");
        }

        console.log('Preparing to sign message hash:', messageHash);
        let signature: `0x${string}`;
        
        try {
            // Use provided signer function if available
            if (signer) {
                console.log('Using provided signer function');
                signature = await signer(messageHash);
            } 
            // Try various signing methods depending on what's available on the account object
            else if (typeof account.signMessage === 'function') {
                console.log('Using viem Account signMessage');
                // For viem Account objects
                signature = await account.signMessage({
                    message: messageHash,
                });
            } 
            else if (account.signMessage && typeof account.signMessage === 'object') {
                console.log('Using wagmi useSignMessage hook');
                // For wagmi useSignMessage hook result
                const signMessageFn = account.signMessage.signMessage || account.signMessage;
                signature = await signMessageFn({
                    message: messageHash,
                });
            } 
            else {
                throw new Error("No valid signing method found on the provided account");
            }
            
            console.log('Message successfully signed:', signature);
        } catch (error) {
            console.error('Error during message signing:', error);
            throw error;
        }

        const apiKey = base58.encode(hexToBytes(signature));
        console.log('API key generated:', apiKey);
        return apiKey;
    } catch (error: any) {
        console.error('Error getting key hash from contract:', error);
        throw new Error(`Failed to generate API key: ${error.message}`);
    }
} 