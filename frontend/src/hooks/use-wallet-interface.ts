'use client'
import { useContext } from "react"
import { MetamaskContext } from "../context/metamask";
import { metamaskWallet } from "../services/metamask";

export const useWalletInterface = () => {
    const metamaskCtx = useContext(MetamaskContext);
    if (metamaskCtx.metamaskAccountAddress) {
        return {
            accountId: metamaskCtx.metamaskAccountAddress,
            walletInterface: metamaskWallet
        };
    } else {
        return {
            accountId: null,
            walletInterface: null
        };
    }
}