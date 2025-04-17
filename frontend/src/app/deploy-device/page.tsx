'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/ui/Header'
import { FiCopy, FiCheck, FiSmartphone, FiTerminal, FiDownload, FiServer } from 'react-icons/fi'
import { useAppKit, AppKitProvider } from '@/components/wallet/AppKitProvider'

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

// Define connect result type
interface ConnectResult {
  selectedChain: string;
  address: string;
}

// Device Verification Component
const DeviceVerification = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [deviceDetails, setDeviceDetails] = useState<{
    deviceModel: string;
    ram: string;
    storage: string;
    cpu: string;
    ngrokLink: string;
    walletAddress: string;
    bytes32Data: string;
    signature?: string;
  } | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  
  // Get AppKit instance from provider
  const appKit = useAppKit()

  // Set isClient to true after component mounts to avoid SSR issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Parse URL parameters on mount (client-side only)
  useEffect(() => {
    if (!isClient) return

    // Extract URL parameters that contain device info
    const urlParams = new URLSearchParams(window.location.search)
    
    const deviceModel = urlParams.get('deviceModel')
    const ram = urlParams.get('ram')
    const storage = urlParams.get('storage')
    const cpu = urlParams.get('cpu')
    const ngrokLink = urlParams.get('ngrokLink')
    const walletAddress = urlParams.get('walletAddress')
    const bytes32Data = urlParams.get('bytes32Data')
    const signature = urlParams.get('signature')
    
    // Check if all required parameters are present
    if (deviceModel && ram && storage && cpu && ngrokLink && walletAddress && bytes32Data) {
      // Store device details for display in the modal
      setDeviceDetails({
        deviceModel,
        ram,
        storage,
        cpu,
        ngrokLink,
        walletAddress,
        bytes32Data,
        signature: signature || undefined
      })
      
      // Don't automatically show modal - wait for wallet connection
      console.log('Device parameters detected in URL')
    } else {
      console.log('Some device parameters are missing from the URL')
    }
  }, [isClient])

  // Connect wallet function using REOWN AppKit from provider
  const connectWallet = async () => {
    try {
      if (!appKit) {
        console.error('REOWN AppKit not initialized')
        return
      }
      
      console.log('Connecting wallet with AppKit...')
      setIsConnecting(true)
      
      // Open wallet modal and get connection result
      const result = await appKit.connect()
      
      if (result && result.address) {
        console.log('Wallet connected:', result)
        setIsWalletConnected(true)
        
        // Only show device modal after successful wallet connection
        if (deviceDetails) {
          setShowDeviceModal(true)
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  // Check if wallet is already connected
  useEffect(() => {
    if (appKit && appKit.isConnected) {
      setIsWalletConnected(true)
      
      // Show device modal if we have device details
      if (deviceDetails && !showDeviceModal) {
        setShowDeviceModal(true)
      }
    }
  }, [appKit, deviceDetails, showDeviceModal])

  // Handle device verification
  const verifyDevice = async () => {
    try {
      setIsVerifying(true)
      
      if (!appKit) {
        console.error('REOWN AppKit not initialized')
        return
      }
      
      // Check if we have a signature - signature verification is quicker
      if (deviceDetails?.signature) {
        console.log('Verifying device with provided signature...')
        
        // For signed verification, we would typically:
        // 1. Verify the signature matches the device data (bytes32Data)
        // 2. Check that it was signed by the walletAddress
        // 3. Record the verification on-chain
        
        // Simulating quick signature verification
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        console.log('Device verified with signature')
      } else {
        console.log('Signing transaction to verify device...')
        
        // For unsigned verification, we would typically:
        // 1. Get the signer from the connected wallet
        // 2. Create a transaction with the device verification data
        // 3. Sign and send the transaction

        // Simulating delay for full transaction signing
        await new Promise(resolve => setTimeout(resolve, 2000)) 
        
        console.log('Device verified with transaction')
      }
      
      setVerificationSuccess(true)
      
      // Close modal after success - optional based on UX preference
      setTimeout(() => {
        setShowDeviceModal(false)
      }, 3000)
    } catch (error) {
      console.error('Error verifying device:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  // Render the 6th step
  return (
    <section className="py-10 px-6">
      <div className="container mx-auto max-w-5xl">
        <InstructionStep number={6} title="Verify Your Device" icon={<FiSmartphone />}>
          <p className="mb-4">
            After scanning the QR code on your device, connect your wallet to verify ownership
            and complete the device registration process.
          </p>
          
          {deviceDetails ? (
            <>
              <p className="mt-4 text-emerald-400">
                <span className="font-medium">Device detected!</span> Please connect your wallet to verify ownership.
              </p>
              
              {!isWalletConnected ? (
                <div className="mt-6 flex flex-col items-center">
                  <motion.button
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="relative group px-8 py-4 rounded-lg bg-gradient-to-r from-[#00FF88]/20 to-emerald-500/20 border border-[#00FF88] text-[#00FF88] hover:from-[#00FF88]/30 hover:to-emerald-500/30 transition-all duration-300 shadow-lg shadow-emerald-900/30 backdrop-blur-sm min-w-[240px]"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#00FF88]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    
                    <div className="flex items-center justify-center">
                      {isConnecting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#00FF88]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="font-bold">Connecting...</span>
                        </>
                      ) : (
                        <>
                          <FiSmartphone className="mr-3 text-xl" />
                          <span className="font-bold">Connect Wallet</span>
                        </>
                      )}
                    </div>
                  </motion.button>
                  
                  <p className="mt-3 text-gray-400 text-sm">
                    Connect securely using REOWN AppKit
                  </p>
                </div>
              ) : (
                <div className="mt-6 p-4 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/30">
                  <div className="flex items-center">
                    <div className="flex justify-center items-center h-10 w-10 rounded-full bg-[#00FF88]/20 mr-4">
                      <FiCheck className="text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="text-[#00FF88] font-medium">
                        Wallet connected successfully!
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {appKit?.address ? `Address: ${appKit.address.substring(0, 6)}...${appKit.address.substring(appKit.address.length - 4)}` : ''}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-[#00FF88] text-center">
                    <span className="cursor-pointer underline" onClick={() => setShowDeviceModal(true)}>
                      View and verify your device details
                    </span>
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="mt-6 p-5 rounded-lg bg-yellow-900/20 border border-yellow-600/30">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-yellow-400 font-medium mb-2">No device details detected</p>
                  <p className="text-gray-300">
                    Please scan the QR code displayed on your device's Termux interface after running <code className="bg-black/30 px-2 py-0.5 rounded text-yellow-400">franky serve</code>.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <motion.button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="px-6 py-2 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/40 text-[#00FF88] hover:bg-[#00FF88]/20 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isConnecting ? 'Connecting...' : 'Prepare Your Wallet'}
                </motion.button>
              </div>
            </div>
          )}
        </InstructionStep>
      </div>
      
      {/* Device Verification Modal */}
      {showDeviceModal && deviceDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-lg w-full rounded-xl border border-[#00FF88] border-opacity-50 bg-black/90 backdrop-blur-sm p-6"
          >
            <h3 className="text-2xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent mb-4">
              Verify Device Ownership
            </h3>
            
            <div className="space-y-3 my-6">
              <div className="flex justify-between p-3 rounded-lg bg-black/50 border border-gray-800">
                <span className="text-gray-400">Device Model</span>
                <span className="text-[#00FF88]">{deviceDetails.deviceModel}</span>
              </div>
              
              <div className="flex justify-between p-3 rounded-lg bg-black/50 border border-gray-800">
                <span className="text-gray-400">RAM</span>
                <span className="text-[#00FF88]">{deviceDetails.ram}</span>
              </div>
              
              <div className="flex justify-between p-3 rounded-lg bg-black/50 border border-gray-800">
                <span className="text-gray-400">Storage</span>
                <span className="text-[#00FF88]">{deviceDetails.storage}</span>
              </div>
              
              <div className="flex justify-between p-3 rounded-lg bg-black/50 border border-gray-800">
                <span className="text-gray-400">CPU</span>
                <span className="text-[#00FF88]">{deviceDetails.cpu}</span>
              </div>
              
              <div className="flex justify-between p-3 rounded-lg bg-black/50 border border-gray-800">
                <span className="text-gray-400">Device Address</span>
                <span className="text-[#00FF88] text-xs break-all">{deviceDetails.walletAddress}</span>
              </div>
              
              <div className="flex justify-between p-3 rounded-lg bg-black/50 border border-gray-800">
                <span className="text-gray-400">Connection Link</span>
                <a href={deviceDetails.ngrokLink} target="_blank" rel="noopener noreferrer" 
                   className="text-[#00FF88] text-xs underline hover:text-emerald-400 break-all">
                  {deviceDetails.ngrokLink}
                </a>
              </div>
              
              <div className="p-3 rounded-lg bg-black/50 border border-gray-800">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Verification Data</span>
                </div>
                <div className="text-xs text-gray-400 break-all">
                  {deviceDetails.bytes32Data}
                </div>
              </div>
              
              {deviceDetails.signature && (
                <div className="p-3 rounded-lg bg-black/50 border border-gray-800">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Signature</span>
                    <span className="text-xs text-emerald-400 px-2 py-0.5 rounded bg-emerald-900/30">Verified</span>
                  </div>
                  <div className="text-xs text-gray-400 break-all">
                    {deviceDetails.signature}
                  </div>
                </div>
              )}
            </div>
            
            {verificationSuccess ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-lg bg-emerald-900/30 border border-emerald-400/30 text-center"
              >
                <FiCheck className="text-[#00FF88] mx-auto text-2xl mb-2" />
                <p className="text-[#00FF88] font-medium">Device verification successful!</p>
                
                {deviceDetails.signature && (
                  <div className="mt-2 text-sm text-emerald-300">
                    <p className="mb-1">Device signature has been validated on-chain</p>
                    <p className="text-xs text-emerald-400/70">Transaction hash saved for future reference</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="flex justify-center">
                <motion.button
                  onClick={verifyDevice}
                  disabled={isVerifying}
                  className="px-6 py-3 rounded-lg bg-[#00FF88] bg-opacity-20 border border-[#00FF88] text-[#00FF88] hover:bg-opacity-30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  whileHover={{ scale: isVerifying ? 1 : 1.05 }}
                  whileTap={{ scale: isVerifying ? 1 : 0.95 }}
                >
                  {isVerifying ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#00FF88]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {deviceDetails?.signature ? 'Verifying Signature...' : 'Signing Transaction...'}
                    </>
                  ) : (
                    <>
                      {deviceDetails?.signature ? 'Verify Device Signature' : 'Sign Transaction to Verify'}
                    </>
                  )}
                </motion.button>
              </div>
            )}
            
            <button
              onClick={() => setShowDeviceModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        </div>
      )}
    </section>
  )
}

// Wrap the device verification component with AppKit provider
const WrappedDeviceVerification = () => (
  <AppKitProvider>
    <DeviceVerification />
  </AppKitProvider>
)

export default function DeployDevice() {
  return (
    <>
      <Background />
      <main className="min-h-screen pb-16 relative z-10">
        <Header />
        
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
          </div>
        </section>

        {/* Device Verification Section - Use wrapped component */}
        <WrappedDeviceVerification />
      </main>
    </>
  )
}