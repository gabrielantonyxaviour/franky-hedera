import { BaseResult } from "../base_result";
import { AgentKitActionName } from "../../../types";

export type ClaimAirdropResult = {
    status: string,
    txHash: string,
}

export class CustodialClaimAirdropResult implements BaseResult<ClaimAirdropResult> {
    actionName: AgentKitActionName;

    constructor(
        public readonly txHash: string,
        public readonly status: string
    ) {
        this.actionName = AgentKitActionName.CLAIM_AIRDROP_CUSTODIAL;
    }

    getRawResponse(): ClaimAirdropResult {
        return {
            status: this.status.toLowerCase(),
            txHash: this.txHash,
        };
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: this.status.toLowerCase(),
            message: "Airdrop claimed",
            txHash: this.txHash
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}

export class NonCustodialClaimAirdropResult implements BaseResult<string> {
    actionName: AgentKitActionName;

    constructor(public readonly txBytes: string) {
        this.actionName = AgentKitActionName.CLAIM_AIRDROP_NON_CUSTODIAL;
    }

    getRawResponse(): string {
        return this.txBytes;
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Claim airdrop transaction bytes have been successfully created.",
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}
