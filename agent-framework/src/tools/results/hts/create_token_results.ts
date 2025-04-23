import { BaseResult } from "../base_result";
import { TokenId } from "@hashgraph/sdk";
import { AgentKitActionName } from "../../../types";

export type CreateTokenResult = {
    status: string,
    txHash: string,
    tokenId: TokenId,
}

export class CustodialCreateTokenResult implements BaseResult<CreateTokenResult> {
    actionName: AgentKitActionName;

    constructor(
        public readonly txHash: string,
        public readonly status: string,
        public readonly tokenId: TokenId,
    ) {
        this.actionName = AgentKitActionName.CREATE_TOKEN_CUSTODIAL;
    }

    getRawResponse(): CreateTokenResult {
        return {
            status: this.status.toLowerCase(),
            txHash: this.txHash,
            tokenId: this.tokenId,
        };
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: this.status.toLowerCase(),
            message: "Token created",
            txHash: this.txHash,
            tokenId: this.tokenId.toString(),
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}

export class NonCustodialCreateTokenResult implements BaseResult<string> {
    actionName: AgentKitActionName;

    constructor(public readonly txBytes: string) {
        this.actionName = AgentKitActionName.CREATE_TOKEN_NON_CUSTODIAL;
    }

    getRawResponse(): string {
        return this.txBytes;
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "Create token transaction bytes have been successfully created.",
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}
