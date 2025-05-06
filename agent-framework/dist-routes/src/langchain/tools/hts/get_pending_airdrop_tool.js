"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaGetPendingAirdropTool = void 0;
const tools_1 = require("@langchain/core/tools");
class HederaGetPendingAirdropTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_get_pending_airdrop';
        this.description = `Get the pending airdrops for the given account on Hedera
Inputs ( input is a JSON string ):
- accountId: string, the account ID to get the pending airdrop for e.g. 0.0.789012,
Example usage:
1. Get the pending airdrops for account 0.0.789012:
  '{
    "accountId": "0.0.789012"
  }'
`;
    }
    async _call(input) {
        try {
            console.log('hedera_get_pending_airdrop tool has been called');
            const parsedInput = JSON.parse(input);
            const airdrop = await this.hederaKit.getPendingAirdrops(parsedInput.accountId, process.env.HEDERA_NETWORK_TYPE);
            return JSON.stringify({
                status: "success",
                message: "Pending airdrop retrieved",
                airdrop: airdrop
            });
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
exports.HederaGetPendingAirdropTool = HederaGetPendingAirdropTool;
