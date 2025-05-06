"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountTransactionBuilder = void 0;
const base_transaction_builder_1 = require("./base_transaction_builder");
const strategies_1 = require("../strategies");
class AccountTransactionBuilder {
    /**
     *
     * @param spenderAccount - id of an account getting spending allowance
     * @param amount - amount of allowance in base unit
     * @param issuerAccountId - id of an account giving spending allowance
     * @param tokenId - id of token to be allowed for spending, if not passed defaults to allowance for HBAR
     */
    static approveAssetAllowance(spenderAccount, amount, issuerAccountId, tokenId) {
        const strategy = new strategies_1.AssetAllowanceStrategy(tokenId, amount, issuerAccountId, spenderAccount);
        return new base_transaction_builder_1.BaseTransactionBuilder(strategy);
    }
}
exports.AccountTransactionBuilder = AccountTransactionBuilder;
