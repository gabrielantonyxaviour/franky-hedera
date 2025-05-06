"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HbarTransactionBuilder = void 0;
const base_transaction_builder_1 = require("./base_transaction_builder");
const strategies_1 = require("../strategies");
class HbarTransactionBuilder {
    static transferHbar(fromAccountId, toAccountId, amount) {
        const strategy = new strategies_1.TransferHbarStrategy(fromAccountId, toAccountId, amount);
        return new base_transaction_builder_1.BaseTransactionBuilder(strategy);
    }
}
exports.HbarTransactionBuilder = HbarTransactionBuilder;
