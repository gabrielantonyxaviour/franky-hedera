import { ReactNode } from "react"
import { MetamaskContextProvider } from "../context/metamask"
import { MetaMaskClient } from "./metamask"

export const AllWalletsProvider = (props: {
    children: ReactNode | undefined
}) => {
    return (
        <MetamaskContextProvider>
                <MetaMaskClient />
                {props.children}
        </MetamaskContextProvider>
    )
}