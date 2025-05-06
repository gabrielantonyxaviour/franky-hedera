"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonCustodialCreateTopicResult = exports.CustodialCreateTopicResult = void 0;
const types_1 = require("../../../types");
class CustodialCreateTopicResult {
    constructor(topicId, txHash, status) {
        this.topicId = topicId;
        this.txHash = txHash;
        this.status = status;
        this.actionName = types_1.AgentKitActionName.CREATE_TOPIC_CUSTODIAL;
    }
    getRawResponse() {
        return {
            status: this.status.toLowerCase(),
            txHash: this.txHash,
            topicId: this.topicId,
        };
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: this.status.toLowerCase(),
            message: "Topic created",
            topicId: this.topicId,
            txHash: this.txHash
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.CustodialCreateTopicResult = CustodialCreateTopicResult;
class NonCustodialCreateTopicResult {
    constructor(txBytes) {
        this.txBytes = txBytes;
        this.actionName = types_1.AgentKitActionName.CREATE_TOPIC_NON_CUSTODIAL;
    }
    getRawResponse() {
        return this.txBytes;
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Topic creation transaction bytes have been successfully created.",
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.NonCustodialCreateTopicResult = NonCustodialCreateTopicResult;
