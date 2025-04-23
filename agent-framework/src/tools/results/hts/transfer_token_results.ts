import { BaseResult } from "../base_result";
import { AgentKitActionName } from "../../../types";

export type TransferTokenResult = {
    status: string,
    txHash: string,
}


export class CustodialTransferTokenResult implements BaseResult<TransferTokenResult> {
    actionName: AgentKitActionName;

    constructor(
        public readonly txHash: string,
        public readonly status: string
    ) {
        this.actionName = AgentKitActionName.TRANSFER_TOKEN_NON_CUSTODIAL;
    }

    getRawResponse(): TransferTokenResult {
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

export class NonCustodialTransferTokenResult implements BaseResult<string> {
    actionName: AgentKitActionName;

    constructor(public readonly txBytes: string) {
        this.actionName = AgentKitActionName.TRANSFER_TOKEN_CUSTODIAL;
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
