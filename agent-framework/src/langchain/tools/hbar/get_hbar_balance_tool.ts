import { Tool } from "@langchain/core/tools";
import HederaAgentKit from "../../../agent";
import { logger } from "../../../utils/logger";

export class HederaGetBalanceTool extends Tool {
    name = 'hedera_get_hbar_balance'

    description = `Retrieves the HBAR balance of a specified Hedera account.  
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
`

    constructor(private hederaKit: HederaAgentKit) {
        super()
        logger.debug('HederaGetBalanceTool', 'Tool initialized', { name: this.name });
    }

    protected async _call(input: string): Promise<string> {
        try {
            logger.info('HederaGetBalanceTool', 'Tool called with input', { input });
            
            let parsedInput;
            try {
                parsedInput = input ? JSON.parse(input) : {};
                logger.debug('HederaGetBalanceTool', 'Parsed input', parsedInput);
            } catch (parseError) {
                logger.error('HederaGetBalanceTool', 'Failed to parse input JSON', { input, error: parseError });
                return JSON.stringify({
                    status: "error",
                    message: "Invalid JSON input",
                    code: "PARSE_ERROR",
                });
            }
            
            logger.debug('HederaGetBalanceTool', 'Querying balance', { 
                accountId: parsedInput?.accountId || 'default account'
            });
            
            const startTime = Date.now();
            const balance = await this.hederaKit.getHbarBalance(parsedInput?.accountId);
            const elapsedTime = Date.now() - startTime;
            
            logger.info('HederaGetBalanceTool', 'Balance retrieved successfully', { 
                balance, 
                accountId: parsedInput?.accountId || this.hederaKit.accountId,
                executionTimeMs: elapsedTime
            });

            return JSON.stringify({
                status: "success",
                balance: balance,
                unit: "HBAR"
            });
        } catch (error: any) {
            logger.error('HederaGetBalanceTool', 'Error retrieving balance', { 
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