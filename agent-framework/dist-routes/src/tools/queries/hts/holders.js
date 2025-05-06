"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_token_holders = void 0;
const api_utils_1 = require("../../../utils/api-utils");
const get_token_holders = async (tokenId, networkType, threshold) => {
    let baseUrl = (0, api_utils_1.createBaseMirrorNodeApiUrl)(networkType);
    // 100 results at once, endpoint data updated each 15min
    let url = threshold !== undefined
        ? `${baseUrl}/api/v1/tokens/${tokenId}/balances?limit=100&account.balance=gte%3A${threshold}`
        : `${baseUrl}/api/v1/tokens/${tokenId}/balances?limit=100&account.balance=gt%3A0`; // if no threshold set filter out wallets with 0 balances
    const array = new Array();
    try {
        while (url) { // Results are paginated
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            array.push(...data.balances);
            // Update URL for pagination. This endpoint does not return full path to next page, it has to be built first
            url = data.links.next ? baseUrl + data.links.next : null;
        }
        return array;
    }
    catch (error) {
        console.error("Failed to fetch token holders and their balances. Error:", error);
        throw error;
    }
};
exports.get_token_holders = get_token_holders;
