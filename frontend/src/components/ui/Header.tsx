'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Header() {
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
            <LogoSvg />
            <span className="ml-2 text-2xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">FRANKY</span>
          </motion.div>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link href="/create-agent">
            <motion.button
              className="px-4 py-2 rounded-lg bg-[#00FF88] bg-opacity-10 text-[#00FF88] hover:bg-opacity-20 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Create Agent
            </motion.button>
          </Link>
        </div>
      </div>
    </header>
  )
}

// Simple SVG logo component
function LogoSvg() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <motion.path
        d="M16 2L30 16L16 30L2 16L16 2Z"
        stroke="#00FF88"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
      <motion.circle
        cx="16"
        cy="16"
        r="6"
        fill="#00FF88"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.7 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      />
    </svg>
  )
} 