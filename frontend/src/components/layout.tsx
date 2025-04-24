'use client';

import Image from "next/image";
import Header from "./ui/Header";
import { useWalletInterface } from "@/hooks/use-wallet-interface";
import SignIn from "./sign-in";
import { useState } from "react";
import { WalletSelectionDialog } from "./wallet-selection-dialog";

const HeroAnimation = () => {
    return (
        <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-30"></div>
            {/* Hexagon grid pattern */}
            <svg
                className="absolute inset-0 w-full h-full opacity-10"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <pattern
                        id="hexagons"
                        width="50"
                        height="43.4"
                        patternUnits="userSpaceOnUse"
                        patternTransform="scale(2)"
                    >
                        <path
                            d="M25 0 L50 14.4 L50 38.6 L25 53 L0 38.6 L0 14.4 Z"
                            fill="none"
                            stroke="#00FF88"
                            strokeWidth="1"
                        />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#hexagons)" />
            </svg>

            {/* Static glow */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
                style={{
                    background:
                        "radial-gradient(circle at center, rgba(0,255,136,0.2) 0%, transparent 70%)",
                }}
            />
        </div>
    );
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { accountId } = useWalletInterface()
    const [open, setOpen] = useState(false)
    return (
        <div className="min-h-screen flex flex-col sen">
            <div className="min-h-screen flex flex-col">
                <Header />
                <HeroAnimation />
                {
                    accountId != null ? children :

                        <SignIn setOpen={setOpen} />
                }
                <WalletSelectionDialog open={open} setOpen={setOpen} onClose={() => setOpen(false)} />
            </div>
        </div>
    );
}