"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaRejectTokenTool = void 0;
const tools_1 = require("@langchain/core/tools");
const sdk_1 = require("@hashgraph/sdk");
class HederaRejectTokenTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_reject_token';
        this.description = `Reject a token from an account on Hedera
Inputs (input is a JSON string):
tokenId: string, the ID of the token to reject e.g. 0.0.123456,
Example usage:
1. Reject token 0.0.123456:
  '{
    "tokenId": "0.0.123456"
  }'
`;
    }
    async _call(input, _runManager, config) {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            console.log(`hedera_reject_token tool has been called (${isCustodial ? 'custodial' : 'non-custodial'})`);
            const parsedInput = JSON.parse(input);
            const tokenId = sdk_1.TokenId.fromString(parsedInput.tokenId);
            return this.hederaKit
                .rejectToken(tokenId, isCustodial)
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
exports.HederaRejectTokenTool = HederaRejectTokenTool;
