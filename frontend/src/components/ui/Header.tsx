"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

export default function Header() {
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

          <div className="flex items-center gap-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center"
            >
              <nav className="flex items-center gap-6">
                <Link href="/marketplace" className="text-white hover:text-[#00FF88] transition-colors">
                  Marketplace
                </Link>
                <Link href="/create-agent" className="text-white hover:text-[#00FF88] transition-colors">
                  Create Agent
                </Link>
              </nav>
            </motion.div>
          </div>
        </div>
      </header>
      <div className="h-16"></div> {/* Spacer for fixed header */}
    </>
  );
}