"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaAssociateTokenTool = void 0;
const tools_1 = require("@langchain/core/tools");
class HederaAssociateTokenTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_associate_token';
        this.description = `Associate a token to an account on Hedera
Inputs (input is a JSON string):
tokenId: string, the ID of the token to associate e.g. 0.0.123456,
Example usage:
1. Associate token 0.0.123456:
  '{
    "tokenId": "0.0.123456"
  }'
`;
    }
    async _call(input, _runManager, config) {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            console.log(`hedera_associate_token tool has been called (${isCustodial ? 'custodial' : 'non-custodial'})`);
            const parsedInput = JSON.parse(input);
            return await this.hederaKit
                .associateToken(parsedInput.tokenId, isCustodial)
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
exports.HederaAssociateTokenTool = HederaAssociateTokenTool;
