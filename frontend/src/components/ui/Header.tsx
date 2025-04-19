"use client";

import { useTokenBalance } from "@/hooks/useTokenBalance";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiUser } from "react-icons/fi";
import Image from "next/image";
import { useAppKitAccount } from "@reown/appkit/react";

export default function Header() {
  const { balance, isLoading } = useTokenBalance();
  const { embeddedWalletInfo } = useAppKitAccount();

  // Get user info from Google auth if available
  const isGoogleUser = embeddedWalletInfo?.authProvider === "google";
  const userEmail = embeddedWalletInfo?.user?.email;
  const userName = embeddedWalletInfo?.user?.username;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-[#00FF88] border-opacity-20">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/">
          <motion.div
            className="flex items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Image
              src="/logo.png"
              alt="Franky Logo"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="ml-4 text-2xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
              frankyagents.xyz
            </span>
          </motion.div>
        </Link>

        <div className="flex items-center gap-4">
          {/* Balance Display */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center"
          >
            {isLoading ? (
              <div className="text-[#00FF88] opacity-50">Loading...</div>
            ) : balance ? (
              <div className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="Token Logo"
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                <span className="text-[#00FF88] font-medium">
                  {balance.balance.toLocaleString()}
                </span>
                <span className="text-[#00FF88]/70">
                  {`$${balance.tokenSymbol}`}
                </span>
                <span className="text-[#00FF88]/50 text-sm">
                  ($
                  {balance.usdValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  )
                </span>
              </div>
            ) : null}
          </motion.div>

          <Link href="/dashboard">
            <motion.button
              className="px-4 py-2 rounded-lg bg-[#00FF88] bg-opacity-10 text-[#00FF88] hover:bg-opacity-20 transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiUser />
            </motion.button>
          </Link>
        </div>
      </div>
    </header>
  );
}