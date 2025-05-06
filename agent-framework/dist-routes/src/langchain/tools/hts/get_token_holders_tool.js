"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaGetTokenHoldersTool = void 0;
const tools_1 = require("@langchain/core/tools");
const hts_format_utils_1 = require("../../../utils/hts-format-utils");
const format_units_1 = require("../../../utils/format-units");
class HederaGetTokenHoldersTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_get_token_holders';
        this.description = `Get the holders of a token on Hedera
Inputs ( input is a JSON string ):
tokenId: string, the ID of the token to get the holders for e.g. 0.0.123456,
threshold (optional): number, the threshold of the token to get the holders for e.g. 100,
Example usage:
1. Get the holders of token 0.0.123456 with a threshold of 100:
  '{
    "tokenId": "0.0.123456",
    "threshold": 100
  }
}
`;
    }
    async _call(input) {
        try {
            console.log('hedera_get_token_holders tool has been called');
            const parsedInput = JSON.parse(input);
            const threshold = parsedInput.threshold ?
                Number((await (0, hts_format_utils_1.toBaseUnit)(parsedInput.tokenId, parsedInput.threshold, this.hederaKit.network)).toString()) : undefined;
            // returns balances in base unit
            const holders = await this.hederaKit.getTokenHolders(parsedInput.tokenId, this.hederaKit.network, threshold // given in base unit, optionals
            );
            const formattedHolders = holders.map((holder) => ({
                account: holder.account,
                balance: (0, format_units_1.fromBaseToDisplayUnit)(holder.balance, holder.decimals).toString(),
                decimals: holder.decimals
            }));
            return JSON.stringify({
                status: "success",
                message: "Token holders retrieved",
                holders: formattedHolders
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
exports.HederaGetTokenHoldersTool = HederaGetTokenHoldersTool;
