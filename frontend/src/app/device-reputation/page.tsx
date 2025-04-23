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
}

interface DeviceReputation {
  deviceAddress: string
  ngrokLink: string
  status: string
  reputationScore: number
  retrievalStats: ReputationStats
  checked: string
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
            <span className="text-sm text-gray-400">{device.status} • Last checked: {new Date(device.checked).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 flex-grow">
        <div className="flex items-center text-[#CCCCCC]">
          <FiTrendingUp className="mr-2 text-[#00FF88]" />
          <span>Reputation Score: <span className="text-[#00FF88] font-medium">{device.reputationScore.toFixed(2)}</span></span>
        </div>

        <div className="flex items-center text-[#CCCCCC]">
          <FiActivity className="mr-2 text-[#00FF88]" />
          <span>Success Rate: <span className="text-[#00FF88] font-medium">{(device.retrievalStats.successRate * 100).toFixed(1)}%</span></span>
        </div>

        <div className="flex items-center text-[#CCCCCC]">
          <FiClock className="mr-2 text-[#00FF88]" />
          <span>Avg Response Time: <span className="text-[#00FF88] font-medium">{device.retrievalStats.averageResponseTime.toFixed(0)}ms</span></span>
        </div>

        <div className="flex items-center text-[#CCCCCC]">
          <FiShield className="mr-2 text-[#00FF88]" />
          <span>Total Checks: <span className="text-[#00FF88] font-medium">{device.retrievalStats.totalChecks}</span></span>
        </div>

        <div className="flex items-start text-[#CCCCCC]">
          <FiCpu className="mr-2 text-[#00FF88] mt-1 flex-shrink-0" />
          <span className="text-sm break-all">
            Endpoint: {device.ngrokLink}
          </span>
        </div>
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
        setDevices(data.results)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDevices()
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