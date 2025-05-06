"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHederaTools = createHederaTools;
const dotenv = __importStar(require("dotenv"));
const get_hbar_balance_tool_1 = require("./tools/hbar/get_hbar_balance_tool");
const create_topic_tool_1 = require("./tools/hcs/create_topic_tool");
const get_topic_info_tool_1 = require("./tools/hcs/get_topic_info_tool");
const delete_topic_tool_1 = require("./tools/hcs/delete_topic_tool");
const get_topic_messages_tool_1 = require("./tools/hcs/get_topic_messages_tool");
const submit_topic_message_tool_1 = require("./tools/hcs/submit_topic_message_tool");
const airdrop_token_tool_1 = require("./tools/hts/airdrop_token_tool");
const associate_token_tool_1 = require("./tools/hts/associate_token_tool");
const claim_airdrop_tool_1 = require("./tools/hts/claim_airdrop_tool");
const create_fungible_token_tool_1 = require("./tools/hts/create_fungible_token_tool");
const create_non_fungible_token_tool_1 = require("./tools/hts/create_non_fungible_token_tool");
const get_all_token_balances_tool_1 = require("./tools/hts/get_all_token_balances_tool");
const get_hts_balance_tool_1 = require("./tools/hts/get_hts_balance_tool");
const get_pending_airdrop_tool_1 = require("./tools/hts/get_pending_airdrop_tool");
const get_token_holders_tool_1 = require("./tools/hts/get_token_holders_tool");
const mint_fungible_token_tool_1 = require("./tools/hts/mint_fungible_token_tool");
const mint_non_fungible_token_tool_1 = require("./tools/hts/mint_non_fungible_token_tool");
const reject_token_tool_1 = require("./tools/hts/reject_token_tool");
const transfer_native_hbar_token_tool_1 = require("./tools/hts/transfer_native_hbar_token_tool");
const transfer_token_tool_1 = require("./tools/hts/transfer_token_tool");
const dissociate_token_tool_1 = require("./tools/hts/dissociate_token_tool");
const logger_1 = require("../utils/logger");
dotenv.config();
/**
 * Wraps a LangChain tool with detailed logging
 * @param tool The original LangChain tool
 * @returns A tool that logs calls and results
 */
function createLoggingToolWrapper(tool) {
    // Create a proxy wrapper around the tool
    const wrapper = Object.create(tool);
    // Save reference to the original call method
    const originalCall = tool.call.bind(tool);
    // Override the public call method
    wrapper.call = async function (input, ...rest) {
        const startTime = Date.now();
        // Log the start of the tool call
        logger_1.logger.toolCall(tool.name, input);
        try {
            // Call the original method
            const result = await originalCall(input, ...rest);
            // Log the result
            const elapsedTime = Date.now() - startTime;
            logger_1.logger.toolCall(tool.name, input, {
                executionTimeMs: elapsedTime,
                resultSummary: typeof result === 'string' ?
                    (result.length > 100 ? `${result.substring(0, 100)}... (${result.length} chars)` : result) :
                    typeof result
            });
            return result;
        }
        catch (error) {
            // Log the error
            logger_1.logger.error(`Tool:${tool.name}`, 'Tool execution failed', {
                input,
                error
            });
            throw error;
        }
    };
    return wrapper;
}
function createHederaTools(hederaKit) {
    logger_1.logger.info('HederaTools', 'Creating Hedera tools');
    const tools = [
        new get_hbar_balance_tool_1.HederaGetBalanceTool(hederaKit),
        new create_topic_tool_1.HederaCreateTopicTool(hederaKit),
        new delete_topic_tool_1.HederaDeleteTopicTool(hederaKit),
        new get_topic_info_tool_1.HederaGetTopicInfoTool(hederaKit),
        new get_topic_messages_tool_1.HederaGetTopicMessagesTool(hederaKit),
        new submit_topic_message_tool_1.HederaSubmitTopicMessageTool(hederaKit),
        new airdrop_token_tool_1.HederaAirdropTokenTool(hederaKit),
        new associate_token_tool_1.HederaAssociateTokenTool(hederaKit),
        new claim_airdrop_tool_1.HederaClaimAirdropTool(hederaKit),
        new create_fungible_token_tool_1.HederaCreateFungibleTokenTool(hederaKit),
        new create_non_fungible_token_tool_1.HederaCreateNonFungibleTokenTool(hederaKit),
        new dissociate_token_tool_1.HederaDissociateTokenTool(hederaKit),
        new get_all_token_balances_tool_1.HederaGetAllTokenBalancesTool(hederaKit),
        new get_hts_balance_tool_1.HederaGetHtsBalanceTool(hederaKit),
        new get_pending_airdrop_tool_1.HederaGetPendingAirdropTool(hederaKit),
        new get_token_holders_tool_1.HederaGetTokenHoldersTool(hederaKit),
        new mint_fungible_token_tool_1.HederaMintFungibleTokenTool(hederaKit),
        new mint_non_fungible_token_tool_1.HederaMintNFTTool(hederaKit),
        new reject_token_tool_1.HederaRejectTokenTool(hederaKit),
        new transfer_native_hbar_token_tool_1.HederaTransferHbarTool(hederaKit),
        new transfer_token_tool_1.HederaTransferTokenTool(hederaKit),
    ];
    logger_1.logger.debug('HederaTools', `Created ${tools.length} base tools`);
    // Wrap each tool with logging
    const wrappedTools = tools.map(tool => createLoggingToolWrapper(tool));
    logger_1.logger.info('HederaTools', `${wrappedTools.length} Hedera tools created and wrapped with logging`);
    return wrappedTools;
}
