import { ReactNode } from "react"
import { MetamaskContextProvider } from "../context/metamask"
import { WalletConnectContextProvider } from "../context/walletconnect"
import { MetaMaskClient } from "./metamask"
import { WalletConnectClient } from "./walletconnect"

export const AllWalletsProvider = (props: {
    children: ReactNode | undefined
}) => {
    return (
        <MetamaskContextProvider>
            <WalletConnectContextProvider>
                <MetaMaskClient />
                <WalletConnectClient />
                {props.children}
            </WalletConnectContextProvider>
        </MetamaskContextProvider>
    )
}