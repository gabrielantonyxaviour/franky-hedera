import { PrivateKey } from "@hashgraph/sdk";

export type HederaKeyParams = {
    key: string;
    keyType: string;
};

export type HederaPrivateKeyResult = {
    privateKey: PrivateKey;
    type: "ECDSA" | "ED25519";
};

export type AccountData = {
    accountId: string;
    privateKey: string;
    publicKey: string;
};

export const hederaPrivateKeyFromString = ({
    key,
    keyType,
}: HederaKeyParams): HederaPrivateKeyResult => {
    let privateKey: PrivateKey;

    try {
        if (keyType === "ECDSA") {
            privateKey = PrivateKey.fromStringECDSA(key); // works with both 'HEX Encoded Private Key' and 'DER Encoded Private Key' for ECDSA
        } else if (keyType === "ED25519") {
            privateKey = PrivateKey.fromStringED25519(key); // works with both 'HEX Encoded Private Key' and 'DER Encoded Private Key' for ED25519
        } else {
            throw new Error(
                "Unsupported key type. Must be 'ECDSA' or 'ED25519'."
            );
        }
    } catch (error: any) {
        throw new Error(`Invalid private key or key type: ${error.message}`);
    }

    return { privateKey, type: keyType };
};
