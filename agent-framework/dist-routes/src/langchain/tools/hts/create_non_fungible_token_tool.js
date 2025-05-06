"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaCreateNonFungibleTokenTool = void 0;
const tools_1 = require("@langchain/core/tools");
// FIXME: works well in isolation but normally usually createFT is called instead of createNFT
class HederaCreateNonFungibleTokenTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_create_non_fungible_token';
        this.description = `Create a non-fungible (NFT) token on Hedera.

Inputs (input is a JSON string):
- name: string (e.g. "My Token")
- symbol: string (e.g. "MT")
- maxSupply: number (optional), the maximum supply of the token. If not provided, this field will be omitted in the response.
- isMetadataKey: boolean, determines whether a metadata key should be set. Defaults to \`false\` if not provided.
- isAdminKey: boolean, determines whether an admin key should be set. Defaults to \`false\` if not provided.
- memo: string, containing a memo associated with the token. Defaults to an empty string if not provided.
- tokenMetadata: string, containing metadata associated with the token. Defaults to an empty string if not provided.
`;
    }
    async _call(input, _runManager, config) {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            console.log(`hedera_create_non_fungible_token tool has been called (${isCustodial ? 'custodial' : 'non-custodial'})`);
            const parsedInput = JSON.parse(input);
            const options = {
                name: parsedInput.name,
                symbol: parsedInput.symbol,
                maxSupply: parsedInput.maxSupply,
                isAdminKey: parsedInput.isAdminKey,
                isMetadataKey: parsedInput.isMetadataKey,
                memo: parsedInput.memo,
                tokenMetadata: new TextEncoder().encode(parsedInput.tokenMetadata),
            };
            return await this.hederaKit
                .createNFT(options, isCustodial)
                .then(response => response.getStringifiedResponse());
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
exports.HederaCreateNonFungibleTokenTool = HederaCreateNonFungibleTokenTool;
