import { BaseResult } from "../base_result";
import { AgentKitActionName } from "../../../types";

export type CreateTopicResult = {
    status: string,
    txHash: string,
    topicId: string,
}

export class CustodialCreateTopicResult implements BaseResult<CreateTopicResult> {
    actionName: AgentKitActionName;

    constructor(
        public readonly topicId: string,
        public readonly txHash: string,
        public readonly status: string
    ) {
        this.actionName = AgentKitActionName.CREATE_TOPIC_CUSTODIAL;
    }

    getRawResponse(): CreateTopicResult {
        return {
            status: this.status.toLowerCase(),
            txHash: this.txHash,
            topicId: this.topicId,
        };
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: this.status.toLowerCase(),
            message: "Topic created",   
            topicId: this.topicId,
            txHash: this.txHash
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}

export class NonCustodialCreateTopicResult implements BaseResult<string> {
    actionName: AgentKitActionName;

    constructor(public readonly txBytes: string) {
        this.actionName = AgentKitActionName.CREATE_TOPIC_NON_CUSTODIAL;
    }

    getRawResponse(): string {
        return this.txBytes;
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Topic creation transaction bytes have been successfully created.",
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}
