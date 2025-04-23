import { AccountId, TokenId } from "@hashgraph/sdk";
import { BaseTransactionBuilder } from "./base_transaction_builder";
import { AssetAllowanceStrategy } from "../strategies";
import {AssetAllowanceResult} from "../../results";


export class AccountTransactionBuilder {
    /**
     *
     * @param spenderAccount - id of an account getting spending allowance
     * @param amount - amount of allowance in base unit
     * @param issuerAccountId - id of an account giving spending allowance
     * @param tokenId - id of token to be allowed for spending, if not passed defaults to allowance for HBAR
     */
    static approveAssetAllowance(
        spenderAccount: AccountId | string,
        amount: number,
        issuerAccountId: AccountId | string,
        tokenId?: TokenId,
    ): BaseTransactionBuilder<AssetAllowanceResult> {
        const strategy = new AssetAllowanceStrategy(tokenId, amount, issuerAccountId, spenderAccount);
        return new BaseTransactionBuilder(strategy);
    }
}