"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaMintFungibleTokenTool = void 0;
const tools_1 = require("@langchain/core/tools");
class HederaMintFungibleTokenTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_mint_fungible_token';
        this.description = `Mint fungible tokens to an account on Hedera
Inputs (input is a JSON string):
tokenId: string, the ID of the token to mint e.g. 0.0.123456,
amount: number, the amount of tokens to mint e.g. 100,
Example usage:
1. Mint 100 of token 0.0.123456 to account 0.0.789012:
  '{
    "tokenId": "0.0.123456",
    "amount": 100
  }'
`;
    }
    async _call(input, _runManager, config) {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            console.log(`hedera_mint_fungible_token tool has been called (${isCustodial ? 'custodial' : 'non-custodial'})`);
            const parsedInput = JSON.parse(input);
            return await this.hederaKit
                .mintToken(parsedInput.tokenId, parsedInput.amount, isCustodial)
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
exports.HederaMintFungibleTokenTool = HederaMintFungibleTokenTool;
