"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaGetAllTokenBalancesTool = void 0;
const tools_1 = require("@langchain/core/tools");
class HederaGetAllTokenBalancesTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_get_all_token_balances';
        this.description = `Get all token balances for an account on Hedera
Inputs ( input is a JSON string ):
accountId : string, the account ID to get the token balances for e.g. 0.0.789012,
- **accountId** (*string*, optional): The Hedera account ID to check the balance for (e.g., "0.0.789012").  
  - If omitted, the tool will return the balance of the connected account.  

Example usage:
1. Get all token balances for account 0.0.789012:
  '{
    "accountId": "0.0.789012"
  }'
2. Get all token balances for the connected account:
   '{}'
`;
    }
    async _call(input) {
        try {
            const parsedInput = input ? JSON.parse(input) : {};
            // returns both display and base unit balances
            const balances = await this.hederaKit.getAllTokensBalances(process.env.HEDERA_NETWORK_TYPE, parsedInput.accountId);
            return JSON.stringify({
                status: "success",
                message: "Token balances retrieved",
                balances: balances
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
exports.HederaGetAllTokenBalancesTool = HederaGetAllTokenBalancesTool;
