import { Tool, ToolRunnableConfig } from "@langchain/core/tools";
import HederaAgentKit from "../../../agent";
import { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";
import { logger } from "../../../utils/logger";

export class HederaCreateTopicTool extends Tool {

    name = 'hedera_create_topic'

    description = `Create a topic on Hedera
Inputs ( input is a JSON string ):
name: string, the name of the topic e.g. My Topic,
isSubmitKey: boolean, decides whether submit key should be set, false if not passed
Example usage:
1. Create a topic with memo "My Topic":
  '{
    "name": "My Topic",
    "isSubmitKey": false
  }'
2. Create a topic with memo "My Topic". Restrict posting with a key:
  '{
    "name": "My Topic",
    "isSubmitKey": true
  }'
3. Create a topic with memo "My Topic". Do not set a submit key:
  '{
    "name": "My Topic",
    "isSubmitKey": false
  }'
`

    constructor(private hederaKit: HederaAgentKit) {
        super();
        logger.debug('HederaCreateTopicTool', 'Tool initialized', { name: this.name });
    }

    protected override async _call(input: any, _runManager?: CallbackManagerForToolRun, config?: ToolRunnableConfig):  Promise<string> {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            logger.info('HederaCreateTopicTool', 'Tool called', { 
                input, 
                isCustodial, 
                runManagerExists: !!_runManager,
                configProvided: !!config
            });

            let parsedInput;
            try {
                parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
                logger.debug('HederaCreateTopicTool', 'Parsed input', parsedInput);
            } catch (parseError) {
                logger.error('HederaCreateTopicTool', 'Failed to parse input JSON', { input, error: parseError });
                return JSON.stringify({
                    status: "error",
                    message: "Invalid JSON input",
                    code: "PARSE_ERROR",
                });
            }
            
            // Validate required parameters
            if (!parsedInput.name) {
                logger.warn('HederaCreateTopicTool', 'Missing required parameter: name', { parsedInput });
                return JSON.stringify({
                    status: "error",
                    message: "Missing required parameter: name",
                    code: "MISSING_PARAMETER",
                });
            }
            
            // Log detailed information before creating topic
            logger.debug('HederaCreateTopicTool', 'Creating topic with parameters', {
                name: parsedInput.name,
                isSubmitKey: parsedInput.isSubmitKey, 
                isCustodial,
                accountId: this.hederaKit.accountId,
                network: this.hederaKit.network
            });
            
            const startTime = Date.now();
            const response = await this.hederaKit
                .createTopic(parsedInput.name, parsedInput.isSubmitKey, isCustodial);
            const elapsedTime = Date.now() - startTime;
            
            const stringifiedResponse = response.getStringifiedResponse();
            logger.info('HederaCreateTopicTool', 'Topic created', { 
                executionTimeMs: elapsedTime,
                responseType: response.constructor.name,
                responseLength: stringifiedResponse.length
            });
            logger.debug('HederaCreateTopicTool', 'Topic creation response', { 
                response: JSON.parse(stringifiedResponse)
            });
            
            return stringifiedResponse;
        } catch (error: any) {
            logger.error('HederaCreateTopicTool', 'Error creating topic', { 
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
