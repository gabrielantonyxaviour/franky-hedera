import { BaseResult } from "../base_result";
import { AgentKitActionName } from "../../../types";

export type TransferHBARResult = {
    status: string,
    txHash: string,
}

export class CustodialTransferHbarResult implements BaseResult<TransferHBARResult> {
    actionName: AgentKitActionName;

    constructor(
        public readonly txHash: string,
        public readonly status: string
    ) {
        this.actionName = AgentKitActionName.TRANSFER_HBAR_CUSTODIAL;
    }

    getRawResponse(): TransferHBARResult {
        return {
            status: this.status,
            txHash: this.txHash,
        };
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: this.status,
            message: "HBAR transferred",
            txHash: this.txHash
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}

export class NonCustodialTransferHbarResult implements BaseResult<string> {
    actionName: AgentKitActionName;

    constructor(public readonly txBytes: string) {
        this.actionName = AgentKitActionName.TRANSFER_HBAR_NON_CUSTODIAL;
    }

    getRawResponse(): string {
        return this.txBytes;
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "HBAR transfer transaction bytes have been successfully created.",
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}
