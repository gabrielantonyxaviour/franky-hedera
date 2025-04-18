import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_NETWORK } from "@lit-protocol/constants";
import { encryptString } from "@lit-protocol/encryption";
import { Address } from "viem";

const FRANKY_ADDRESS: Address = '0xdCc8fd3c55215e32EcD6660B0599860b7A58aBa9'

export async function encrypt(dataToEncrypt: string, isMainnet: boolean): Promise<{
    ciphertext: string;
    dataToEncryptHash: string;
}> {
    const litNodeClient = new LitNodeClient({
        litNetwork: LIT_NETWORK.DatilDev,
        debug: false,
    });

    await litNodeClient.connect();
    console.log("Connected to Lit Network");

    const evmContractConditions = [
        {
            contractAddress: FRANKY_ADDRESS,
            chain: isMainnet ? "base" : "baseSepolia",
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
                inputs: [

                ],
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
}