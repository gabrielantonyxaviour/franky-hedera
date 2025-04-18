import { Account, Address, createPublicClient, Hex, hexToBytes, http } from 'viem';
import { base58 } from '@scure/base';
import dotenv from 'dotenv'
import { base, baseSepolia } from 'viem/chains'

dotenv.config();

const FRANKY_ADDRESS: Address = '0xdCc8fd3c55215e32EcD6660B0599860b7A58aBa9'
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
}]
const isMainnet = false

export async function getApiKey(agentId: string, account: Account): Promise<string> {
    const client = createPublicClient({
        chain: isMainnet ? base : baseSepolia,
        transport: http()
    });
    const keyHash = await client.readContract({
        address: FRANKY_ADDRESS,
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

    const signature = await account.signMessage!({
        message: messageHash,
    })

    return base58.encode(hexToBytes(signature));
}