'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Header from '@/components/ui/Header'
import { useRouter } from 'next/navigation'
import { FiCpu, FiHardDrive, FiServer, FiLink, FiSmartphone, FiHash, FiCheck } from 'react-icons/fi'
import { base } from 'viem/chains'
import axios from 'axios'
// Import ethers and utils directly for compatibility
import { ethers } from 'ethers'
// Import Privy
import { usePrivy } from "@privy-io/react-auth";
import { getAvailableDevices } from '@/lib/graph'

// Contract information
const CONTRACT_ADDRESS = '0x486989cd189ED5DB6f519712eA794Cee42d75b29'

// Helper function to get the block explorer URL based on the chain
const getExplorerUrl = (chainId: number, hash: string) => {
  // Base Mainnet
  if (chainId === 8453) {
    return `https://basescan.org/tx/${hash}`
  }
  // Ethereum Mainnet (default)
  return `https://etherscan.io/tx/${hash}`
}

// Define device interface
interface Device {
  id: string
  deviceModel: string
  ram: string
  storage: string
  cpu: string
  ngrokLink: string
  walletAddress: string
  hostingFee: string
  agentCount: number
  status: 'Active' | 'Inactive'
  lastActive: string
  txHash: string
  registeredAt: string
}

// ABI fragment for the registerDevice function
const abiFragment = [
  {
    "inputs": [
      { "internalType": "string", "name": "deviceModel", "type": "string" },
      { "internalType": "string", "name": "ram", "type": "string" },
      { "internalType": "string", "name": "storageCapacity", "type": "string" },
      { "internalType": "string", "name": "cpu", "type": "string" },
      { "internalType": "string", "name": "ngrokLink", "type": "string" },
      { "internalType": "uint256", "name": "hostingFee", "type": "uint256" },
      { "internalType": "address", "name": "deviceAddress", "type": "address" },
      { "internalType": "bytes32", "name": "verificationHash", "type": "bytes32" },
      { "internalType": "bytes", "name": "signature", "type": "bytes" }
    ],
    "name": "registerDevice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "deviceAddress", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "deviceModel", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "ram", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "storageCapacity", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "cpu", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "ngrokLink", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "hostingFee", "type": "uint256" }
    ],
    "name": "DeviceRegistered",
    "type": "event"
  }
];

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function for exponential backoff retry
const retryWithBackoff = async (
  fn: () => Promise<any>,
  retries = 3,
  initialDelay = 1000,
  maxDelay = 10000
) => {
  let currentDelay = initialDelay;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === retries || (error.response?.status !== 429 && error.status !== 429)) {
        throw error;
      }

      // Get retry delay from response header or use exponential backoff
      const retryAfter = error.response?.headers?.['retry-after'];
      const delayTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(currentDelay, maxDelay);

      await delay(delayTime);

      // Increase delay for next attempt (exponential backoff)
      currentDelay *= 2;
    }
  }
};

// Background animation component
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

