"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaCreateTopicTool = void 0;
const tools_1 = require("@langchain/core/tools");
const logger_1 = require("../../../utils/logger");
class HederaCreateTopicTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_create_topic';
        this.description = `Create a topic on Hedera
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
`;
        logger_1.logger.debug('HederaCreateTopicTool', 'Tool initialized', { name: this.name });
    }
    async _call(input, _runManager, config) {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            logger_1.logger.info('HederaCreateTopicTool', 'Tool called', {
                input,
                isCustodial,
                runManagerExists: !!_runManager,
                configProvided: !!config
            });
            let parsedInput;
            try {
                parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
                logger_1.logger.debug('HederaCreateTopicTool', 'Parsed input', parsedInput);
            }
            catch (parseError) {
                logger_1.logger.error('HederaCreateTopicTool', 'Failed to parse input JSON', { input, error: parseError });
                return JSON.stringify({
                    status: "error",
                    message: "Invalid JSON input",
                    code: "PARSE_ERROR",
                });
            }
            // Validate required parameters
            if (!parsedInput.name) {
                logger_1.logger.warn('HederaCreateTopicTool', 'Missing required parameter: name', { parsedInput });
                return JSON.stringify({
                    status: "error",
                    message: "Missing required parameter: name",
                    code: "MISSING_PARAMETER",
                });
            }
            // Log detailed information before creating topic
            logger_1.logger.debug('HederaCreateTopicTool', 'Creating topic with parameters', {
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
            logger_1.logger.info('HederaCreateTopicTool', 'Topic created', {
                executionTimeMs: elapsedTime,
                responseType: response.constructor.name,
                responseLength: stringifiedResponse.length
            });
            logger_1.logger.debug('HederaCreateTopicTool', 'Topic creation response', {
                response: JSON.parse(stringifiedResponse)
            });
            return stringifiedResponse;
        }
        catch (error) {
            logger_1.logger.error('HederaCreateTopicTool', 'Error creating topic', {
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
exports.HederaCreateTopicTool = HederaCreateTopicTool;
