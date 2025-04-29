'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/ui/Header'
import { FiCpu, FiActivity, FiClock, FiTrendingUp, FiShield, FiSmartphone } from 'react-icons/fi'

// Define interfaces
interface ReputationStats {
  successRate: number
  averageResponseTime: number
  totalChecks: number
  consistency?: number
  lastSeen?: string
}

interface DeviceReputation {
  deviceAddress: string
  ngrokLink: string
  status: string
  reputationScore: number
  retrievalStats: ReputationStats
  checked: string
  error?: string
  reputationDataUrl?: string | null
  deviceMetadata?: string // Pinata URL
  metadata?: {
    ngrokUrl?: string
    deviceModel?: string
    ram?: string
    storage?: string
    cpu?: string
    owner?: string
    [key: string]: any
  }
}

// Background component (reused from marketplace)
const Background = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30"></div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-emerald-900/10"></div>

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

// Device reputation card component
const ReputationCard = ({ device }: { device: DeviceReputation }) => {
  const stats = device.retrievalStats || {
    successRate: 0,
    averageResponseTime: 0,
    totalChecks: 0
  };

  // Get ngrok URL from either direct ngrokLink or from metadata
  const getNgrokUrl = () => {
    if (device.metadata?.ngrokUrl) {
      return device.metadata.ngrokUrl;
    }
    return device.ngrokLink || 'Not available';
  }

  return (
    <motion.div
      className="p-6 rounded-xl border border-[#00FF88] border-opacity-30 bg-black/50 backdrop-blur-sm h-full flex flex-col"
      whileHover={{
        y: -5,
        boxShadow: '0 10px 25px -5px rgba(0, 255, 136, 0.3)'
      }}
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
            Device {device.deviceAddress.slice(0, 6)}...{device.deviceAddress.slice(-4)}
          </h3>
          <div className="flex items-center mt-1">
            <span className={`inline-block w-2 h-2 rounded-full ${device.status === 'checked' ? 'bg-[#00FF88]' : 'bg-gray-400'} mr-2`}></span>
            <span className="text-sm text-gray-400">
              {device.status} • Last checked: {new Date(device.checked).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {device.error ? (
        <div className="text-red-500 mb-4">
          Error: {device.error}
        </div>
      ) : null}

      <div className="space-y-3 flex-grow">
        <div className="flex items-center text-[#CCCCCC]">
          <FiTrendingUp className="mr-2 text-[#00FF88]" />
          <span>Reputation Score: <span className="text-[#00FF88] font-medium">{device.reputationScore.toFixed(2)}</span></span>
        </div>

        <div className="flex items-center text-[#CCCCCC]">
          <FiActivity className="mr-2 text-[#00FF88]" />
          <span>Success Rate: <span className="text-[#00FF88] font-medium">{(stats.successRate * 100).toFixed(1)}%</span></span>
        </div>

        <div className="flex items-center text-[#CCCCCC]">
          <FiClock className="mr-2 text-[#00FF88]" />
          <span>Avg Response Time: <span className="text-[#00FF88] font-medium">{stats.averageResponseTime.toFixed(0)}ms</span></span>
        </div>

        <div className="flex items-center text-[#CCCCCC]">
          <FiShield className="mr-2 text-[#00FF88]" />
          <span>Total Checks: <span className="text-[#00FF88] font-medium">{stats.totalChecks}</span></span>
        </div>

        <div className="flex items-start text-[#CCCCCC]">
          <FiCpu className="mr-2 text-[#00FF88] mt-1 flex-shrink-0" />
          <span className="text-sm break-all">
            Endpoint: {getNgrokUrl()}
          </span>
        </div>

        {device.metadata && device.metadata.deviceModel && (
          <div className="mt-4 p-3 bg-black/30 border border-gray-800 rounded-lg">
            <p className="text-xs text-[#00FF88] mb-2 font-medium">Device Specs:</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
              {device.metadata.deviceModel && (
                <div>Model: <span className="text-gray-300">{device.metadata.deviceModel}</span></div>
              )}
              {device.metadata.ram && (
                <div>RAM: <span className="text-gray-300">{device.metadata.ram}</span></div>
              )}
              {device.metadata.storage && (
                <div>Storage: <span className="text-gray-300">{device.metadata.storage}</span></div>
              )}
              {device.metadata.cpu && (
                <div>CPU: <span className="text-gray-300">{device.metadata.cpu}</span></div>
              )}
            </div>
          </div>
        )}

        {device.reputationDataUrl && (
          <div className="mt-4 text-sm">
            <a 
              href={device.reputationDataUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#00FF88] hover:underline"
            >
              View Full Report
            </a>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Main page component
export default function DeviceReputationPage() {
  const [devices, setDevices] = useState<DeviceReputation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('/api/device-checker')
        if (!response.ok) {
          throw new Error('Failed to fetch device reputation data')
        }
        const data = await response.json()
        
        // Process the device data
        if (data.results && Array.isArray(data.results)) {
          // Each device already has metadata and ngrokUrl from the API
          const processedDevices = data.results.map((device: any) => ({
            ...device,
            // Ensure all required properties have default values
            retrievalStats: device.retrievalStats || {
              successRate: 0,
              averageResponseTime: 0,
              totalChecks: 0
            },
            reputationScore: device.reputationScore || 0,
            status: device.status || 'unknown',
            checked: device.checked || new Date().toISOString(),
            // Use ngrokUrl from metadata if available, otherwise use the direct ngrokLink
            ngrokLink: (device.metadata && device.metadata.ngrokUrl) 
              ? device.metadata.ngrokUrl 
              : (device.ngrokLink || 'Not available')
          }));
          
          setDevices(processedDevices);
        } else {
          // Handle empty results
          setDevices([]);
        }
      } catch (err: any) {
        setError(err.message)
        console.error('Error fetching device data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDevices()

    // Refresh data every 5 minutes
    const interval = setInterval(fetchDevices, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      <Background />
      
      <div className="container mx-auto px-4 py-8">
        <Header />
        
        <div className="mt-8 mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
            Device Reputation
          </h1>
          <p className="text-gray-400 mt-2">
            Monitor the health and reliability of devices in the Franky network
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00FF88] mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading device reputation data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device, index) => (
              <ReputationCard key={device.deviceAddress + index} device={device} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Function to fetch device metadata from Pinata URL
const fetchDeviceMetadata = async (metadataUrl: string) => {
  try {
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      console.error(`Failed to fetch metadata: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching device metadata:', error);
    return null;
  }
}; 