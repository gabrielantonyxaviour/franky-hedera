"use client";

import { AllWalletsProvider } from "@/services/provider";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AllWalletsProvider>
            {children}
        </AllWalletsProvider>
    );
}
