import { createPublicClient, Hex, hexToBytes, http } from 'viem';
import { base58 } from '@scure/base';
import { base, baseSepolia } from 'viem/chains';

const FRANKY_ADDRESS = '0xA150363e58bF57363fBce25d40e98AC59bCc8E85';
const abi = [{
    "inputs": [
        {
            "internalType": "uint256",
            "name": "agentId",
            "type": "uint256"
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
 * Generates an API key for the given agent ID
 * @param agentId - The ID of the agent to generate a key for
 * @param account - The user's wallet account
 * @param isMainnet - Whether to use mainnet or testnet
 * @param signer - Optional signer function for environments where account.signMessage isn't available
 * @returns Promise<string> - The generated API key
 */
export async function getApiKey(
    agentId: string, 
    account: any, 
    isMainnet = false, 
    signer?: (message: string) => Promise<`0x${string}`>
): Promise<string> {
    const client = createPublicClient({
        chain: isMainnet ? base : baseSepolia,
        transport: http()
    });
    
    const keyHash = await client.readContract({
        address: FRANKY_ADDRESS as `0x${string}`,
        abi: abi,
        functionName: 'getKeyHash',
        args: [BigInt(agentId)]
    });
    
    const messageHash = keyHash as Hex;
    if (!messageHash.startsWith("0x")) {
        throw new Error("Message hash must be a hex string starting with 0x");
    }

    if (messageHash.length !== 66) { // 0x + 64 chars
        throw new Error("Message hash must be a bytes32 value (32 bytes / 64 hex chars)");
    }

    let signature: `0x${string}`;
    
    // Use provided signer function if available
    if (signer) {
        signature = await signer(messageHash);
    } 
    // Try various signing methods depending on what's available on the account object
    else if (typeof account.signMessage === 'function') {
        // For viem Account objects
        signature = await account.signMessage({
            message: messageHash,
        });
    } 
    else if (account.signMessage && typeof account.signMessage === 'object') {
        // For wagmi useSignMessage hook result
        const signMessageFn = account.signMessage.signMessage || account.signMessage;
        signature = await signMessageFn({
            message: messageHash,
        });
    } 
    else {
        throw new Error("No valid signing method found on the provided account");
    }

    return base58.encode(hexToBytes(signature));
} 