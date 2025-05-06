"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaAirdropTokenTool = void 0;
const tools_1 = require("@langchain/core/tools");
class HederaAirdropTokenTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_airdrop_token';
        this.description = `Airdrop fungible tokens to multiple accounts on Hedera
Inputs (input is a JSON string):
tokenId: string, the ID of the token to airdrop e.g. 0.0.123456,
recipients: array of objects containing:
  - accountId: string, the account ID to send tokens to e.g. 0.0.789012
  - amount: number, the amount of tokens to send e.g. 100
Example usage:
1. Airdrop 100 tokens to account 0.0.789012 and 200 tokens to account 0.0.789013:
  '{
    "tokenId": "0.0.123456",
    "recipients": [
    {"accountId": "0.0.789012", "amount": 100},
    {"accountId": "0.0.789013", "amount": 200}
  ]
}'
`;
    }
    async _call(input, _runManager, config) {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            console.log(`hedera_airdrop_token tool has been called (${isCustodial ? 'custodial' : 'non-custodial'})`);
            const parsedInput = JSON.parse(input);
            return await this.hederaKit
                .airdropToken(parsedInput.tokenId, parsedInput.recipients, isCustodial)
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
exports.HederaAirdropTokenTool = HederaAirdropTokenTool;
