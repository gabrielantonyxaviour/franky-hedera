import { BaseResult } from "../base_result";
import { AgentKitActionName } from "../../../types";

export type MintTokenResult = {
    status: string,
    txHash: string,
}

export class CustodialMintTokenResult implements BaseResult<MintTokenResult> {
    actionName: AgentKitActionName;

    constructor(
        public readonly txHash: string,
        public readonly status: string
    ) {
        this.actionName = AgentKitActionName.MINT_TOKEN_CUSTODIAL;
    }

    getRawResponse(): MintTokenResult {
        return {
            status: this.status.toLowerCase(),
            txHash: this.txHash,
        };
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: this.status.toLowerCase(),
            message: "Token minted",
            txHash: this.txHash
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}

export class NonCustodialMintTokenResult implements BaseResult<string> {
    actionName: AgentKitActionName;

    constructor(public readonly txBytes: string) {
        this.actionName = AgentKitActionName.MINT_TOKEN_NON_CUSTODIAL;
    }

    getRawResponse(): string {
        return this.txBytes;
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Token mint transaction bytes have been successfully created.",
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}
