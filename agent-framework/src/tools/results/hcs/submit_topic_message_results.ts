import { BaseResult } from "../base_result";
import { AgentKitActionName } from "../../../types";

export type SubmitMessageResult = {
    status: string,
    txHash: string,
    topicId: string,
}


export class CustodialSubmitMessageResult implements BaseResult<SubmitMessageResult> {
    actionName: AgentKitActionName;

    constructor(
        public readonly txHash: string,
        public readonly status: string,
        public readonly topicId: string,
    ) {
        this.actionName = AgentKitActionName.SUBMIT_TOPIC_MESSAGE_CUSTODIAL;
    }

    getRawResponse(): SubmitMessageResult {
        return {
            status: this.status.toLowerCase(),
            txHash: this.txHash,
            topicId: this.topicId,
        };
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: this.status.toLowerCase(),
            message: "Message submitted",
            txHash: this.txHash,
            topicId: this.topicId,
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}

export class NonCustodialSubmitMessageResult implements BaseResult<string> {
    actionName: AgentKitActionName;

    constructor(public readonly txBytes: string) {
        this.actionName = AgentKitActionName.SUBMIT_TOPIC_MESSAGE_NON_CUSTODIAL;
    }

    getRawResponse(): string {
        return this.txBytes;
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Submit message to the topic transaction bytes have been successfully created.",
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}
