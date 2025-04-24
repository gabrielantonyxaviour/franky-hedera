'use client'
import { useContext } from "react"
import { MetamaskContext } from "../context/metamask";
import { WalletConnectContext } from "../context/walletconnect";
import { metamaskWallet } from "../services/metamask";
import { walletConnectWallet } from "../services/walletconnect";

export const useWalletInterface = () => {
    const metamaskCtx = useContext(MetamaskContext);
    const walletConnectCtx = useContext(WalletConnectContext);

    if (metamaskCtx.metamaskAccountAddress) {
        return {
            accountId: metamaskCtx.metamaskAccountAddress,
            walletInterface: metamaskWallet
        };
    } else if (walletConnectCtx.accountId) {
        return {
            accountId: walletConnectCtx.accountId,
            walletInterface: walletConnectWallet
        }
    } else {
        return {
            accountId: null,
            walletInterface: null
        };
    }
}