// Device card component
const DeviceCard = ({ device, onClick }: { device: Device, onClick: () => void }) => {
  return (
    <motion.div
      className="p-6 rounded-xl border border-[#00FF88] border-opacity-30 bg-black/50 backdrop-blur-sm h-full flex flex-col"
      whileHover={{
        y: -5,
        boxShadow: '0 10px 25px -5px rgba(0, 255, 136, 0.3)'
      }}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center mb-4">
        <div className="flex justify-center items-center h-12 w-12 rounded-full bg-[#00FF88] bg-opacity-20 text-[#00FF88] mr-4">
          <FiSmartphone className="text-xl" />
        </div>
        <div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
            {device.deviceModel}
          </h3>
          <div className="flex items-center mt-1">
            <span className={`inline-block w-2 h-2 rounded-full ${device.status === 'Active' ? 'bg-[#00FF88]' : 'bg-gray-400'} mr-2`}></span>
            <span className="text-sm text-gray-400">{device.status} • {device.lastActive}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 flex-grow">
        <div className="flex items-center text-[#CCCCCC]">
          <FiCpu className="mr-2 text-[#00FF88]" />
          <span>CPU: {device.cpu}</span>
        </div>

        <div className="flex items-center text-[#CCCCCC]">
          <FiServer className="mr-2 text-[#00FF88]" />
          <span>RAM: {device.ram}</span>
        </div>

        <div className="flex items-center text-[#CCCCCC]">
          <FiHardDrive className="mr-2 text-[#00FF88]" />
          <span>Storage: {device.storage}</span>
        </div>

        <div className="flex items-start text-[#CCCCCC]">
          <FiLink className="mr-2 text-[#00FF88] mt-1 flex-shrink-0" />
          <span className="text-sm break-all">
            {device.ngrokLink}
          </span>
        </div>

        <div className="flex items-center text-[#CCCCCC]">
          <FiHash className="mr-2 text-[#00FF88]" />
          <span>Address: <span className="text-[#00FF88] font-medium">{`${device.walletAddress.slice(0, 6)}...${device.walletAddress.slice(-4)}`}</span></span>
        </div>

        <div className="flex items-center text-[#CCCCCC]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-[#00FF88]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Hosting Fee: <span className="text-[#00FF88] font-medium">
            {parseInt(device.hostingFee) > 0 ? `${device.hostingFee} TFIL` : 'Free'}
          </span></span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#00FF88] border-opacity-20">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Wallet</span>
          <span className="text-xs text-[#00FF88]">
            {`${device.walletAddress.slice(0, 6)}...${device.walletAddress.slice(-4)}`}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">Registration Tx</span>
          <a
            href={`https://basescan.org/tx/${device.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#00FF88] hover:underline"
            onClick={(e) => e.stopPropagation()} // Prevent card click when clicking the link
          >
            View
          </a>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">Registered At</span>
          <span className="text-xs text-[#00FF88]">{device.registeredAt}</span>
        </div>
      </div>

      <motion.button
        className="mt-4 w-full py-2 rounded-lg bg-[#00FF88] bg-opacity-10 text-[#00FF88] hover:bg-opacity-20 transition-colors"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        Create Agent
      </motion.button>
    </motion.div>
  )
}

export default function MarketplacePage() {
  const [isClient, setIsClient] = useState(false)
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { user, login } = usePrivy()

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Fetch devices using Nodit API
  useEffect(() => {
    if (!isClient) return;
    (async function () {
      const fetchedDevices = await getAvailableDevices()
      console.log("Fetched devices from Subgraph")
      console.log(fetchedDevices)
      setDevices(fetchedDevices)
      setLoading(false)
      setError(null)
    })()
  }, [isClient]);



  // Handle device selection
  const handleDeviceSelect = (device: Device) => {
    console.log('Selected device:', device);
    // Pass device information to the create-agent page using query parameters
    router.push(`/create-agent?deviceModel=${encodeURIComponent(device.deviceModel)}&deviceStatus=${device.status}&deviceAddress=${device.walletAddress}&ngrokLink=${encodeURIComponent(device.ngrokLink)}&hostingFee=${encodeURIComponent(device.hostingFee)}`);
  };

  if (!isClient) {
    return null; // Avoid rendering during SSR
  }

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
                Device Marketplace
              </h1>
              <p className="text-xl mb-6 text-[#AAAAAA] max-w-4xl mx-auto">
                Browse and select from available deployed devices to host your AI agents.
                These devices have been registered on-chain and are ready to run your agents.
              </p>
              <p className="text-lg mb-12 text-emerald-400 max-w-4xl mx-auto">
                Each device shows its hosting fee in $FIL tokens - this is what you'll pay to deploy your agent to the device.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Marketplace Section */}
        <section className="py-10 px-6">
          <div className="container mx-auto">
            {loading ? (
              <div className="flex flex-col justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00FF88] mb-4"></div>
                <p className="text-[#AAAAAA]">Loading devices from blockchain...</p>
              </div>
            ) : error ? (
              <div className="text-center py-20 px-4">
                <div className="p-6 rounded-xl border border-red-500 border-opacity-30 bg-black/50 backdrop-blur-sm max-w-2xl mx-auto">
                  <p className="text-xl text-red-400 mb-4">Error loading devices</p>
                  <p className="text-[#AAAAAA]">{error}</p>
                </div>
              </div>
            ) : devices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {devices.map(device => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    onClick={() => handleDeviceSelect(device)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-xl text-[#AAAAAA] mb-3">No devices available.</p>
                <Link href="/deploy-device">
                  <motion.button
                    className="px-6 py-2 rounded-lg bg-[#00FF88]/20 border border-[#00FF88]/50 text-[#00FF88] hover:bg-[#00FF88]/30 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Be the first to deploy a device!
                  </motion.button>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Add Device CTA */}
        <section className="py-10 px-6">
          <div className="container mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="p-8 rounded-xl border border-[#00FF88] border-opacity-30 bg-black/50 backdrop-blur-sm text-center"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
                Start Earning Money Now!
              </h2>
              <p className="text-[#AAAAAA] mb-6">
                Deploy your idle mobile devices and earn TFIL by providing computing resources for AI agents.
              </p>
              <Link href="/deploy-device">
                <motion.button
                  className="px-8 py-3 rounded-xl bg-[#00FF88]/20 border border-[#00FF88]/50 text-[#00FF88] text-lg font-bold hover:bg-[#00FF88]/30 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Deploy Your Device →
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
    </>
  )
}
