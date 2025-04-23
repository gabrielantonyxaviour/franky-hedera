import { createPublicClient, Hex, hexToBytes, http } from 'viem';
import { base58 } from '@scure/base';
import { base, baseSepolia, filecoinCalibration } from 'viem/chains';
import { SignMessageModalUIOptions } from '@privy-io/react-auth';
import { FRANKY_ABI } from '@/lib/constants';

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
    caller: Hex,
    signMessage: (input: {
        message: string;
    }, options?: {
        uiOptions?: SignMessageModalUIOptions;
        address?: string;
    }) => Promise<{
        signature: string;
    }>,
): Promise<string> {
    console.log('getApiKey called with:', {
        agentAddress,
        caller,
    });

    // Use the appropriate contract address based on network
    const contractAddress = FRANKY_ADDRESS;
    console.log(`Using contract address: ${contractAddress} on Filecoin Calibration Testnet`);

    const client = createPublicClient({
        chain: filecoinCalibration,
        transport: http()
    });

    console.log('Fetching key hash from contract...');
    try {
        console.log([agentAddress as `0x${string}`, caller as `0x${string}`])
        const keyHash = await client.readContract({
            address: FRANKY_ADDRESS as `0x${string}`,
            abi: FRANKY_ABI,
            functionName: 'getKeyHash',
            args: [agentAddress as `0x${string}`, caller as `0x${string}`],
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

        try {
            const { signature } = await signMessage({
                message: messageHash,
            }, {
                uiOptions: {
                    title: "Generating API Key"
                }
            });

            console.log('Message successfully signed:', signature);
            const apiKey = base58.encode(hexToBytes(signature as Hex));
            console.log('API key generated:', apiKey);
            return apiKey;
        } catch (error) {
            console.error('Error during message signing:', error);
            throw error;
        }


    } catch (error: any) {
        console.error('Error getting key hash from contract:', error);
        throw new Error(`Failed to generate API key: ${error.message}`);
    }
} 