import { BaseResult } from "../base_result";
import { AgentKitActionName } from "../../../types";

export type RejectTokenResult = {
    status: string,
    txHash: string,
}


export class CustodialRejectTokenResult implements BaseResult<RejectTokenResult> {
    actionName: AgentKitActionName;

    constructor(
        public readonly txHash: string,
        public readonly status: string
    ) {
        this.actionName = AgentKitActionName.REJECT_TOKEN_CUSTODIAL;
    }

    getRawResponse(): RejectTokenResult {
        return {
            status: this.status.toLowerCase(),
            txHash: this.txHash,
        };
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: this.status.toLowerCase(),
            message: "Token rejected",
            txHash: this.txHash
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}

export class NonCustodialRejectTokenResult implements BaseResult<string> {
    actionName: AgentKitActionName;

    constructor(public readonly txBytes: string) {
        this.actionName = AgentKitActionName.REJECT_TOKEN_NON_CUSTODIAL;
    }

    getRawResponse(): string {
        return this.txBytes;
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Token reject transaction bytes have been successfully created.",
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}
