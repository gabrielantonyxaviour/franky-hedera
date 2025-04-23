import { BaseResult } from "../base_result";
import { AgentKitActionName } from "../../../types";

export type AssetAllowanceResult = {
    status: string,
    txHash: string,
}

export class CustodialAssetAllowanceResult implements BaseResult<AssetAllowanceResult> {
    actionName: AgentKitActionName;

    constructor(
        public readonly txHash: string,
        public readonly status: string
    ) {
        this.actionName = AgentKitActionName.ASSET_ALLOWANCE_CUSTODIAL;
    }

    getRawResponse(): AssetAllowanceResult {
        return {
            status: this.status,
            txHash: this.txHash,
        };
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: this.status,
            message: "Asset allowance created",
            txHash: this.txHash
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}

export class NonCustodialAssetAllowanceResult implements BaseResult<string> {
    actionName: AgentKitActionName;

    constructor(public readonly txBytes: string) {
        this.actionName = AgentKitActionName.ASSET_ALLOWANCE_NON_CUSTODIAL;
    }

    getRawResponse(): string {
        return this.txBytes;
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Asset allowance transaction bytes have been successfully created.",
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}
