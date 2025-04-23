import { Tool, ToolRunnableConfig } from "@langchain/core/tools";
import HederaAgentKit from "../../../agent";
import { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";

export class HederaAirdropTokenTool extends Tool {
    name = 'hedera_airdrop_token';

    description = `Airdrop fungible tokens to multiple accounts on Hedera
Inputs (input is a JSON string):
tokenId: string, the ID of the token to airdrop e.g. 0.0.123456,
recipients: array of objects containing:
  - accountId: string, the account ID to send tokens to e.g. 0.0.789012
  - amount: number, the amount of tokens to send e.g. 100
Example usage:
1. Airdrop 100 tokens to account 0.0.789012 and 200 tokens to account 0.0.789013:
  '{
    "tokenId": "0.0.123456",
    "recipients": [
    {"accountId": "0.0.789012", "amount": 100},
    {"accountId": "0.0.789013", "amount": 200}
  ]
}'
`;

    constructor(private hederaKit: HederaAgentKit) {
        super();
    }

    protected override async _call(input: any, _runManager?: CallbackManagerForToolRun, config?: ToolRunnableConfig): Promise<string> {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            console.log(`hedera_airdrop_token tool has been called (${isCustodial ? 'custodial' : 'non-custodial'})`);

            const parsedInput = JSON.parse(input);

            return await this.hederaKit
                .airdropToken(parsedInput.tokenId, parsedInput.recipients, isCustodial)
                .then(response => response.getStringifiedResponse());

        } catch (error: any) {
            return JSON.stringify({
                status: "error",
                message: error.message,
                code: error.code || "UNKNOWN_ERROR",
            });
        }
    }
}
