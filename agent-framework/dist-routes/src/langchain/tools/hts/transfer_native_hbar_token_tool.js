"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaTransferHbarTool = void 0;
const tools_1 = require("@langchain/core/tools");
class HederaTransferHbarTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_transfer_native_hbar_token';
        this.description = `Transfer HBAR to an account on Hedera
Inputs (input is a JSON string):
toAccountId: string, the account ID to transfer to e.g. 0.0.789012,
amount: number, the amount of HBAR to transfer e.g. 100,
Example usage:
1. Transfer 100 HBAR to account 0.0.789012:
  '{
    "toAccountId": "0.0.789012",
    "amount": 100
  }'
`;
    }
    async _call(input, _runManager, config) {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            console.log(`hedera_transfer_native_hbar_token tool has been called (${isCustodial ? 'custodial' : 'non-custodial'})`);
            const parsedInput = JSON.parse(input);
            return this.hederaKit
                .transferHbar(parsedInput.toAccountId, parsedInput.amount, isCustodial)
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
exports.HederaTransferHbarTool = HederaTransferHbarTool;
