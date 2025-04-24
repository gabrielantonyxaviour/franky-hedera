import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_ABILITY, LIT_NETWORK, LIT_RPC } from "@lit-protocol/constants";
import { decryptToString, encryptString } from "@lit-protocol/encryption";
import {
    createSiweMessage,
    generateAuthSig,
    LitAccessControlConditionResource,
} from "@lit-protocol/auth-helpers";
import { FRANKY_ADDRESS } from "@/lib/constants";
import { ethers } from "ethers"

export async function encryptEnv(dataToEncrypt: string): Promise<{
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
                chain: "hederaTestnet",
                functionName: "isRegisteredDevice",
                functionParams: [":userAddress"],
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
                        {
                            type: 'address',
                            name: "caller"
                        }
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
    } catch (error) {
        console.error("Error encrypting with Lit Protocol:", error);
        throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}


export async function encryptServerWallet(serverWalletAddress: string, privateKey: string): Promise<{
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
                chain: "hederaTestnet",
                functionName: "canDecryptServerWallet",
                functionParams: [":userAddress", serverWalletAddress],
                functionAbi: {
                    stateMutability: "view",
                    type: "function",
                    outputs: [
                        {
                            type: "bool",
                            name: "",
                        },
                    ],
                    name: "canDecryptServerWallet",
                    inputs: [
                        {
                            type: 'address',
                            name: "caller"
                        },
                        {
                            type: "address",
                            name: "serverWalletAddress"
                        }
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
                dataToEncrypt: privateKey,
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

export async function decryptEnv(
    ethersWallet: ethers.Wallet,
    ciphertext: string,
    dataHash: string
): Promise<{
    decryptedData: string;
    error: string;
}> {
    const litNodeClient = new LitNodeClient({
        litNetwork: LIT_NETWORK.DatilDev,
        debug: false,
    });

    // const ethersWallet = new ethers.Wallet(
    //     privateKey,
    //     new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    // );

    const evmContractConditions = [
        {
            contractAddress: FRANKY_ADDRESS,
            chain: "hederaTestnet",
            functionName: "isRegisteredDevice",
            functionParams: [":userAddress"],
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
                    {
                        type: 'address',
                        name: "caller"
                    }
                ],
            },
            returnValueTest: {
                key: "",
                comparator: "=",
                value: "true",
            },
        },
    ];
    await litNodeClient.connect();
    console.log("Connected to Lit Network");

    console.log("Generating session sigs");

    const sessionSigs = await litNodeClient.getSessionSigs({
        chain: 'hederaTestnet',
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
        resourceAbilityRequests: [
            {
                resource: new LitAccessControlConditionResource(
                    await LitAccessControlConditionResource.generateResourceString(
                        evmContractConditions as any,
                        dataHash
                    )
                ),
                ability: LIT_ABILITY.AccessControlConditionDecryption,
            },
        ],
        authNeededCallback: async ({
            uri,
            expiration,
            resourceAbilityRequests,
        }) => {
            const toSign = await createSiweMessage({
                uri,
                expiration,
                resources: resourceAbilityRequests,
                walletAddress: ethersWallet.address,
                nonce: await litNodeClient.getLatestBlockhash(),
                litNodeClient,
            });

            return await generateAuthSig({
                signer: ethersWallet,
                toSign,
            });
        },
    });

    try {
        const decryptionResult = await decryptToString(
            {
                chain: 'hederaTestnet',
                ciphertext,
                dataToEncryptHash: dataHash,
                evmContractConditions: evmContractConditions as any,
                sessionSigs,
            },
            litNodeClient
        );

        console.log(decryptionResult);

        return {
            decryptedData: decryptionResult,
            error: "",
        };
    } catch (e: any) {
        return {
            decryptedData: "",
            error: e,
        };
    }
}


export async function decryptServerWallet(ethersWallet: ethers.Wallet, serverWalletAddress: string,
    ciphertext: string,
    dataHash: string): Promise<{
        decryptedData: string;
        error: string;
    }> {
    const litNodeClient = new LitNodeClient({
        litNetwork: LIT_NETWORK.DatilDev,
        debug: false,
    });

    // const ethersWallet = new ethers.Wallet(
    //     privateKey,
    //     new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    // );

    const evmContractConditions = [
        {
            contractAddress: FRANKY_ADDRESS,
            chain: "hederaTestnet",
            functionName: "canDecryptServerWallet",
            functionParams: [":userAddress", serverWalletAddress],
            functionAbi: {
                stateMutability: "view",
                type: "function",
                outputs: [
                    {
                        type: "bool",
                        name: "",
                    },
                ],
                name: "canDecryptServerWallet",
                inputs: [
                    {
                        type: 'address',
                        name: "caller"
                    },
                    {
                        type: "address",
                        name: "serverWalletAddress"
                    }
                ],
            },
            returnValueTest: {
                key: "",
                comparator: "=",
                value: "true",
            },
        },
    ];
    await litNodeClient.connect();
    console.log("Connected to Lit Network");

    console.log("Generating session sigs");

    const sessionSigs = await litNodeClient.getSessionSigs({
        chain: 'hederaTestnet',
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
        resourceAbilityRequests: [
            {
                resource: new LitAccessControlConditionResource(
                    await LitAccessControlConditionResource.generateResourceString(
                        evmContractConditions as any,
                        dataHash
                    )
                ),
                ability: LIT_ABILITY.AccessControlConditionDecryption,
            },
        ],
        authNeededCallback: async ({
            uri,
            expiration,
            resourceAbilityRequests,
        }) => {
            const toSign = await createSiweMessage({
                uri,
                expiration,
                resources: resourceAbilityRequests,
                walletAddress: ethersWallet.address,
                nonce: await litNodeClient.getLatestBlockhash(),
                litNodeClient,
            });

            return await generateAuthSig({
                signer: ethersWallet,
                toSign,
            });
        },
    });

    try {
        const decryptionResult = await decryptToString(
            {
                chain: 'hederaTestnet',
                ciphertext,
                dataToEncryptHash: dataHash,
                evmContractConditions: evmContractConditions as any,
                sessionSigs,
            },
            litNodeClient
        );

        console.log(decryptionResult);

        return {
            decryptedData: decryptionResult,
            error: "",
        };
    } catch (e: any) {
        return {
            decryptedData: "",
            error: e,
        };
    }
}