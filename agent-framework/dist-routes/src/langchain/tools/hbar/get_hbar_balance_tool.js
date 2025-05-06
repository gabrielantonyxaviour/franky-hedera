"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaGetBalanceTool = void 0;
const tools_1 = require("@langchain/core/tools");
const logger_1 = require("../../../utils/logger");
class HederaGetBalanceTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_get_hbar_balance';
        this.description = `Retrieves the HBAR balance of a specified Hedera account.  
If an account ID is provided, it returns the balance of that account.  
If no input is given (empty JSON '{}'), it returns the balance of the connected account.  

### **Inputs** (optional, input is a JSON string):  
- **accountId** (*string*, optional): The Hedera account ID to check the balance for (e.g., "0.0.789012").  
  - If omitted, the tool will return the balance of the connected account.  

### **Example Usage:**  
1. **Get balance of a specific account:**  
   '{ "accountId": "0.0.123456" }'  
2. **Get balance of the connected account:**  
   '{}'
`;
        logger_1.logger.debug('HederaGetBalanceTool', 'Tool initialized', { name: this.name });
    }
    async _call(input) {
        try {
            logger_1.logger.info('HederaGetBalanceTool', 'Tool called with input', { input });
            let parsedInput;
            try {
                parsedInput = input ? JSON.parse(input) : {};
                logger_1.logger.debug('HederaGetBalanceTool', 'Parsed input', parsedInput);
            }
            catch (parseError) {
                logger_1.logger.error('HederaGetBalanceTool', 'Failed to parse input JSON', { input, error: parseError });
                return JSON.stringify({
                    status: "error",
                    message: "Invalid JSON input",
                    code: "PARSE_ERROR",
                });
            }
            logger_1.logger.debug('HederaGetBalanceTool', 'Querying balance', {
                accountId: parsedInput?.accountId || 'default account'
            });
            const startTime = Date.now();
            const balance = await this.hederaKit.getHbarBalance(parsedInput?.accountId);
            const elapsedTime = Date.now() - startTime;
            logger_1.logger.info('HederaGetBalanceTool', 'Balance retrieved successfully', {
                balance,
                accountId: parsedInput?.accountId || this.hederaKit.accountId,
                executionTimeMs: elapsedTime
            });
            return JSON.stringify({
                status: "success",
                balance: balance,
                unit: "HBAR"
            });
        }
        catch (error) {
            logger_1.logger.error('HederaGetBalanceTool', 'Error retrieving balance', {
                error: {
                    message: error.message,
                    code: error.code || "UNKNOWN_ERROR",
                    stack: error.stack
                }
            });
            return JSON.stringify({
                status: "error",
                message: error.message,
                code: error.code || "UNKNOWN_ERROR",
            });
        }
    }
}
exports.HederaGetBalanceTool = HederaGetBalanceTool;
