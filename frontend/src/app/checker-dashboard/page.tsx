'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiServer, FiClock, FiZap, FiCheckCircle } from 'react-icons/fi'
import { Share2, Users, Database, ShieldCheck } from 'lucide-react'
import Header from '@/components/ui/Header'

export default function CheckerDashboardPage() {
  const [checkers, setCheckers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hcsInfo, setHcsInfo] = useState({
    deviceRegistryTopicId: 'Loading...',
    checkerRegistryTopicId: 'Loading...',
    lastRefreshed: new Date().toLocaleString()
  })

  // Fetch checker nodes
  const fetchCheckers = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/register-checker')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch checker nodes')
      }

      const data = await response.json()
      setCheckers(data.checkers || [])

      // In a real implementation, we would fetch these from an API endpoint
      // For now, simulate fetching HCS info
      setHcsInfo({
        deviceRegistryTopicId: process.env.DEVICE_REGISTRY_TOPIC_ID || 'Auto-created',
        checkerRegistryTopicId: process.env.CHECKER_REGISTRY_TOPIC_ID || 'Auto-created',
        lastRefreshed: new Date().toLocaleString()
      })
    } catch (err: any) {
      console.error('Error fetching checkers:', err)
      setError(err.message || 'Failed to fetch checker nodes')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    fetchCheckers()
  }, [])

  // Helper to format time ago
  const timeAgo = (dateString: string) => {
    if (!dateString) return 'Unknown'
    
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    }
    
    let counter
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      counter = Math.floor(seconds / (secondsInUnit as number))
      if (counter > 0) {
        return `${counter} ${unit}${counter === 1 ? '' : 's'} ago`
      }
    }
    
    return 'Just now'
  }

  // Get status color based on activity
  const getStatusColor = (lastSeen: string) => {
    if (!lastSeen) return 'bg-gray-500'
    
    const date = new Date(lastSeen)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) return 'bg-green-500'
    if (diffInHours < 24) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <>
      <Header />
      
      <div className="container mx-auto px-4 py-8 mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Checker Network Dashboard
          </h1>
          
          <p className="text-gray-400 mb-8 max-w-3xl">
            Monitor the health and activity of checker nodes in the network. This dashboard shows all 
            registered checker nodes and their current status using the Hedera Consensus Service.
          </p>
        </motion.div>
        
        {/* HCS Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-black/50 backdrop-blur-sm border border-[#00FF88]/30 rounded-xl p-5">
            <div className="flex items-center">
              <div className="bg-[#00FF88]/20 rounded-full p-3 mr-3">
                <Share2 className="h-6 w-6 text-[#00FF88]" />
              </div>
              <div>
                <h3 className="text-white font-medium">HCS Status</h3>
                <p className="text-gray-400 text-sm">Consensus Service</p>
              </div>
            </div>
            <div className="mt-4 text-gray-300">
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-sm">Network</span>
                <span className="text-sm font-medium">{process.env.HEDERA_NETWORK || 'testnet'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-sm">Last Updated</span>
                <span className="text-sm font-medium">{hcsInfo.lastRefreshed}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-black/50 backdrop-blur-sm border border-[#00FF88]/30 rounded-xl p-5">
            <div className="flex items-center">
              <div className="bg-[#00FF88]/20 rounded-full p-3 mr-3">
                <Database className="h-6 w-6 text-[#00FF88]" />
              </div>
              <div>
                <h3 className="text-white font-medium">Registry Topics</h3>
                <p className="text-gray-400 text-sm">Topic IDs in HCS</p>
              </div>
            </div>
            <div className="mt-4 text-gray-300">
              <div className="flex flex-col py-2 border-b border-gray-800">
                <span className="text-sm">Device Registry</span>
                <span className="text-xs font-medium text-[#00FF88] truncate">{hcsInfo.deviceRegistryTopicId}</span>
              </div>
              <div className="flex flex-col py-2 border-b border-gray-800">
                <span className="text-sm">Checker Registry</span>
                <span className="text-xs font-medium text-[#00FF88] truncate">{hcsInfo.checkerRegistryTopicId}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-black/50 backdrop-blur-sm border border-[#00FF88]/30 rounded-xl p-5">
            <div className="flex items-center">
              <div className="bg-[#00FF88]/20 rounded-full p-3 mr-3">
                <Users className="h-6 w-6 text-[#00FF88]" />
              </div>
              <div>
                <h3 className="text-white font-medium">Checker Nodes</h3>
                <p className="text-gray-400 text-sm">Active participants</p>
              </div>
            </div>
            <div className="mt-4 text-gray-300">
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-sm">Total Registered</span>
                <span className="text-sm font-medium">{checkers.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-sm">Active (24h)</span>
                <span className="text-sm font-medium">
                  {checkers.filter(c => {
                    const lastSeen = new Date(c.lastSeen);
                    const now = new Date();
                    return (now.getTime() - lastSeen.getTime()) < (24 * 60 * 60 * 1000);
                  }).length}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Checker Nodes Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-black/50 backdrop-blur-sm border border-[#00FF88]/30 rounded-xl p-5 mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Registered Checker Nodes</h2>
            <button
              onClick={fetchCheckers}
              className="px-4 py-2 bg-[#00FF88]/20 hover:bg-[#00FF88]/30 text-[#00FF88] rounded-lg text-sm transition-all duration-200"
            >
              Refresh Data
            </button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FF88]"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg text-center">
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchCheckers}
                className="mt-2 px-4 py-2 bg-red-800/30 hover:bg-red-800/50 text-red-300 rounded-lg text-sm"
              >
                Retry
              </button>
            </div>
          ) : checkers.length === 0 ? (
            <div className="text-center py-8">
              <FiServer className="mx-auto h-12 w-12 text-gray-600 mb-3" />
              <p className="text-gray-400">No checker nodes registered yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-sm border-b border-gray-800">
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Wallet Address</th>
                    <th className="px-4 py-3 text-left">Server URL</th>
                    <th className="px-4 py-3 text-left">Registered</th>
                    <th className="px-4 py-3 text-left">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {checkers.map((checker, index) => (
                    <tr 
                      key={checker.walletAddress || index} 
                      className="border-b border-gray-800 text-gray-300 hover:bg-black/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className={`h-3 w-3 rounded-full mr-2 ${getStatusColor(checker.lastSeen)}`}></div>
                          <span className="text-sm">
                            {getStatusColor(checker.lastSeen) === 'bg-green-500' ? 'Active' : 
                             getStatusColor(checker.lastSeen) === 'bg-yellow-500' ? 'Idle' : 'Offline'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <span className="text-xs font-mono truncate max-w-[150px]">
                            {checker.walletAddress}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <a 
                          href={checker.serverUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-[#00FF88] hover:underline truncate max-w-[200px] inline-block"
                        >
                          {checker.serverUrl}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {new Date(checker.registeredAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {timeAgo(checker.lastSeen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
        
        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-black/50 backdrop-blur-sm border border-[#00FF88]/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-[#00FF88]" />
              About the Checker Network
            </h3>
            <p className="text-gray-400 mb-3">
              The Checker Network provides a decentralized reputation system for devices in the Franky network. 
              It uses Hedera Consensus Service (HCS) to ensure transparent, immutable, and consensus-based 
              reputation scoring.
            </p>
            <p className="text-gray-400">
              Each checker node independently evaluates device health and submits results to HCS. The system
              then calculates a consensus reputation score using a democratic median approach.
            </p>
          </div>
          
          <div className="bg-black/50 backdrop-blur-sm border border-[#00FF88]/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center">
              <Share2 className="w-5 h-5 mr-2 text-[#00FF88]" />
              Hedera Consensus Service
            </h3>
            <p className="text-gray-400 mb-3">
              HCS provides a trust layer for applications requiring high throughput and low latency consensus
              on messages. The checker network uses HCS to store all reputation data with immutable timestamps.
            </p>
            <p className="text-gray-400">
              Each device has a dedicated HCS topic that stores all checker evaluations. This creates a transparent
              and auditable history of device reputation over time.
            </p>
          </div>
        </motion.div>
      </div>
    </>
  )
} 