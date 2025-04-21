import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_NETWORK } from "@lit-protocol/constants";
import { encryptString } from "@lit-protocol/encryption";
import { Address } from "viem";
import { FRANKY_ADDRESS } from "@/lib/constants";

export async function encrypt(dataToEncrypt: string, isMainnet: boolean): Promise<{
    ciphertext: string;
    dataToEncryptHash: string;
}> {
    try {
        const litNodeClient = new LitNodeClient({
            litNetwork: LIT_NETWORK.DatilDev,
            debug: false,
        });

        await litNodeClient.connect();
        console.log("Connected to Lit Network");

        const evmContractConditions = [
            {
                contractAddress: FRANKY_ADDRESS,
                chain: "filecoinCalibrationTestnet",
                functionName: "isRegisteredDevice",
                functionParams: [],
                functionAbi: {
                    stateMutability: "view",
                    type: "function",
                    outputs: [
                        {
                            type: "bool",
                            name: "",
                        },
                    ],
                    name: "isRegisteredDevice",
                    inputs: [],
                },
                returnValueTest: {
                    key: "",
                    comparator: "=",
                    value: "true",
                },
            },
        ];

        const { ciphertext, dataToEncryptHash } = await encryptString(
            {
                evmContractConditions: evmContractConditions as any,
                dataToEncrypt,
            },
            litNodeClient
        );

        console.log("Ciphertext:", ciphertext);
        console.log("Data to encrypt hash:", dataToEncryptHash);
        return { ciphertext, dataToEncryptHash };
    } catch (error) {
        console.error("Error encrypting with Lit Protocol:", error);
        throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
} 