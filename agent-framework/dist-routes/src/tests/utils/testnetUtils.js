"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hederaPrivateKeyFromString = void 0;
const sdk_1 = require("@hashgraph/sdk");
const hederaPrivateKeyFromString = ({ key, keyType, }) => {
    let privateKey;
    try {
        if (keyType === "ECDSA") {
            privateKey = sdk_1.PrivateKey.fromStringECDSA(key); // works with both 'HEX Encoded Private Key' and 'DER Encoded Private Key' for ECDSA
        }
        else if (keyType === "ED25519") {
            privateKey = sdk_1.PrivateKey.fromStringED25519(key); // works with both 'HEX Encoded Private Key' and 'DER Encoded Private Key' for ED25519
        }
        else {
            throw new Error("Unsupported key type. Must be 'ECDSA' or 'ED25519'.");
        }
    }
    catch (error) {
        throw new Error(`Invalid private key or key type: ${error.message}`);
    }
    return { privateKey, type: keyType };
};
exports.hederaPrivateKeyFromString = hederaPrivateKeyFromString;
