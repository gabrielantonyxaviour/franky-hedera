"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaTransferTokenTool = void 0;
const tools_1 = require("@langchain/core/tools");
const hts_format_utils_1 = require("../../../utils/hts-format-utils");
class HederaTransferTokenTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_transfer_token';
        this.description = `Transfer fungible tokens on Hedera
Inputs (input is a JSON string):
tokenId: string, the ID of the token to transfer e.g. 0.0.123456,
toAccountId: string, the account ID to transfer to e.g. 0.0.789012,
amount: number, the amount of tokens to transfer e.g. 100 in base unit
`;
    }
    async _call(input, _runManager, config) {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            console.log(`hedera_transfer_token tool has been called (${isCustodial ? 'custodial' : 'non-custodial'})`);
            const parsedInput = JSON.parse(input);
            const amount = await (0, hts_format_utils_1.toBaseUnit)(parsedInput.tokenId, parsedInput.amount, this.hederaKit.network);
            return this.hederaKit
                .transferToken(parsedInput.tokenId, parsedInput.toAccountId, Number(amount.toString()), isCustodial)
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
exports.HederaTransferTokenTool = HederaTransferTokenTool;
