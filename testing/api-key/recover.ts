import { base58 } from "@scure/base";
import { Address, bytesToHex, createPublicClient, http, recoverMessageAddress, zeroHash } from "viem";
import { base, baseSepolia } from 'viem/chains'

const FRANKY_ADDRESS: Address = '0xdCc8fd3c55215e32EcD6660B0599860b7A58aBa9'
const abi = [{
    "inputs": [
        {
            "internalType": "address",
            "name": "owner",
            "type": "address"
        },
        {
            "internalType": "uint256",
            "name": "agentId",
            "type": "uint256"
        }
    ],
    "name": "isAgentOwned",
    "outputs": [
        {
            "internalType": "bool",
            "name": "",
            "type": "bool"
        }
    ],
    "stateMutability": "view",
    "type": "function"
}]
const isMainnet = false


async function recoverApiKey(apiKey: string): Promise<Address> {
    const bytes = base58.decode(apiKey);
    const signature = bytesToHex(bytes);
    const address = await recoverMessageAddress({
        message: zeroHash,
        signature
    })


    return address;
}

export async function isCallerOwner(agentId: string, apiKey: string): Promise<boolean> {
    const client = createPublicClient({
        chain: isMainnet ? base : baseSepolia,
        transport: http()
    });
    const isOwner = await client.readContract({
        address: FRANKY_ADDRESS,
        abi: abi,
        functionName: 'isAgentOwned',
        args: [BigInt(agentId), await recoverApiKey(apiKey)]
    });
    return isOwner as boolean;
}
