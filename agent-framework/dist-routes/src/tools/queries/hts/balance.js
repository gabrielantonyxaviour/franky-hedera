"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_all_tokens_balances = exports.get_hts_balance = void 0;
const details_1 = require("./details");
const hts_format_utils_1 = require("../../../utils/hts-format-utils");
const get_hts_balance = async (tokenId, networkType, accountId) => {
    const url = `https://${networkType}.mirrornode.hedera.com/api/v1/tokens/${tokenId}/balances?account.id=eq:${accountId}&limit=1&order=asc`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const balance = data.balances[0]?.balance;
        if (balance === undefined)
            return 0;
        return balance; // returns balance in base unit
    }
    catch (error) {
        console.error("Failed to fetch HTS balance:", error);
        throw error;
    }
};
exports.get_hts_balance = get_hts_balance;
const get_all_tokens_balances = async (networkType, accountId) => {
    let url = `https://${networkType}.mirrornode.hedera.com/api/v1/balances?account.id=${accountId}`;
    const array = new Array();
    try {
        while (url) { // Results are paginated
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            for (const token of data.balances[0]?.tokens || []) {
                const tokenDetails = await (0, details_1.get_hts_token_details)(token.token_id, networkType);
                const detailedTokenBalance = {
                    balance: token.balance,
                    tokenDecimals: tokenDetails.decimals,
                    tokenId: token.token_id,
                    tokenName: tokenDetails.name,
                    tokenSymbol: tokenDetails.symbol,
                    balanceInDisplayUnit: (await (0, hts_format_utils_1.toDisplayUnit)(token.token_id, token.balance, networkType))
                };
                array.push(detailedTokenBalance);
            }
            // Update URL for pagination
            url = data.links.next;
        }
        return array;
    }
    catch (error) {
        console.error("Failed to fetch token balances. Error:", error);
        throw error;
    }
};
exports.get_all_tokens_balances = get_all_tokens_balances;
