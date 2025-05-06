"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaMintNFTTool = void 0;
const tools_1 = require("@langchain/core/tools");
class HederaMintNFTTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_mint_nft';
        this.description = `Mint an NFT to an account on Hedera
Inputs (input is a JSON string):
tokenId: string, the ID of the token to mint e.g. 0.0.123456,
tokenMetadata: string, the metadata of the NFT e.g. "My NFT",
Example usage:
1. Mint an NFT with metadata "My NFT" to token 0.0.123456:
  '{
    "tokenId": "0.0.123456",
    "tokenMetadata": "My NFT"
  }'
`;
    }
    async _call(input, _runManager, config) {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            console.log(`hedera_mint_nft tool has been called (${isCustodial ? 'custodial' : 'non-custodial'})`);
            const parsedInput = JSON.parse(input);
            return await this.hederaKit
                .mintNFTToken(parsedInput.tokenId, parsedInput.tokenMetadata, isCustodial) //FIXME:shouldn't the metadata be passed encoded?
                .then(response => response.getStringifiedResponse());
        }
        catch (error) {
            return JSON.stringify({
                status: "error",
                message: error.message,
                code: error.code || "UNKNOWN_ERROR",
            });
        }
    }
}
exports.HederaMintNFTTool = HederaMintNFTTool;
