"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_pending_airdrops = void 0;
const get_pending_airdrops = async (networkType, accountId) => {
    const url = `https://${networkType}.mirrornode.hedera.com/api/v1/accounts/${accountId}/airdrops/pending`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.airdrops;
    }
    catch (error) {
        console.error("Failed to fetch HTS balance:", error);
        throw error;
    }
};
exports.get_pending_airdrops = get_pending_airdrops;
