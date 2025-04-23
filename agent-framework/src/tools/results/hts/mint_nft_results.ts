import { BaseResult } from "../base_result";
import { AgentKitActionName } from "../../../types";

export type MintNFTResult = {
    status: string,
    txHash: string,
}

export class CustodialMintNFTResult implements BaseResult<MintNFTResult> {
    actionName: AgentKitActionName;

    constructor(
        public readonly txHash: string,
        public readonly status: string
    ) {
        this.actionName = AgentKitActionName.MINT_NFT_TOKEN_CUSTODIAL;
    }

    getRawResponse(): MintNFTResult {
        return {
            status: this.status.toLowerCase(),
            txHash: this.txHash,
        };
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: this.status.toLowerCase(),
            message: "NFT minted",
            txHash: this.txHash
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}

export class NonCustodialMintNFTResult implements BaseResult<string> {
    actionName: AgentKitActionName;

    constructor(public readonly txBytes: string) {
        this.actionName = AgentKitActionName.MINT_NFT_TOKEN_NON_CUSTODIAL;
    }

    getRawResponse(): string {
        return this.txBytes;
    }

    getStringifiedResponse(): string {
        return JSON.stringify({
            status: "success",
            txBytes: this.txBytes,
            message: "NFT mint transaction bytes have been successfully created.",
        });
    }

    getName(): AgentKitActionName {
        return this.actionName;
    }
}
