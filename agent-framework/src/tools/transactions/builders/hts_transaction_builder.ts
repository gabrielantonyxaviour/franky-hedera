import { AccountId, PendingAirdropId, PublicKey, TokenId } from "@hashgraph/sdk";
import { BaseTransactionBuilder } from "./base_transaction_builder";
import {
    AirdropRecipient,
    AirdropTokenStrategy,
    AssociateTokenStrategy,
    ClaimAirdropStrategy,
    CreateTokenOptions,
    CreateTokenStrategy,
    DissociateTokenStrategy,
    MintNftStrategy,
    MintTokenStrategy,
    RejectTokenStrategy,
    TransferTokenStrategy
} from "../strategies";
import {
    AirdropResult,
    ClaimAirdropResult,
    CreateTokenResult,
    DissociateTokenResult,
    MintNFTResult, MintTokenResult, RejectTokenResult, TransferTokenResult
} from "../../results";


export class HtsTransactionBuilder {
    static airdropToken(
        tokenId: TokenId | string,
        recipients: AirdropRecipient[],
        issuerAccountId: string | AccountId,
    ): BaseTransactionBuilder<AirdropResult> {
        const strategy = new AirdropTokenStrategy(tokenId, recipients, issuerAccountId);
        return new BaseTransactionBuilder<AirdropResult>(strategy);
    }

    static associateToken(
        tokenId: string | TokenId,
        issuerAccountId: string | AccountId,
    ): BaseTransactionBuilder<AirdropResult> {
        const strategy = new AssociateTokenStrategy(tokenId, issuerAccountId);
        return new BaseTransactionBuilder<AirdropResult>(strategy);
    }

    static claimAirdrop(
        airdropId: PendingAirdropId
    ): BaseTransactionBuilder<ClaimAirdropResult> {
        const strategy = new ClaimAirdropStrategy(airdropId);
        return new BaseTransactionBuilder<ClaimAirdropResult>(strategy);
    }

    static createToken(
        options: CreateTokenOptions,
        publicKey: PublicKey,
        issuerAccountId: string | AccountId,
    ): BaseTransactionBuilder<CreateTokenResult> {
        const strategy = new CreateTokenStrategy(options, publicKey, issuerAccountId);
        return new BaseTransactionBuilder<CreateTokenResult>(strategy);
    }

    static dissociateToken(
        tokenId: string | TokenId,
        issuerAccountId: string | AccountId,
    ): BaseTransactionBuilder<DissociateTokenResult> {
        const strategy = new DissociateTokenStrategy(tokenId, issuerAccountId);
        return new BaseTransactionBuilder<DissociateTokenResult>(strategy);
    }

    static mintNft(
        tokenId: string | TokenId,
        tokenMetadata: Uint8Array,
    ): BaseTransactionBuilder<MintNFTResult> {
        const strategy = new MintNftStrategy(tokenId, tokenMetadata);
        return new BaseTransactionBuilder<MintNFTResult>(strategy);
    }

    static mintToken(
        tokenId: string | TokenId,
        amount: number,
    ): BaseTransactionBuilder<MintTokenResult> {
        const strategy = new MintTokenStrategy(tokenId, amount);
        return new BaseTransactionBuilder<MintTokenResult>(strategy);
    }

    static rejectToken(
        tokenId: TokenId,
        issuerAccountId: AccountId,
    ): BaseTransactionBuilder<RejectTokenResult> {
        const strategy = new RejectTokenStrategy(tokenId, issuerAccountId);
        return new BaseTransactionBuilder<RejectTokenResult>(strategy);
    }

    static transferToken(
        tokenId: TokenId | string,
        amount: number,
        targetAccountId: AccountId | string,
        issuerAccountId: AccountId | string,
    ): BaseTransactionBuilder<TransferTokenResult> {
        const strategy = new TransferTokenStrategy(tokenId, amount, targetAccountId, issuerAccountId);
        return new BaseTransactionBuilder<TransferTokenResult>(strategy);
    }
}