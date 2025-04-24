'use client'

import { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { FiCopy, FiCheck, FiSmartphone, } from 'react-icons/fi'
import { Zap } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import for DeviceVerification to avoid SSR issues
const DeviceVerification = dynamic(
  () => import('./verification').then(mod => mod.DeviceVerification),
  { ssr: false }
)
// CodeBlock component for displaying commands with copy functionality
const CodeBlock = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  return (
    <div className="relative mt-3 mb-6 rounded-lg overflow-hidden w-full">
      <div className="bg-black/70 backdrop-blur-sm border border-[#00FF88] border-opacity-30 p-5 font-mono text-sm md:text-base overflow-x-auto">
        <code className="text-[#00FF88]">{code}</code>
      </div>
      <button
        onClick={copyToClipboard}
        className="absolute top-3 right-3 p-2 rounded-md bg-black/50 hover:bg-black/80 text-[#00FF88] transition-colors"
        aria-label="Copy to clipboard"
      >
        {copied ? <FiCheck /> : <FiCopy />}
      </button>
    </div>
  )
}

// Instruction Step component
const InstructionStep = ({
  number,
  title,
  icon,
  children
}: {
  number: number,
  title: string,
  icon: React.ReactNode,
  children: React.ReactNode
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: number * 0.1 }}
      className="mb-12 p-8 rounded-xl border border-[#00FF88] border-opacity-30 bg-black/50 backdrop-blur-sm"
    >
      <div className="flex items-center mb-5">
        <div className="flex justify-center items-center h-12 w-12 rounded-full bg-[#00FF88] bg-opacity-20 text-[#00FF88] mr-4">
          {icon}
        </div>
        <h3 className="text-2xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
          Step {number}: {title}
        </h3>
      </div>
      <div className="text-[#CCCCCC] ml-16">
        {children}
      </div>
    </motion.div>
  )
}

// Background component to ensure full-page coverage
const Background = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30"></div>

      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-emerald-900/10"></div>

      {/* Hexagon pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
            <path
              d="M25 0 L50 14.4 L50 38.6 L25 53 L0 38.6 L0 14.4 Z"
              fill="none"
              stroke="#00FF88"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="200%" fill="url(#hexagons)" />
      </svg>

      {/* Animated glow spots */}
      <motion.div
        className="absolute w-96 h-96 rounded-full"
        style={{
          background: 'radial-gradient(circle at center, rgba(0,255,136,0.15) 0%, transparent 70%)',
          top: '30%',
          left: '60%',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute w-64 h-64 rounded-full"
        style={{
          background: 'radial-gradient(circle at center, rgba(0,255,136,0.1) 0%, transparent 70%)',
          bottom: '20%',
          left: '30%',
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}

// Device Verification Component


export default function DeployDevice() {
  return (
    <>
      <Background />


      {/* Hero Section */}
      <section className="pt-32 px-6 relative">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
              Deploy Your Device
            </h1>
            <p className="text-xl mb-12 text-[#AAAAAA] max-w-4xl mx-auto">
              Transform your old mobile device into an AI agent in 10 minutes.
              Follow the instructions below to get started.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Instructions Section */}
      <section className="py-10 px-6">
        <div className="container mx-auto max-w-5xl">
          <InstructionStep number={1} title="Setup your Phone" icon={<FiSmartphone />}>
            <p className="mb-6">
              Watch this video tutorial to set up your phone with Termux, an Android terminal emulator that allows you to run Linux commands:
            </p>

            <div className="relative pb-[56.25%] h-0 rounded-lg overflow-hidden mb-4">
              <iframe
                className="absolute top-0 left-0 w-full h-full border-0"
                src="https://www.youtube.com/embed/s3TXc-jiQ40"
                title="Franky AI: Setting up your device"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen>
              </iframe>
            </div>

          </InstructionStep>

          <InstructionStep number={2} title="Run Franky" icon={<Zap />}>
            <p className="mb-4">
              Use the following curl command to download, install and run Franky:
            </p>
            <CodeBlock code="pkg update && pkg install nodejs libqrencode termux-api jq curl && git clone https://github.com/Marshal-AM/franky.git && cd franky && cd agent-framework && chmod +x franky && ./franky start" />
            <p className="mt-4">
              This script will download all necessary files to run Franky on your device.
            </p>
          </InstructionStep>
        </div>
      </section>

      <Suspense fallback={<div className="p-6 text-center">Loading device verification...</div>}>
        <DeviceVerification />
      </Suspense>
    </>
  )
}