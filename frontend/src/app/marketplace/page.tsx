'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Header from '@/components/ui/Header'
import { useRouter } from 'next/navigation'
import { FiCpu, FiHardDrive, FiServer, FiLink, FiSmartphone, FiHash } from 'react-icons/fi'

// Define device interface
interface Device {
  id: string
  deviceModel: string
  ram: string
  storage: string
  cpu: string
  ngrokLink: string
  walletAddress: string
  bytes32Data: string
  status: 'Active' | 'Inactive'
  lastActive: string
}

// Mock data for deployed devices
const mockDevices: Device[] = [
  {
    id: '1',
    deviceModel: 'Pixel 7',
    ram: '8GB',
    storage: '128GB',
    cpu: 'Snapdragon 888',
    ngrokLink: 'https://12ab-123-456-789-123.ngrok.app',
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    bytes32Data: '0x7b2261697075626c69635f6964223a20226c656e6172222c2022656e7669726f6e6d656e74223a20226465762d65786368616e6765227d',
    status: 'Active',
    lastActive: '2 minutes ago'
  },
  {
    id: '2',
    deviceModel: 'Samsung Galaxy S21',
    ram: '12GB',
    storage: '256GB',
    cpu: 'Exynos 2100',
    ngrokLink: 'https://34cd-234-567-890-234.ngrok.app',
    walletAddress: '0x912d35Cc6634C0532925a3b844Bc454e4438f77a',
    bytes32Data: '0x8c3372697075626c69635f6964223a20226c756e61222c2022656e7669726f6e6d656e74223a20226465762d73746167696e67227d',
    status: 'Active',
    lastActive: '5 minutes ago'
  },
  {
    id: '3',
    deviceModel: 'OnePlus 10 Pro',
    ram: '16GB',
    storage: '512GB',
    cpu: 'Snapdragon 8 Gen 1',
    ngrokLink: 'https://56ef-345-678-901-345.ngrok.app',
    walletAddress: '0xa42d35Cc6634C0532925a3b844Bc454e4438f12b',
    bytes32Data: '0x9d4483697075626c69635f6964223a20227465727261222c2022656e7669726f6e6d656e74223a20226465762d70726f64227d',
    status: 'Inactive',
    lastActive: '2 days ago'
  },
  {
    id: '4',
    deviceModel: 'Xiaomi Mi 11',
    ram: '8GB',
    storage: '128GB',
    cpu: 'Snapdragon 888',
    ngrokLink: 'https://78gh-456-789-012-456.ngrok.app',
    walletAddress: '0xc32d35Cc6634C0532925a3b844Bc454e4438f34d',
    bytes32Data: '0xae5594697075626c69635f6964223a20226e6f7661222c2022656e7669726f6e6d656e74223a20226465762d74657374227d',
    status: 'Active',
    lastActive: '1 hour ago'
  }
]

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
      </div>
      
      <div className="mt-4 pt-4 border-t border-[#00FF88] border-opacity-20">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Wallet</span>
          <span className="text-xs text-[#00FF88]">
            {`${device.walletAddress.slice(0, 6)}...${device.walletAddress.slice(-4)}`}
          </span>
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
  const [devices, setDevices] = useState(mockDevices)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  // Set isClient to true after component mounts to avoid SSR issues
  useEffect(() => {
    setIsClient(true)
    
    // Simulate fetching devices from blockchain
    // This is where you would integrate with Nodit indexer in the future
    const fetchDevices = async () => {
      setLoading(true)
      
      // Simulating API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In a real implementation, you would fetch data from a blockchain indexer
      // const response = await fetch('your-nodit-indexer-endpoint');
      // const data = await response.json();
      // setDevices(data);
      
      setLoading(false)
    }
    
    fetchDevices()
  }, [])
  
  // Handle device selection
  const handleDeviceSelect = (device: Device) => {
    console.log('Selected device:', device)
    
    // Pass device information to the create-agent page using query parameters
    router.push(`/create-agent?deviceId=${device.id}&deviceModel=${encodeURIComponent(device.deviceModel)}&deviceStatus=${device.status}&deviceAddress=${device.walletAddress}&ngrokLink=${encodeURIComponent(device.ngrokLink)}`)
  }
  
  if (!isClient) {
    return null // Avoid rendering during SSR
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
              <p className="text-xl mb-12 text-[#AAAAAA] max-w-4xl mx-auto">
                Browse and select from available deployed devices to host your AI agents. 
                These devices have been registered on-chain and are ready to run your agents.
              </p>
            </motion.div>
          </div>
        </section>
        
        {/* Marketplace Section */}
        <section className="py-10 px-6">
          <div className="container mx-auto">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00FF88]"></div>
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
                <p className="text-xl text-[#AAAAAA]">No devices available at the moment.</p>
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
                Want to add your own device?
              </h2>
              <p className="text-[#AAAAAA] mb-6">
                Deploy your idle mobile devices and earn $FRANKY by providing computing resources for AI agents.
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
