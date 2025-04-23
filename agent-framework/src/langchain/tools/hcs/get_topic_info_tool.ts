import { Tool } from "@langchain/core/tools";
import HederaAgentKit from "../../../agent";
import { TopicId } from "@hashgraph/sdk";

export class HederaGetTopicInfoTool extends Tool {
    name = 'hedera_get_topic_info'

    description = `Get information about a topic on Hedera
Inputs ( input is a JSON string ):
topicId: string, the ID of the topic to get the information for e.g. 0.0.123456,
Example usage:
1. Get information about topic 0.0.123456:
  '{
    "topicId": "0.0.123456"
  }'
`

    constructor(private hederaKit: HederaAgentKit) {
        super()
    }

    protected async _call(input: string): Promise<string> {
        try {
            console.log('hedera_get_topic_info tool has been called');

            const parsedInput = JSON.parse(input);
            const topicInfo = await this.hederaKit.getTopicInfo(
                TopicId.fromString(parsedInput.topicId),
                process.env.HEDERA_NETWORK_TYPE as "mainnet" | "testnet" | "previewnet" || "testnet"
            );
            return JSON.stringify({
                status: "success",
                message: "Topic information retrieved",
                topicInfo: topicInfo
            });
        } catch (error: any) {
            return JSON.stringify({
                status: "error",
                message: error.message,
                code: error.code || "UNKNOWN_ERROR",
            });
        }
    }
}