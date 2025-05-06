"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_hts_token_details = void 0;
const get_hts_token_details = async (tokenId, networkType) => {
    const url = `https://${networkType}.mirrornode.hedera.com/api/v1/tokens/${tokenId}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}. message: ${response.statusText}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error("Failed to fetch HTS token details", error);
        throw error;
    }
};
exports.get_hts_token_details = get_hts_token_details;
