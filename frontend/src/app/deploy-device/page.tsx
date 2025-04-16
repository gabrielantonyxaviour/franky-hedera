'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/ui/Header'
import { FiCopy, FiCheck, FiSmartphone, FiTerminal, FiDownload, FiServer } from 'react-icons/fi'

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

export default function DeployDevice() {
  return (
    <main className="min-h-screen pb-16">
      <Header />
      
      {/* Background animation */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30"></div>
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
          <rect width="100%" height="100%" fill="url(#hexagons)" />
        </svg>
      </div>
      
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
              Transform your old mobile device into an AI agent with these simple steps.
              Follow the instructions below to get started.
            </p>
          </motion.div>
        </div>
      </section>
      
      {/* Instructions Section */}
      <section className="py-10 px-6">
        <div className="container mx-auto max-w-5xl">
          <InstructionStep number={1} title="Install Termux" icon={<FiSmartphone />}>
            <p className="mb-4">
              Termux is a terminal emulator for Android that allows you to run Linux commands. 
              Follow these steps to install it:
            </p>
            
            <ol className="list-decimal ml-6 space-y-3">
              <li>
                <span className="font-medium text-[#00FF88]">Install F-Droid</span> (recommended method):
                <ul className="list-disc ml-6 mt-2">
                  <li>Visit <a href="https://f-droid.org" target="_blank" rel="noopener noreferrer" className="text-[#00FF88] underline hover:text-emerald-400">f-droid.org</a> from your mobile device</li>
                  <li>Download and install the F-Droid app</li>
                </ul>
              </li>
              <li>
                <span className="font-medium text-[#00FF88]">Install Termux from F-Droid</span>:
                <ul className="list-disc ml-6 mt-2">
                  <li>Open F-Droid app</li>
                  <li>Search for "Termux"</li>
                  <li>Tap on Termux and install it</li>
                </ul>
              </li>
              <li>
                <span className="font-medium text-[#00FF88]">Alternative method</span>:
                <ul className="list-disc ml-6 mt-2">
                  <li>Visit the <a href="https://github.com/termux/termux-app/releases" target="_blank" rel="noopener noreferrer" className="text-[#00FF88] underline hover:text-emerald-400">Termux Releases</a> page</li>
                  <li>Download the latest APK file</li>
                  <li>Install the APK file on your device</li>
                </ul>
              </li>
            </ol>
            
            <p className="mt-4">
              <span className="font-medium">Important:</span> After installation, open Termux and grant the necessary permissions when prompted.
            </p>
          </InstructionStep>
          
          <InstructionStep number={2} title="Set up Ollama in Termux" icon={<FiTerminal />}>
            <p className="mb-4">
              Ollama allows you to run AI models locally on your device. Follow these commands to set up Ollama in Termux:
            </p>
            
            <p className="font-medium mt-3">Update Termux packages:</p>
            <CodeBlock code="pkg update && pkg upgrade -y" />
            
            <p className="font-medium mt-3">Install required dependencies:</p>
            <CodeBlock code="pkg install -y git build-essential golang cmake" />
            
            <p className="font-medium mt-3">Clone Ollama repository:</p>
            <CodeBlock code="git clone https://github.com/ollama/ollama.git" />
            
            <p className="font-medium mt-3">Navigate to the Ollama directory:</p>
            <CodeBlock code="cd ollama" />
            
            <p className="font-medium mt-3">Build Ollama:</p>
            <CodeBlock code="go build" />
            
            <p className="font-medium mt-3">Move the binary to a directory in your PATH:</p>
            <CodeBlock code="mv ollama $PREFIX/bin/" />
            
            <p className="mt-4">
              <span className="font-medium">Note:</span> The build process might take some time depending on your device.
            </p>
          </InstructionStep>
          
          <InstructionStep number={3} title="Install Franky Shell Script" icon={<FiDownload />}>
            <p className="mb-4">
              Use the following curl command to download and install our Franky shell script:
            </p>
            
            <CodeBlock code="curl -sSL https://raw.githubusercontent.com/franky-ai/setup/main/install.sh | bash" />
            
            <p className="mt-4">
              This script will download all necessary files to run Franky on your device.
            </p>
          </InstructionStep>
          
          <InstructionStep number={4} title="Install Required Dependencies" icon={<FiDownload />}>
            <p className="mb-4">
              Install all required files and dependencies using the franky command:
            </p>
            
            <CodeBlock code="franky install" />
            
            <p className="mt-4">
              This command will:
            </p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Download the required AI models</li>
              <li>Set up the runtime environment</li>
              <li>Configure your device for optimal performance</li>
            </ul>
          </InstructionStep>
          
          <InstructionStep number={5} title="Start the Franky Server" icon={<FiServer />}>
            <p className="mb-4">
              Start the Franky server with this simple command:
            </p>
            
            <CodeBlock code="franky serve" />
            
            <p className="mt-4">
              Your device is now running as an AI agent! The command will show a QR code or URL that you can use to connect to your agent from other devices.
            </p>
            
            <div className="mt-6 p-4 bg-emerald-900/30 border border-emerald-400/30 rounded-lg">
              <h4 className="font-medium text-[#00FF88] mb-2">💡 Tip:</h4>
              <p>
                To keep the server running even when you close Termux, you can use the <code className="bg-black/30 px-1 rounded text-[#00FF88]">nohup</code> command:
              </p>
              <CodeBlock code="nohup franky serve &" />
            </div>
          </InstructionStep>
          
          <div className="mt-16 text-center">
            <p className="text-2xl font-medium bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent mb-4">
              Congratulations! 🎉
            </p>
            <p className="text-[#AAAAAA] text-lg max-w-2xl mx-auto">
              Your device is now part of the Franky network. You can earn $FRANKY tokens while your device serves AI requests.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
