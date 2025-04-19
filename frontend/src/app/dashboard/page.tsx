"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import Link from "next/link";
import HeaderWalletWrapper from "@/components/wallet/HeaderWalletWrapper";
import { useAppKitAccount } from "@reown/appkit/react";

export default function DashboardPage() {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);
  const { embeddedWalletInfo } = useAppKitAccount();

  // Get user info from Google auth if available
  const isGoogleUser = embeddedWalletInfo?.authProvider === "google";
  const userEmail = embeddedWalletInfo?.user?.email;
  const userName = embeddedWalletInfo?.user?.username;

  // Debug logs
  useEffect(() => {
    if (mounted) {
      console.log("Embedded Wallet Info:", embeddedWalletInfo);
      console.log("Is Google User:", isGoogleUser);
      console.log("User Email:", userEmail);
      console.log("User Name:", userName);
    }
  }, [mounted, embeddedWalletInfo, isGoogleUser, userEmail, userName]);

  // Fix hydration issues by waiting for component to mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a loading state until mounted to avoid hydration errors
  if (!mounted) {
    return (
      <div className="pt-24 min-h-screen bg-gradient-to-b from-black to-emerald-950/20">
        <div className="container mx-auto px-4 pb-16">
          <motion.h1
            className="text-3xl md:text-4xl font-bold mb-10 text-center bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Your Profile
          </motion.h1>
          <div className="text-center py-20 text-white/70">
            <p className="text-xl">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-gradient-to-b from-black to-emerald-950/20">
      <div className="container mx-auto px-4 pb-16">
        <motion.h1
          className="text-3xl md:text-4xl font-bold mb-10 text-center bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Your Profile
        </motion.h1>

        <div className="max-w-2xl mx-auto">
          <motion.div
            className="bg-black/30 backdrop-blur-sm border border-[#00FF88]/20 rounded-lg p-8 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6 text-center">
              <div className="inline-block p-4 bg-[#00FF88]/10 rounded-full mb-4">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
                    stroke="#00FF88"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21"
                    stroke="#00FF88"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Modified condition to show user info */}
              {embeddedWalletInfo?.user && (
                <motion.div
                  className="mb-4 space-y-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  {embeddedWalletInfo.user.username && (
                    <h3 className="text-lg font-medium text-[#00FF88]">
                      {embeddedWalletInfo.user.username}
                    </h3>
                  )}
                  {embeddedWalletInfo.user.email && (
                    <p className="text-[#00FF88]/70 text-lg">
                      {embeddedWalletInfo.user.email}
                    </p>
                  )}
                </motion.div>
              )}

              <div className="flex justify-center">
                <HeaderWalletWrapper />
                <motion.button
                  className="ml-4 px-4 py-2 bg-gradient-to-r from-[#00FF88]/20 to-emerald-700/20 hover:from-[#00FF88]/30 hover:to-emerald-700/30 border border-[#00FF88]/40 rounded-md text-sm font-medium text-[#00FF88] transition-all duration-300 flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    const request = await fetch("/api/distribute", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ address }),
                    });
                    const data = await request.json();
                    console.log("Faucet response:", data);
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L15 8L21 9L16.5 14L18 20L12 17L6 20L7.5 14L3 9L9 8L12 2Z"
                      stroke="#00FF88"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  $FRANKY faucet
                </motion.button>
              </div>
            </div>

            {address && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <Link href="/dashboard/agents">
                  <motion.div
                    className="flex flex-col items-center justify-center p-6 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-lg hover:bg-[#00FF88]/10 transition-colors cursor-pointer"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="w-14 h-14 flex items-center justify-center bg-[#00FF88]/10 rounded-full mb-3">
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 2L20 7V17L12 22L4 17V7L12 2Z"
                          stroke="#00FF88"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="#00FF88"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white">
                      My Agents
                    </h3>
                    <p className="text-white/60 text-sm text-center mt-1">
                      View and manage your registered agents
                    </p>
                  </motion.div>
                </Link>

                <Link href="/dashboard/devices">
                  <motion.div
                    className="flex flex-col items-center justify-center p-6 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-lg hover:bg-[#00FF88]/10 transition-colors cursor-pointer"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="w-14 h-14 flex items-center justify-center bg-[#00FF88]/10 rounded-full mb-3">
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          x="2"
                          y="4"
                          width="20"
                          height="16"
                          rx="2"
                          stroke="#00FF88"
                          strokeWidth="1.5"
                        />
                        <path d="M2 10H22" stroke="#00FF88" strokeWidth="1.5" />
                        <circle
                          cx="12"
                          cy="16"
                          r="2"
                          stroke="#00FF88"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white">
                      My Devices
                    </h3>
                    <p className="text-white/60 text-sm text-center mt-1">
                      View and manage your registered devices
                    </p>
                  </motion.div>
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
