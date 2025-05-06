"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonCustodialSubmitMessageResult = exports.CustodialSubmitMessageResult = void 0;
const types_1 = require("../../../types");
class CustodialSubmitMessageResult {
    constructor(txHash, status, topicId) {
        this.txHash = txHash;
        this.status = status;
        this.topicId = topicId;
        this.actionName = types_1.AgentKitActionName.SUBMIT_TOPIC_MESSAGE_CUSTODIAL;
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
            message: "Message submitted",
            txHash: this.txHash,
            topicId: this.topicId,
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.CustodialSubmitMessageResult = CustodialSubmitMessageResult;
class NonCustodialSubmitMessageResult {
    constructor(txBytes) {
        this.txBytes = txBytes;
        this.actionName = types_1.AgentKitActionName.SUBMIT_TOPIC_MESSAGE_NON_CUSTODIAL;
    }
    getRawResponse() {
        return this.txBytes;
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Submit message to the topic transaction bytes have been successfully created.",
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.NonCustodialSubmitMessageResult = NonCustodialSubmitMessageResult;
