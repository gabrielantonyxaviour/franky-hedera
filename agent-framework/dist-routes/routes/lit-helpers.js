"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptEnv = encryptEnv;
exports.encryptServerWallet = encryptServerWallet;
exports.decryptEnv = decryptEnv;
exports.decryptServerWallet = decryptServerWallet;
const lit_node_client_1 = require("@lit-protocol/lit-node-client");
const constants_1 = require("@lit-protocol/constants");
const encryption_1 = require("@lit-protocol/encryption");
const auth_helpers_1 = require("@lit-protocol/auth-helpers");
const constants_2 = require("./constants");
async function encryptEnv(dataToEncrypt) {
    try {
        const litNodeClient = new lit_node_client_1.LitNodeClient({
            litNetwork: constants_1.LIT_NETWORK.DatilDev,
            debug: false,
        });
        await litNodeClient.connect();
        console.log("Connected to Lit Network");
        const evmContractConditions = [
            {
                contractAddress: constants_2.FRANKY_ADDRESS,
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
        const { ciphertext, dataToEncryptHash } = await (0, encryption_1.encryptString)({
            evmContractConditions: evmContractConditions,
            dataToEncrypt,
        }, litNodeClient);
        console.log("Ciphertext:", ciphertext);
        console.log("Data to encrypt hash:", dataToEncryptHash);
        return { ciphertext, dataToEncryptHash };
    }
    catch (error) {
        console.error("Error encrypting with Lit Protocol:", error);
        throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function encryptServerWallet(serverWalletAddress, privateKey) {
    try {
        const litNodeClient = new lit_node_client_1.LitNodeClient({
            litNetwork: constants_1.LIT_NETWORK.DatilDev,
            debug: false,
        });
        await litNodeClient.connect();
        console.log("Connected to Lit Network");
        const evmContractConditions = [
            {
                contractAddress: constants_2.FRANKY_ADDRESS,
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
        const { ciphertext, dataToEncryptHash } = await (0, encryption_1.encryptString)({
            evmContractConditions: evmContractConditions,
            dataToEncrypt: privateKey,
        }, litNodeClient);
        console.log("Ciphertext:", ciphertext);
        console.log("Data to encrypt hash:", dataToEncryptHash);
        return { ciphertext, dataToEncryptHash };
    }
    catch (error) {
        console.error("Error encrypting with Lit Protocol:", error);
        throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function decryptEnv(ethersWallet, ciphertext, dataHash) {
    const litNodeClient = new lit_node_client_1.LitNodeClient({
        litNetwork: constants_1.LIT_NETWORK.DatilDev,
        debug: false,
    });
    // const ethersWallet = new ethers.Wallet(
    //     privateKey,
    //     new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    // );
    const evmContractConditions = [
        {
            contractAddress: constants_2.FRANKY_ADDRESS,
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
                resource: new auth_helpers_1.LitAccessControlConditionResource(await auth_helpers_1.LitAccessControlConditionResource.generateResourceString(evmContractConditions, dataHash)),
                ability: constants_1.LIT_ABILITY.AccessControlConditionDecryption,
            },
        ],
        authNeededCallback: async ({ uri, expiration, resourceAbilityRequests, }) => {
            const toSign = await (0, auth_helpers_1.createSiweMessage)({
                uri,
                expiration,
                resources: resourceAbilityRequests,
                walletAddress: ethersWallet.address,
                nonce: await litNodeClient.getLatestBlockhash(),
                litNodeClient,
            });
            return await (0, auth_helpers_1.generateAuthSig)({
                signer: ethersWallet,
                toSign,
            });
        },
    });
    try {
        const decryptionResult = await (0, encryption_1.decryptToString)({
            chain: 'hederaTestnet',
            ciphertext,
            dataToEncryptHash: dataHash,
            evmContractConditions: evmContractConditions,
            sessionSigs,
        }, litNodeClient);
        console.log(decryptionResult);
        return {
            decryptedData: decryptionResult,
            error: "",
        };
    }
    catch (e) {
        return {
            decryptedData: "",
            error: e,
        };
    }
}
async function decryptServerWallet(ethersWallet, serverWalletAddress, ciphertext, dataHash) {
    const litNodeClient = new lit_node_client_1.LitNodeClient({
        litNetwork: constants_1.LIT_NETWORK.DatilDev,
        debug: false,
    });
    // const ethersWallet = new ethers.Wallet(
    //     privateKey,
    //     new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    // );
    const evmContractConditions = [
        {
            contractAddress: constants_2.FRANKY_ADDRESS,
            chain: "hederaTestnet",
            functionName: "canDecryptServerWallet",
            functionParams: [":userAddress", serverWalletAddress.toLowerCase()],
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
    console.log("Decrypting server wallet for address:", serverWalletAddress.toLowerCase());
    console.log("Connected to Lit Network");
    console.log("Generating session sigs");
    const sessionSigs = await litNodeClient.getSessionSigs({
        chain: 'hederaTestnet',
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
        resourceAbilityRequests: [
            {
                resource: new auth_helpers_1.LitAccessControlConditionResource(await auth_helpers_1.LitAccessControlConditionResource.generateResourceString(evmContractConditions, dataHash)),
                ability: constants_1.LIT_ABILITY.AccessControlConditionDecryption,
            },
        ],
        authNeededCallback: async ({ uri, expiration, resourceAbilityRequests, }) => {
            const toSign = await (0, auth_helpers_1.createSiweMessage)({
                uri,
                expiration,
                resources: resourceAbilityRequests,
                walletAddress: ethersWallet.address,
                nonce: await litNodeClient.getLatestBlockhash(),
                litNodeClient,
            });
            return await (0, auth_helpers_1.generateAuthSig)({
                signer: ethersWallet,
                toSign,
            });
        },
    });
    try {
        const decryptionResult = await (0, encryption_1.decryptToString)({
            chain: 'hederaTestnet',
            ciphertext,
            dataToEncryptHash: dataHash,
            evmContractConditions: evmContractConditions,
            sessionSigs,
        }, litNodeClient);
        console.log(decryptionResult);
        return {
            decryptedData: decryptionResult,
            error: "",
        };
    }
    catch (e) {
        return {
            decryptedData: "",
            error: e,
        };
    }
}
