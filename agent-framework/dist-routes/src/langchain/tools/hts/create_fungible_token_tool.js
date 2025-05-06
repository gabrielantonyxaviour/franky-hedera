"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaCreateFungibleTokenTool = void 0;
const tools_1 = require("@langchain/core/tools");
class HederaCreateFungibleTokenTool extends tools_1.Tool {
    constructor(hederaKit) {
        super();
        this.hederaKit = hederaKit;
        this.name = 'hedera_create_fungible_token';
        this.description = `Create a fungible token on Hedera
Inputs (input is a JSON string):
name: string, the name of the token e.g. My Token,
symbol: string, the symbol of the token e.g. MT,
decimals: number, the amount of decimals of the token,
initialSupply: number, optional, the initial supply of the token, given in base unit, if not passed set to undefined
isSupplyKey: boolean, decides whether supply key should be set, false if not passed
isMetadataKey: boolean, decides whether metadata key should be set, false if not passed
isAdminKey: boolean, decides whether admin key should be set, false if not passed
memo: string, containing memo associated with this token, empty string if not passed
tokenMetadata: string, containing metadata associated with this token, empty string if not passed`;
    }
    async _call(input, _runManager, config) {
        try {
            const isCustodial = config?.configurable?.isCustodial === true;
            console.log(`hedera_create_fungible_token tool has been called (${isCustodial ? 'custodial' : 'non-custodial'})`);
            const parsedInput = JSON.parse(input);
            const options = {
                name: parsedInput.name,
                symbol: parsedInput.symbol,
                decimals: parsedInput.decimals,
                initialSupply: parsedInput.initialSupply, // given in base unit
                isSupplyKey: parsedInput.isSupplyKey,
                isAdminKey: parsedInput.isAdminKey,
                isMetadataKey: parsedInput.isMetadataKey,
                memo: parsedInput.memo,
                tokenMetadata: new TextEncoder().encode(parsedInput.tokenMetadata), // encoding to Uint8Array
            };
            return await this.hederaKit
                .createFT(options, isCustodial)
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
exports.HederaCreateFungibleTokenTool = HederaCreateFungibleTokenTool;
