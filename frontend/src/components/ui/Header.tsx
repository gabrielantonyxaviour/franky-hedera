"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useWalletInterface } from '@/hooks/use-wallet-interface';
import { useRef, useState } from "react";
import { LogOut, User, UserCircle } from "lucide-react";
import { shortenAddress } from "@/lib/utils";

export default function Header() {
  const [open, setOpen] = useState(false);
  const { accountId, walletInterface } = useWalletInterface();
  const [showLogout, setShowLogout] = useState(false);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userProfileRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<string>('0');

  const handleMouseEnter = () => {
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }
    setShowLogout(true);
  };

  const handleMouseLeave = () => {
    logoutTimeoutRef.current = setTimeout(() => {
      setShowLogout(false);
    }, 500);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/50 backdrop-blur-md border-b border-[#00FF88] border-opacity-20">
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
                frankyagent.xyz
              </span>
            </motion.div>
          </Link>

          {accountId && <div className="flex items-center gap-4">
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
                    src="/fil.png"
                    alt="Token Logo"
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                  <span className="text-[#00FF88] font-medium">
                    {balance.toLocaleLowerCase()}
                  </span>
                  <span className="text-[#00FF88]/70">
                    {`tFIL`}
                  </span>
                  {/* <span className="text-[#00FF88]/50 text-sm">
                    ${(parseFloat(balance) * 2.5).toFixed(2)}
                  </span> */}
                </div>
              ) : null}
            </motion.div>
            <div className="flex flex-1 items-center justify-end space-x-4 relative">
              {accountId && (
                <div
                  ref={userProfileRef}
                  className="flex space-x-3 items-center cursor-pointer text-[#AAAAAA]"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <User size={22} />
                  <p className="cursor-pointer">{shortenAddress(accountId as `0x${string}`)}</p>

                  {/* Dropdown with Profile and Logout options */}
                  <AnimatePresence>
                    {showLogout && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-2 z-50"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className="bg-black border border-[#00FF88] border-opacity-20 rounded overflow-hidden flex flex-col">
                          {/* Profile option */}
                          <Link href="/profile">
                            <div className="cursor-pointer flex space-x-2 items-center hover:bg-black/80 text-[#AAAAAA] px-4 py-2 transition-colors">
                              <UserCircle size={20} className="text-[#AAAAAA]" />
                              <p className="text-sm">Profile</p>
                            </div>
                          </Link>

                          {/* Divider */}
                          <div className="h-px bg-[#00FF88] bg-opacity-10"></div>

                          <div
                            onClick={() => {
                              walletInterface.disconnect()
                            }}
                            className="cursor-pointer flex space-x-2 items-center hover:bg-black/80 text-[#AAAAAA] px-4 py-2 transition-colors"
                          >
                            <LogOut size={20} className="text-[#AAAAAA]" />
                            <p className="text-sm">Log out</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>}
        </div>
      </header>
    </>
  );
}