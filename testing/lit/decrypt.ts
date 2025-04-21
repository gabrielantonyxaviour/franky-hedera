import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_NETWORK, LIT_ABILITY, LIT_RPC } from "@lit-protocol/constants";
import { decryptToString } from "@lit-protocol/encryption";
import {
    createSiweMessage,
    generateAuthSig,
    LitAccessControlConditionResource,
} from "@lit-protocol/auth-helpers";
import { ethers } from "ethers";
import { Hash } from "viem";
import { Address } from "viem";

const FRANKY_ADDRESS: Address = '0xdCc8fd3c55215e32EcD6660B0599860b7A58aBa9'

export async function decrypt(
    privateKey: Hash,
    ciphertext: string,
    dataHash: string,
    isMainnet: boolean
): Promise<{
    decryptedData: string;
    error: string;
}> {
    const litNodeClient = new LitNodeClient({
        litNetwork: LIT_NETWORK.DatilDev,
        debug: false,
    });

    const ethersWallet = new ethers.Wallet(
        privateKey,
        new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    );
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
                inputs: [],
            },
            returnValueTest: {
                key: "",
                comparator: "=",
                value: "true",
            },
        },
    ];

    console.log("Generating session sigs");

    const sessionSigs = await litNodeClient.getSessionSigs({
        chain: isMainnet ? "base" : "baseSepolia",
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
                chain: isMainnet ? "base" : "baseSepolia",
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