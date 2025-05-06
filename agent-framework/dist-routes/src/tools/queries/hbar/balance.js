"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_hbar_balance = void 0;
const sdk_1 = require("@hashgraph/sdk");
const get_hbar_balance = async (client, accountId) => {
    if (!accountId) {
        throw new Error("accountId must be provided");
    }
    const query = new sdk_1.AccountBalanceQuery().setAccountId(accountId);
    const balance = await query.execute(client);
    return balance.hbars.toBigNumber().toNumber();
};
exports.get_hbar_balance = get_hbar_balance;
