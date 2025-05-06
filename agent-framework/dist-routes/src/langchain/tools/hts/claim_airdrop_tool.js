"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaClaimAirdropTool = void 0;
const tools_1 = require("@langchain/core/tools");
const sdk_1 = require("@hashgraph/sdk");
class HederaClaimAirdropTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_claim_airdrop';
        this.description = `Claim an airdrop for a token on Hedera
Inputs (input is a JSON string):
tokenId: string, the ID of the token to claim the airdrop for e.g. 0.0.123456,
senderAccountId: string, the account ID of the sender e.g. 0.0.789012,
Example usage:
1. Claim an airdrop for token 0.0.123456 from account 0.0.789012:
  '{
    "tokenId": "0.0.123456",
    "senderAccountId": "0.0.789012"
  }'
`;
    }
    async _call(input, _runManager, config) {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            console.log(`hedera_claim_airdrop tool has been called (${isCustodial ? 'custodial' : 'non-custodial'})`);
            const parsedInput = JSON.parse(input);
            const airdropId = new sdk_1.PendingAirdropId({
                tokenId: sdk_1.TokenId.fromString(parsedInput.tokenId),
                senderId: sdk_1.AccountId.fromString(parsedInput.senderAccountId),
                receiverId: this.hederaKit.client.operatorAccountId
            });
            return await this.hederaKit
                .claimAirdrop(airdropId, isCustodial)
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
exports.HederaClaimAirdropTool = HederaClaimAirdropTool;
