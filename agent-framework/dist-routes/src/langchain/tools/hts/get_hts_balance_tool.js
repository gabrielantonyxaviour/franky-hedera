"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaGetHtsBalanceTool = void 0;
const tools_1 = require("@langchain/core/tools");
class HederaGetHtsBalanceTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_get_hts_balance';
        this.description = `Retrieves the balance of a specified Hedera Token Service (HTS) token for a given account in base unit.  
If an account ID is provided, it returns the balance of that account.  
If no account ID is given, it returns the balance for the connected account.

### **Inputs** (JSON string, required fields specified):  
- **tokenId** (*string*, required): The ID of the token to check the balance for (e.g., "0.0.112233").  
- **accountId** (*string*, optional): The Hedera account ID to check the balance for (e.g., "0.0.789012").  
  - If omitted, the tool will return the balance for the connected account.


### **Example Usage:**  
1. **Get balance of token 0.0.112233 for account "0.0.123456:**  
   '{ "accountId": "0.0.123456", "tokenId":"0.0.112233"}'  
2. **Get balance of of token 0.0.11223 for the connected account:**  
   '{"tokenId":"0.0.112233"}'
`;
    }
    async _call(input) {
        try {
            console.log('hedera_get_hts_balance tool has been called');
            const parsedInput = JSON.parse(input);
            if (!parsedInput.tokenId) {
                throw new Error("tokenId is required");
            }
            if (!process.env.HEDERA_NETWORK) {
                throw new Error("HEDERA_NETWORK environment variable is required");
            }
            const balance = await this.hederaKit.getHtsBalance(parsedInput.tokenId, process.env.HEDERA_NETWORK_TYPE, parsedInput?.accountId);
            const details = await this.hederaKit.getHtsTokenDetails(parsedInput?.tokenId, process.env.HEDERA_NETWORK_TYPE);
            return JSON.stringify({
                status: "success",
                balance: balance, // in base unit
                unit: details.symbol,
                decimals: details.decimals
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
exports.HederaGetHtsBalanceTool = HederaGetHtsBalanceTool;
