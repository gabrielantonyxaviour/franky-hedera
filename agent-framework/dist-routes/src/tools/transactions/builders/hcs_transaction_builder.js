"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HcsTransactionBuilder = void 0;
const base_transaction_builder_1 = require("./base_transaction_builder");
const strategies_1 = require("../strategies");
const strategies_2 = require("../strategies");
const strategies_3 = require("../strategies");
class HcsTransactionBuilder {
    static createTopic(memo, publicKey, isSubmitKey) {
        const strategy = new strategies_1.CreateTopicStrategy(memo, publicKey, isSubmitKey);
        return new base_transaction_builder_1.BaseTransactionBuilder(strategy);
    }
    static submitTopicMessage(topicId, message) {
        const strategy = new strategies_2.SubmitTopicMessageStrategy(topicId.toString(), message);
        return new base_transaction_builder_1.BaseTransactionBuilder(strategy);
    }
    static deleteTopic(topicId) {
        const strategy = new strategies_3.DeleteTopicStrategy(topicId);
        return new base_transaction_builder_1.BaseTransactionBuilder(strategy);
    }
}
exports.HcsTransactionBuilder = HcsTransactionBuilder;
