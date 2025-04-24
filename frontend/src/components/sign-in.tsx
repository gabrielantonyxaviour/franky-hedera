"use client";

import { useState, FormEvent, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

// Lucide icons can be directly imported
import { MailIcon, ArrowLeftIcon, Boxes, Sliders, Globe } from "lucide-react";
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

interface GlowInputProps {
    id: string;
    type?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
}

interface GlowLabelProps {
    htmlFor: string;
    children: ReactNode;
}

interface GlowCardProps {
    children: ReactNode;
}

interface GlowCardHeaderProps {
    children: ReactNode;
}

interface GlowCardTitleProps {
    children: ReactNode;
}

interface GlowCardDescriptionProps {
    children: ReactNode;
}

interface GlowCardContentProps {
    children: ReactNode;
}

interface GlowCardFooterProps {
    children: ReactNode;
}

interface GlowAlertProps {
    children: ReactNode;
}

interface OTPInputProps {
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
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

const GlowInput = ({
    id,
    type = "text",
    value,
    onChange,
    placeholder,
    required = false
}: GlowInputProps) => {
    return (
        <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className="w-full bg-black/30 border border-[#00FF88]/30 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#00FF88]/50 focus:border-transparent backdrop-blur-sm"
        />
    );
};

const GlowLabel = ({ htmlFor, children }: GlowLabelProps) => {
    return (
        <label
            htmlFor={htmlFor}
            className="text-[#00FF88] mb-1 block font-medium"
        >
            {children}
        </label>
    );
};

const GlowCard = ({ children }: GlowCardProps) => {
    return (
        <div className="bg-black/40 backdrop-blur-md border border-[#00FF88]/20 rounded-xl overflow-hidden shadow-lg shadow-[#00FF88]/5">
            {children}
        </div>
    );
};

const GlowCardHeader = ({ children }: GlowCardHeaderProps) => {
    return (
        <div className="px-6 pt-6 pb-3">
            {children}
        </div>
    );
};

const GlowCardTitle = ({ children }: GlowCardTitleProps) => {
    return (
        <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
            {children}
        </h3>
    );
};

const GlowCardDescription = ({ children }: GlowCardDescriptionProps) => {
    return (
        <p className="text-[#AAAAAA]">
            {children}
        </p>
    );
};

const GlowCardContent = ({ children }: GlowCardContentProps) => {
    return (
        <div className="px-6 py-4">
            {children}
        </div>
    );
};

const GlowCardFooter = ({ children }: GlowCardFooterProps) => {
    return (
        <div className="px-6 pt-2 pb-6 flex justify-center">
            {children}
        </div>
    );
};

const GlowAlert = ({ children }: GlowAlertProps) => {
    return (
        <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
            {children}
        </div>
    );
};

// OTP input components
const OTPInput = ({ value, onChange, maxLength = 6 }: OTPInputProps) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const newValue = [...value];
        newValue[index] = e.target.value;
        onChange(newValue.join(''));

        // Auto-focus next input
        if (e.target.value && index < maxLength - 1) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        // Handle backspace
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const inputs = [];
    for (let i = 0; i < maxLength; i++) {
        inputs.push(
            <input
                key={i}
                id={`otp-${i}`}
                type="text"
                maxLength={1}
                value={value[i] || ''}
                onChange={(e) => handleInputChange(e, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className="w-12 h-12 text-center bg-black/30 border border-[#00FF88]/30 text-[#00FF88] rounded-lg mx-1 focus:outline-none focus:ring-2 focus:ring-[#00FF88]/50 focus:border-transparent backdrop-blur-sm text-xl"
            />
        );

        // Add separator after the third input
        if (i === 2) {
            inputs.push(
                <span key="separator" className="mx-2 text-[#00FF88]">-</span>
            );
        }
    }

    return (
        <div className="flex justify-center items-center my-4">
            {inputs}
        </div>
    );
};

// Type definitions for auth functions
interface SendCodeParams {
    email: string;
}

interface LoginWithCodeParams {
    code: string;
}

interface AuthResponse {
    success: boolean;
}

export default function SignIn({ setOpen }: {
    setOpen: (val: boolean) => void;
}) {
    const [email, setEmail] = useState<string>("");
    const [code, setCode] = useState<string>("");
    const [showEmailForm, setShowEmailForm] = useState<boolean>(false);
    const [showOTPForm, setShowOTPForm] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const router = useRouter();
    const { accountId, walletInterface } = useWalletInterface();
    // const { createWallet } = useCreateWallet({
    //     onSuccess: ({ wallet }) => {
    //         console.log('Created wallet ', wallet);
    //     },
    //     onError: (error) => {
    //         console.error('Failed to create wallet with error ', error)
    //     }
    // });
    // const { sendCode, loginWithCode } = useLoginWithEmail({
    //     onComplete: (data) => {
    //         console.log("Login successful:", data);
    //         const { linkedAccounts } = data.user
    //         const account = linkedAccounts.find((account) => account.type === "wallet" && account.chainType === "ethereum");
    //         if (account) {
    //             console.log("Account found:", account);
    //         } else {
    //             console.log("No account found, creating a new wallet");
    //             createWallet()
    //         }
    //     }
    // });

    // Function to handle initial button click
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
            {!showEmailForm && !showOTPForm && (
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
                        Recycle your old mobile devices into AI agents and earn $FIL.
                    </p>
                </motion.div>
            )}

            {!showEmailForm && !showOTPForm && (
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
            )}
        </div>


    );
}