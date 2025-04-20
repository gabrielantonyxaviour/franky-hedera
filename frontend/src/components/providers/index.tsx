"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from '@privy-io/react-auth/smart-wallets';
import { filecoin, filecoinCalibration } from 'viem/chains'

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
            clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || ""}
            config={{
                appearance: {
                    theme: "dark",
                    accentColor: "#00FF88",
                    logo: "/logo.png",
                },
                embeddedWallets: {
                    createOnLogin: "users-without-wallets",
                },
                defaultChain: filecoinCalibration,
                supportedChains: [filecoin, filecoinCalibration]
            }}
        >
            <SmartWalletsProvider>
                {children}
            </SmartWalletsProvider>
        </PrivyProvider>
    );
}
