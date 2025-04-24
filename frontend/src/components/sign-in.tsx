"use client";

import { useState, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import Image from "next/image";
import { useWalletInterface } from "@/hooks/use-wallet-interface";

// TypeScript interfaces for component props
interface GlowButtonProps {
    children: ReactNode;
    onClick?: () => void;
    variant?: "default" | "outline" | "ghost" | "dark";
    disabled?: boolean;
    className?: string;
    type?: "button" | "submit" | "reset";
}


// Styled components based on your neon green theme
const GlowButton = ({
    children,
    onClick,
    variant = "default",
    disabled = false,
    className = "",
    type = "button",
}: GlowButtonProps) => {
    const baseClasses = "relative overflow-hidden px-6 py-3 rounded-xl backdrop-blur-sm cursor-pointer flex items-center justify-center";

    const variantClasses = {
        default: "bg-black/50 border border-[#00FF88] border-opacity-50 text-[#00FF88] hover:bg-black/70",
        outline: "bg-transparent border border-[#00FF88] border-opacity-30 text-[#00FF88] hover:bg-black/30",
        ghost: "bg-transparent border-none text-[#00FF88] hover:bg-black/20",
        dark: "bg-black/80 border border-[#00FF88] border-opacity-30 text-white hover:text-[#00FF88]"
    };

    const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

    return (
        <button
            type={type}
            className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            <span className="relative z-10 font-medium">
                {children}
            </span>

            {/* Glow effect */}
            <div
                className="absolute -inset-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                    background: "radial-gradient(circle at center, rgba(0,255,136,0.2) 0%, transparent 70%)",
                }}
            />
        </button>
    );
};

export default function SignIn({ setOpen }: {
    setOpen: (val: boolean) => void;
}) {
    const { accountId, walletInterface } = useWalletInterface();

    const handleInitialClick = (): void => {
        if (accountId) {
            walletInterface.disconnect();
        } else {
            setOpen(true);
        }
    };

    useEffect(() => {
        if (accountId) {
            setOpen(false);
        }
    }, [accountId])


    return (

        <div className="flex flex-col justify-center max-w-2xl mx-auto w-full h-screen">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center "
            >
                <p className="text-lg md:text-xl mb-3 text-[#AAAAAA] max-w-3xl mx-auto">
                    Introducing
                </p>
                <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
                    Green AI Agents
                </h1>
                <p className="text-xl md:text-2xl mb-10 text-[#AAAAAA] max-w-3xl mx-auto">
                    Recycle your old mobile devices into AI agents and earn $HBAR.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mx-auto w-full max-w-md"
            >
                <GlowButton
                    onClick={handleInitialClick}
                    className="text-lg mx-auto"
                >
                    <div className="flex space-x-2 items-center">
                        <Image src={'/hedera.png'} width={24} height={24} alt="hedera" className="rounded-full border border-white" />
                        <p>Log in with Hedera</p>
                    </div>
                </GlowButton>
            </motion.div>
        </div>


    );
}