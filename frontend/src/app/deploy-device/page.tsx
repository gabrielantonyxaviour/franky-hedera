'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/ui/Header'
import { FiCopy, FiCheck, FiSmartphone, FiTerminal, FiDownload, FiServer } from 'react-icons/fi'
import { useAppKitAccount } from '@reown/appkit/react'
import { usePrivy } from '@privy-io/react-auth'

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

  // Handle device verification
  const verifyDevice = async () => {
    try {
      // Basic validation for positive number
      const fee = Number(hostingFee);
      if (hostingFee === '' || isNaN(fee) || fee <= 0) {
        setTransactionError('Please enter a positive number for the hosting fee.');
        return;
      }

      setIsVerifying(true)
      setTransactionError(null)

      if (!isWalletConnected || !walletAddress) {
        console.error('Wallet not connected')
        setTransactionError('Wallet not connected. Please connect your wallet and try again.')
        setIsVerifying(false)
        return
      }

      if (!deviceDetails) {
        console.error('No device details available')
        setTransactionError('No device details available. Please scan the QR code from your device first.')
        setIsVerifying(false)
        return
      }

      console.log('Registering device on smart contract...')

      // Prepare contract call parameters
      const {
        deviceModel,
        ram,
        storage: storageCapacity,
        cpu,
        ngrokLink,
        walletAddress: deviceAddress,
        bytes32Data: verificationHash,
        signature,
      } = deviceDetails

      // Convert signature from string to bytes if available
      // If signature is not provided, use an empty bytes array
      let signatureBytes: `0x${string}` = '0x'
      if (signature) {
        // Make sure signature has 0x prefix
        signatureBytes = signature.startsWith('0x')
          ? signature as `0x${string}`
          : `0x${signature}` as `0x${string}`
      }

      // Make sure verification hash has 0x prefix
      const verificationHashHex = verificationHash.startsWith('0x')
        ? verificationHash as `0x${string}`
        : `0x${verificationHash}` as `0x${string}`

      // Always use Base Mainnet chainId
      const currentChainId = 8453  // Base Mainnet
      console.log('Using chain ID:', currentChainId)

      try {
        // Open the Reown modal first to ensure it's ready
        console.log('Preparing Reown wallet for transaction');

        // Open the Account view to prepare for transaction
        try {
          // TODO: Reown modal opening logic
          console.log('Reown modal opened successfully');

          // Allow time for the modal to fully open and initialize
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (modalError) {
          console.warn('Could not open Reown modal:', modalError);
          // Continue anyway as the modal might already be open
        }

        // Convert hosting fee to BigInt
        const hostingFeeBigInt = BigInt(hostingFee || "0")

        // Create transaction params with the new hostingFee parameter
        // const txParams = {
        //   address: CONTRACT_ADDRESS as `0x${string}`,
        //   abi: CONTRACT_ABI,
        //   functionName: 'registerDevice' as const,
        //   args: [
        //     deviceModel,
        //     ram,
        //     storageCapacity,
        //     cpu,
        //     ngrokLink,
        //     hostingFeeBigInt,
        //     deviceAddress as `0x${string}`,
        //     verificationHashHex,
        //     signatureBytes
        //   ] as const,
        //   chainId: currentChainId,
        //   gas: BigInt(6000000)
        // }

        // console.log('Sending transaction...');
        // const hash = await writeContractAsync(txParams)

        // // Set transaction hash to track its progress
        // console.log('Transaction submitted:', hash)
        // setTransactionHash(hash)

      } catch (error: any) {
        console.error('Transaction signing error:', error)

        // Simple error handling
        if (error.message?.includes('Request was aborted')) {
          setTransactionError('Transaction was aborted. Please ensure you are connected to Base Mainnet network and try again.');
        } else if (error.message?.includes('user rejected') || error.message?.includes('User denied')) {
          setTransactionError('Transaction was rejected. Please approve the transaction in your wallet.');
        } else {
          setTransactionError(error.message || 'Failed to sign transaction');
        }

        setIsVerifying(false)
      }
    } catch (error: any) {
      console.error('Error verifying device:', error)
      setTransactionError(error.message || 'Unknown error occurred')
      setIsVerifying(false)
    }
  }

  // // Watch for transaction receipt
  // useEffect(() => {
  //   if (transactionReceipt) {
  //     console.log('Transaction confirmed:', transactionReceipt)

  //     // Extract information from the transaction receipt logs
  //     try {
  //       // For the new contract, we want to extract information from the DeviceRegistered event
  //       // DeviceRegistered(address indexed deviceAddress, address indexed owner, string deviceModel, string ram, 
  //       // string storageCapacity, string cpu, string ngrokLink, uint256 hostingFee)

  //       if (transactionReceipt.logs && transactionReceipt.logs.length > 0) {
  //         console.log('Transaction logs:', transactionReceipt.logs);

  //         // The new DeviceRegistered event has the following topic in the new contract:
  //         const deviceRegisteredTopic = '0x23308818ac578935e73a554a196ddeaa2ea2f9e718f32025a04ae66d8fe43ad5';

  //         // Look through all logs to find the DeviceRegistered event
  //         for (const log of transactionReceipt.logs) {
  //           if (log.topics[0] === deviceRegisteredTopic) {
  //             // Device address is indexed and in topics[1]
  //             if (log.topics[1]) {
  //               const deviceAddressHex = log.topics[1];
  //               setDeviceId(deviceDetails?.walletAddress || deviceAddressHex);
  //               console.log('Device registered with address:', deviceDetails?.walletAddress);
  //               break;
  //             }
  //           }
  //         }

  //         // If we still don't have the device address from logs, just use what we have
  //         if (!deviceId && deviceDetails?.walletAddress) {
  //           setDeviceId(deviceDetails.walletAddress);
  //         }
  //       }
  //     } catch (error) {
  //       console.error('Error extracting device info from logs:', error);
  //       // Fallback - just use the known device address
  //       if (deviceDetails?.walletAddress) {
  //         setDeviceId(deviceDetails.walletAddress);
  //       }
  //     }

  //     setVerificationSuccess(true)
  //     setIsVerifying(false)

  //     // Close modal after success
  //     setTimeout(() => {
  //       setShowDeviceModal(false)

  //       // Remove URL parameters after successful verification
  //       if (typeof window !== 'undefined') {
  //         const baseUrl = window.location.pathname
  //         window.history.replaceState({}, document.title, baseUrl)
  //       }
  //     }, 7000) // Increased timeout to give users more time to see the result
  //   }

  //   if (waitError) {
  //     console.error('Transaction wait error:', waitError)
  //     setTransactionError(waitError.message || 'Error waiting for transaction confirmation')
  //     setIsVerifying(false)
  //   }
  // }, [transactionReceipt, waitError, deviceDetails, deviceId])

  // New functions for Reown wallet connection
  const handleReownConnect = () => {
    console.log('Reown wallet connected')
    setIsConnecting(false)
  }

  const handleReownDisconnect = () => {
    console.log('Reown wallet disconnected')
    setIsWalletConnected(false)
    setWalletAddress(null)
    setWalletType(null)
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

                  <p className="mt-3 text-gray-400 text-sm">
                    Connect securely using Reown
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
                        Reown wallet connected successfully!
                      </p>
                      <div className="text-gray-400 text-sm mt-1">
                        <p className="mb-1">
                          <span className="font-medium">Address:</span> {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setShowDeviceModal(true)}
                      className="px-4 py-2 bg-[#00FF88]/20 hover:bg-[#00FF88]/30 text-[#00FF88] rounded-lg border border-[#00FF88]/30 transition-colors text-sm"
                    >
                      View and verify your device
                    </button>
                  </div>
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

              <div className="mt-4">
                {isWalletConnected ? (
                  <div className="p-3 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/30 mb-4">
                    <div className="flex items-center">
                      <div className="flex justify-center items-center h-8 w-8 rounded-full bg-[#00FF88]/20 mr-3">
                        <FiCheck className="text-[#00FF88]" />
                      </div>
                      <div>
                        <p className="text-[#00FF88] text-sm font-medium">
                          Wallet connected
                        </p>
                        <p className="text-xs text-gray-400">
                          {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : ''}
                          {walletType && ` (${walletType})`}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">

                  </div>
                )}
              </div>
            </div>
          )}
        </InstructionStep>
      </div>

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
                {/* <motion.button
                  onClick={verifyDevice}
                  disabled={isVerifying || isPending || isWaitingForTransaction || hostingFee === '' || isNaN(Number(hostingFee)) || Number(hostingFee) <= 0}
                  className="px-5 py-2 rounded-lg bg-[#00FF88] bg-opacity-20 border border-[#00FF88] text-[#00FF88] hover:bg-opacity-30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm w-full"
                  whileHover={{ scale: isVerifying ? 1 : 1.03 }}
                  whileTap={{ scale: isVerifying ? 1 : 0.97 }}
                >
                  {(isVerifying || isPending || isWaitingForTransaction) ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#00FF88]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isPending ? 'Waiting for approval...' :
                        isWaitingForTransaction ? 'Confirming transaction...' :
                          'Registering device...'}
                    </>
                  ) : hostingFee === '' || isNaN(Number(hostingFee)) || Number(hostingFee) <= 0 ? (
                    'Enter valid fee amount'
                  ) : (
                    <>
                      Register Device on Contract
                    </>
                  )}
                </motion.button>
                {transactionHash && !verificationSuccess && (
                  <p className="text-xs text-center text-gray-400 mt-2">
                    Transaction pending:
                    <a
                      href={getExplorerUrl(chainId, transactionHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00FF88] underline hover:text-emerald-200 ml-1"
                    >
                      View
                    </a>
                  </p>
                )} */}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </section>
  )
}

// Wrap the device verification component with Reown provider instead of Privy
const WrappedDeviceVerification = () => (
  <DeviceVerification />
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
            <InstructionStep number={1} title="Setup your Phone" icon={<FiSmartphone />}>
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
