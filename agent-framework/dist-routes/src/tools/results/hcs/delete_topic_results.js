"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonCustodialDeleteTopicResult = exports.CustodialDeleteTopicResult = void 0;
const types_1 = require("../../../types");
class CustodialDeleteTopicResult {
    constructor(txHash, status) {
        this.txHash = txHash;
        this.status = status;
        this.actionName = types_1.AgentKitActionName.DELETE_TOPIC_CUSTODIAL;
    }
    getRawResponse() {
        return {
            status: this.status.toLowerCase(),
            txHash: this.txHash,
        };
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: this.status.toLowerCase(),
            message: "Topic deleted",
            txHash: this.txHash
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.CustodialDeleteTopicResult = CustodialDeleteTopicResult;
class NonCustodialDeleteTopicResult {
    constructor(txBytes) {
        this.txBytes = txBytes;
        this.actionName = types_1.AgentKitActionName.DELETE_TOPIC_NON_CUSTODIAL;
    }
    getRawResponse() {
        return this.txBytes;
    }
    getStringifiedResponse() {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Topic deletion transaction bytes have been successfully created.",
        });
    }
    getName() {
        return this.actionName;
    }
}
exports.NonCustodialDeleteTopicResult = NonCustodialDeleteTopicResult;
