"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaMirrorNodeClient = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const utils_1 = require("./utils");
const date_format_utils_1 = require("../../utils/date-format-utils");
class HederaMirrorNodeClient {
    constructor(networkType) {
        const networkBase = networkType === "mainnet" ? `${networkType}-public` : networkType;
        this.baseUrl = `https://${networkBase}.mirrornode.hedera.com/api/v1`;
    }
    async getHbarBalance(accountId) {
        const url = `${this.baseUrl}/accounts?account.id=${accountId}&balance=true&limit=1&order=desc`;
        console.log(`URL: ${url}`);
        const response = await fetch(url, { method: "GET" });
        const parsedResponse = await response.json();
        const rawBalance = parsedResponse.accounts[0].balance.balance;
        console.log(`Raw balance for ${accountId}: ${rawBalance} (from Mirror Node)`);
        return (0, utils_1.fromTinybarToHbar)(rawBalance);
    }
    async getTokenBalance(accountId, tokenId) {
        const url = `${this.baseUrl}/tokens/${tokenId}/balances?account.id=${accountId}&limit=1&order=asc`;
        console.log(`URL: ${url}`);
        const response = await fetch(url, { method: "GET" });
        const parsedResponse = await response.json();
        const rawBalance = parsedResponse?.balances[0]?.balance;
        const decimals = parsedResponse?.balances[0]?.decimals;
        const balanceInDisplayUnit = parsedResponse?.balances[0]
            ? (0, utils_1.fromBaseToDisplayUnit)(rawBalance, decimals)
            : 0;
        console.log(`Parsed balance for ${accountId}: ${balanceInDisplayUnit} of ${tokenId} (from Mirror Node)`);
        return balanceInDisplayUnit;
    }
    async getTransactionReport(transactionId, senderId, receiversId) {
        const url = `${this.baseUrl}/transactions/${transactionId}`;
        console.log(`URL: ${url}`);
        const response = await fetch(`${this.baseUrl}/transactions/${transactionId}`);
        if (!response.ok) {
            throw new Error(`Hedera Mirror Node API error: ${response.statusText}`);
        }
        const result = await response.json();
        const totalFees = result.transactions[0].transfers
            .filter((t) => t.account !== senderId &&
            !receiversId.find((r) => r === t.account))
            .reduce((sum, t) => sum + t.amount, 0);
        const status = result.transactions[0].result;
        const txReport = {
            status,
            totalPaidFees: (0, utils_1.fromTinybarToHbar)(totalFees),
        };
        console.log(`Parsed transaction report: ${JSON.stringify(txReport, null, 2)}`);
        return txReport;
    }
    async getTokenDetails(tokenId) {
        const url = `${this.baseUrl}/tokens/${tokenId}`;
        console.log(`URL: ${url}`);
        const response = await fetch(url, { method: "GET" });
        return response.json();
    }
    async getAllTokensBalances(accountId) {
        let url = `${this.baseUrl}/balances?account.id=${accountId}`;
        const array = new Array();
        console.log(`URL: ${url}`);
        try {
            while (url) {
                // Results are paginated
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                for (const token of data.balances[0]?.tokens || []) {
                    const tokenDetails = await this.getTokenDetails(token.token_id);
                    const detailedTokenBalance = {
                        balance: token.balance,
                        tokenDecimals: tokenDetails.decimals,
                        tokenId: token.token_id,
                        tokenName: tokenDetails.name,
                        tokenSymbol: tokenDetails.symbol,
                        balanceInDisplayUnit: (0, bignumber_js_1.default)((0, utils_1.fromBaseToDisplayUnit)(token.balance, +tokenDetails.decimals)),
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
    }
    async getPendingAirdrops(accountId) {
        let url = `${this.baseUrl}/accounts/${accountId}/pending-airdrops`;
        const allAirdrops = [];
        console.log(`URL: ${url}`);
        try {
            while (url) {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                allAirdrops.push(...data.airdrops);
                url = data.links.next;
            }
            return allAirdrops;
        }
        catch (error) {
            console.error("Failed to fetch pending airdrops. Error:", error);
            throw error;
        }
    }
    async getTopic(topicId) {
        const url = `${this.baseUrl}/topics/${topicId}`;
        console.log(`URL: ${url}`);
        try {
            const response = await fetch(url, { method: "GET" });
            const data = await response.json();
            console.log("Topic data:", data);
            return data;
        }
        catch (error) {
            console.error(`Failed to fetch topic ${topicId}. Error:`, error);
            throw error;
        }
    }
    async getAccountInfo(accountId) {
        console.log(`Getting account info for ${accountId}`);
        const url = `${this.baseUrl}/accounts?account.id=${accountId}&limit=1&order=desc`;
        console.log(`URL: ${url}`);
        const response = await fetch(url, { method: "GET" });
        const parsedResponse = await response.json();
        return parsedResponse.accounts[0];
    }
    async getAccountToken(accountId, tokenId) {
        console.log({ baseUrl: this.baseUrl });
        const url = `${this.baseUrl}/accounts/${accountId}/tokens?token.id=${tokenId}&limit=1&order=desc`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.tokens[0];
    }
    async getAccountTokens(accountId) {
        const allTokens = [];
        let nextLink = `${this.baseUrl}/accounts/${accountId}/tokens?&limit=100&order=desc`;
        console.log(`URL: ${nextLink}`);
        while (nextLink) {
            const response = await fetch(nextLink);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            allTokens.push(...data.tokens);
            nextLink = data.links?.next
                ? `${this.baseUrl.replace("/api/v1", "")}${data.links?.next}`
                : null;
        }
        return allTokens;
    }
    async getAutomaticAssociationsCount(accountId) {
        const allTokens = await this.getAccountTokens(accountId);
        return allTokens.reduce((acc, currentToken) => {
            if (currentToken.automatic_association) {
                acc += 1;
            }
            return acc;
        }, 0);
    }
    async getTopicMessages(topicId, range) {
        const lowerThreshold = range?.lowerTimestamp ? `&timestamp=gte:${(0, date_format_utils_1.convertStringToTimestamp)(range.lowerTimestamp)}` : '';
        const upperThreshold = range?.upperTimestamp ? `&timestamp=lte:${(0, date_format_utils_1.convertStringToTimestamp)(range.upperTimestamp)}` : '';
        let url = `${this.baseUrl}/topics/${topicId}/messages?encoding=UTF-8&limit=100&order=desc${lowerThreshold}${upperThreshold}`;
        const allMessages = [];
        console.log(`URL: ${url}`);
        try {
            while (url) {
                const response = await fetch(url, { method: "GET" });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                allMessages.push(...data.messages);
                // Update URL for pagination
                url = data.links.next
                    ? `${this.baseUrl.replace("/api/v1", "")}${data.links.next}`
                    : null;
            }
            return allMessages;
        }
        catch (error) {
            console.error(`Failed to get topic messages for ${topicId}. Error:`, error);
            throw error;
        }
    }
}
exports.HederaMirrorNodeClient = HederaMirrorNodeClient;
