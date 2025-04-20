'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/ui/Header'
import { FiCopy, FiCheck, FiSmartphone, FiTerminal, FiDownload, FiServer } from 'react-icons/fi'
import { useAppKitAccount } from '@reown/appkit/react'
import { usePrivy } from '@privy-io/react-auth'
import { QrCode } from 'lucide-react'

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
const DeviceVerification = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [hostingFee, setHostingFee] = useState<string>("0")
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
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletType, setWalletType] = useState<string | null>(null)
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | undefined>(undefined)
  const [transactionError, setTransactionError] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)

  const { user } = usePrivy()

  // Use AppKit account
  const { address: appKitAddress, isConnected: appKitIsConnected } = useAppKitAccount()

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

  // Check for account changes
  useEffect(() => {
    // Only use appKitAddress for Reown wallet
    if (appKitAddress && appKitIsConnected) {
      setWalletAddress(appKitAddress)
      setWalletType("Reown Wallet")
      setIsWalletConnected(true)

      // Show device modal if we have device details
      if (deviceDetails && !showDeviceModal) {
        // Set focus to the hostingFee input when opened
        setShowDeviceModal(true);

        // Set a default value that's easy to change
        setHostingFee("20");
      }

      console.log('Reown wallet connected:', appKitAddress)
    } else {
      // No wallet connected
      setIsWalletConnected(false)
      setWalletAddress(null)
      setWalletType(null)
    }
  }, [appKitAddress, appKitIsConnected, deviceDetails, showDeviceModal])

  // Handle hosting fee input change
  const handleHostingFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow numeric values
    if (/^\d*$/.test(value)) {
      setHostingFee(value)
    }
  }

  // Render the 5th step
  return (
    <section className="py-10 px-6">
      {/* Device Verification Modal */}
      {showDeviceModal && deviceDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-md w-full rounded-xl border border-[#00FF88] border-opacity-50 bg-black/90 backdrop-blur-sm p-5 max-h-[90vh] overflow-y-auto"
          >
            {/* Close button - moved to top-right corner of the header for better usability */}
            <button
              onClick={() => {
                // Close the modal
                setShowDeviceModal(false);

                // Remove URL parameters by replacing current URL with base URL
                if (typeof window !== 'undefined') {
                  const baseUrl = window.location.pathname;
                  window.history.replaceState({}, document.title, baseUrl);

                  // Also reset device details state
                  setDeviceDetails(null);
                }
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-white h-7 w-7 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/70 transition-colors"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent mb-3 pr-8">
              Verify Device
            </h3>

            {/* Connected wallet info card - Showing this first as it's most relevant for verification */}
            <div className="p-3 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/30 mb-4">
              <div className="flex items-center mb-1">
                <div className="flex justify-center items-center h-6 w-6 rounded-full bg-[#00FF88]/20 mr-2">
                  <FiCheck className="text-[#00FF88] text-sm" />
                </div>
                <span className="text-[#00FF88] text-sm font-medium">Wallet Status</span>
                <span className="ml-auto text-xs bg-[#00FF88]/20 px-2 py-0.5 rounded-full text-[#00FF88]">
                  {isWalletConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <div className="text-xs text-gray-400 ml-8">
                <p className="flex justify-between">
                  <span className="text-gray-300">Address:</span>
                  <span className="text-[#00FF88]">
                    {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : 'Not connected'}
                  </span>
                </p>
                {walletType && (
                  <p className="flex justify-between">
                    <span className="text-gray-300">Type:</span>
                    <span className="text-[#00FF88] flex items-center">
                      {walletType.toLowerCase().includes('metamask') && (
                        <img src="/metamask-icon.svg" alt="MetaMask" className="h-3 w-3 mr-1" onError={(e) => e.currentTarget.style.display = 'none'} />
                      )}
                      {walletType}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Integrated hosting fee input section */}
            <div className="p-4 rounded-lg bg-emerald-900/20 border border-emerald-400/30 mb-4">
              <label htmlFor="hostingFee" className="block text-emerald-300 text-sm font-medium mb-2">
                Hosting Fee ($FRANKY)
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="hostingFee"
                  value={hostingFee}
                  onChange={handleHostingFeeChange}
                  className="w-full p-3 text-lg font-medium rounded-lg bg-black/50 border border-emerald-400/30 text-white focus:outline-none focus:border-emerald-400/80 transition-colors"
                  placeholder="Enter amount"
                  autoFocus
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-emerald-400">$FRANKY</span>
                </div>
              </div>

              <p className="mt-2 text-xs text-gray-400">
                Payment you'll receive when someone deploys an agent to your device.
              </p>
            </div>

            {/* Device details in a compact accordion/tabs style */}
            <div className="space-y-2 mb-4">
              <details className="group rounded-lg bg-black/50 border border-gray-800 overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between p-2 font-medium">
                  <div className="flex items-center">
                    <span className="text-emerald-400 mr-2">📱</span>
                    <span>Device Specs</span>
                  </div>
                  <span className="transition group-open:rotate-180">
                    <svg fill="none" height="16" width="16" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  </span>
                </summary>
                <div className="p-2 pt-0 text-xs space-y-1">
                  <div className="flex justify-between py-1 border-t border-gray-700">
                    <span className="text-gray-400">Model</span>
                    <span className="text-[#00FF88]">{deviceDetails.deviceModel}</span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-gray-700">
                    <span className="text-gray-400">RAM</span>
                    <span className="text-[#00FF88]">{deviceDetails.ram}</span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-gray-700">
                    <span className="text-gray-400">Storage</span>
                    <span className="text-[#00FF88]">{deviceDetails.storage}</span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-gray-700">
                    <span className="text-gray-400">CPU</span>
                    <span className="text-[#00FF88]">{deviceDetails.cpu}</span>
                  </div>
                </div>
              </details>

              <details className="group rounded-lg bg-black/50 border border-gray-800 overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between p-2 font-medium">
                  <div className="flex items-center">
                    <span className="text-emerald-400 mr-2">🔗</span>
                    <span>Connection Details</span>
                  </div>
                  <span className="transition group-open:rotate-180">
                    <svg fill="none" height="16" width="16" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  </span>
                </summary>
                <div className="p-2 pt-0 text-xs space-y-1">
                  <div className="flex justify-between py-1 border-t border-gray-700">
                    <span className="text-gray-400">Device Address</span>
                    <span className="text-[#00FF88] text-xs break-all">{deviceDetails.walletAddress.substring(0, 8)}...{deviceDetails.walletAddress.substring(deviceDetails.walletAddress.length - 8)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-gray-700">
                    <span className="text-gray-400">Link</span>
                    <a href={deviceDetails.ngrokLink} target="_blank" rel="noopener noreferrer"
                      className="text-[#00FF88] text-xs underline hover:text-emerald-400 break-all max-w-[200px] truncate">
                      {deviceDetails.ngrokLink}
                    </a>
                  </div>
                </div>
              </details>

              <details className="group rounded-lg bg-black/50 border border-gray-800 overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between p-2 font-medium">
                  <div className="flex items-center">
                    <span className="text-emerald-400 mr-2">🔐</span>
                    <span>Verification Data</span>
                  </div>
                  <span className="transition group-open:rotate-180">
                    <svg fill="none" height="16" width="16" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  </span>
                </summary>
                <div className="p-2 pt-0 text-xs space-y-1">
                  <div className="py-1 border-t border-gray-700">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400">Verification Data</span>
                    </div>
                    <div className="text-xs text-gray-400 break-all bg-black/30 p-2 rounded">
                      {deviceDetails.bytes32Data}
                    </div>
                  </div>

                  {deviceDetails.signature && (
                    <div className="py-1 border-t border-gray-700">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Signature</span>
                        <span className="text-xs text-emerald-400 px-2 py-0.5 rounded bg-emerald-900/30">Verified</span>
                      </div>
                      <div className="text-xs text-gray-400 break-all bg-black/30 p-2 rounded">
                        {deviceDetails.signature}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </div>

            {verificationSuccess ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-lg bg-emerald-900/30 border border-emerald-400/30 text-center"
              >
                <FiCheck className="text-[#00FF88] mx-auto text-xl mb-1" />
                <p className="text-[#00FF88] font-medium text-sm">Device verification successful!</p>

                {deviceId && (
                  <div className="mt-2 text-sm text-emerald-300">
                    <p className="font-bold">Device Address: <span className="text-white text-xs break-all">{deviceId}</span></p>
                    <p className="text-xs mt-1 text-yellow-300 font-medium">Your device is now registered and ready to host agents</p>
                  </div>
                )}

                {transactionHash && (
                  <div className="mt-2 text-xs text-emerald-300">
                    <p>Transaction confirmed on-chain</p>
                    <a
                      href={`https://filecoin-testnet.blockscout.com/tx/${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00FF88] underline hover:text-emerald-200 text-xs mt-1 inline-block"
                    >
                      View
                    </a>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="flex flex-col">
                {transactionError && (
                  <div className="p-3 mb-3 rounded-lg bg-red-900/30 border border-red-400/30 text-center text-red-300 text-xs">
                    <p>{transactionError}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </section>
  )
}



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

              <p className="mt-4 bg-yellow-900/20 border border-yellow-600/30 p-4 rounded-lg text-yellow-300">
                <span className="font-medium">Important:</span> After installation, open Termux and grant the necessary permissions when prompted.
              </p>
            </InstructionStep>

            <InstructionStep number={2} title="Install Franky Shell Script" icon={<FiDownload />}>
              <p className="mb-4">
                Use the following curl command to download and install our Franky shell script:
              </p>

              <CodeBlock code="curl -sSL https://raw.githubusercontent.com/franky-ai/setup/main/install.sh | bash" />

              <p className="mt-4">
                This script will download all necessary files to run Franky on your device.
              </p>
            </InstructionStep>

            <InstructionStep number={3} title="Install Required Dependencies" icon={<FiDownload />}>
              <p className="mb-4">
                Install all required files and dependencies using the franky command:
              </p>

              <CodeBlock code="franky install" />

              <p className="mt-4">
                This command will:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Download the required AI models</li>
                <li>Set up Ollama and runtime environment</li>
                <li>Configure your device for optimal performance</li>
                <li>Install all dependencies needed</li>
              </ul>
            </InstructionStep>

            <InstructionStep number={4} title="Start the Franky Server" icon={<FiServer />}>
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

        <DeviceVerification />
      </main>
    </>
  )
}
