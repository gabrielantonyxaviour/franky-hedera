"use client";

import { useTokenBalance } from "@/hooks/useTokenBalance";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { FiUser } from "react-icons/fi";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, User } from "lucide-react";

export default function Header() {
  const { balance, isLoading } = useTokenBalance();
  const { user, logout } = usePrivy();
  const [showLogout, setShowLogout] = useState(false);

  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }
    setShowLogout(true);
  };

  const handleMouseLeave = () => {
    logoutTimeoutRef.current = setTimeout(() => {
      setShowLogout(false);
    }, 200); // 200ms delay
  };

  return (
    <>

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
                frankyagent.xyz
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

            <div className="flex flex-1  items-center justify-end space-x-4 " >
              {/* Placeholder for Auth/User Actions */}
              {/* <button>Login</button> */}
              {
                user && <div className='flex space-x-3 items-center cursor-pointer text-[#AAAAAA] ' onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}><User size={22} /><p className='cursor-pointer '>{user.email?.address}</p></div>
              }

            </div>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {showLogout && <motion.div initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }} className='flex justify-end px-20 '
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div onClick={() => {
            logout()
            setShowLogout(false)
          }} className='absolute cursor-pointer flex space-x-2 items-center bg-black  hover:bg-black/2 text-[#AAAAAA] border border-[#00FF88] border-opacity-20'><LogOut size={20} className='ml-12 mt-[68px] mb-3 text-[#AAAAAA] ' /><p className='pr-12 pt-[68px] pb-3 text-sm'>Log out</p></div>
        </motion.div>}</AnimatePresence></>

  );
}