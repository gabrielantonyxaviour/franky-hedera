'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FiSearch, FiServer, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi'
import { Zap, ShieldCheck, Clock, Share2 } from 'lucide-react'
import Header from '@/components/ui/Header'

interface HcsInfo {
  network: string;
  deviceRegistryTopicId: string;
  checkerRegistryTopicId: string;
  lastRefreshed: string;
}

interface Device {
  deviceAddress: string;
  ngrokLink?: string;
  status: 'checked' | 'skipped' | 'error';
  checked: string;
  reputationScore?: number;
  error?: string;
  reason?: string;
  consensusDetails?: {
    consensusMethod: string;
    topicId: string;
    checkerCount: number;
  };
  retrievalStats?: {
    successRate: number;
    averageResponseTime: number;
    totalChecks: number;
  };
}

// Background component
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

// DeviceCard component to display device info and reputation
const DeviceCard = ({ device }: { device: Device }) => {
  // Format reputation score for display
  const formatScore = (score: number) => {
    return score.toFixed(2);
  }

  // Determine reputation color based on score
  const getReputationColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-emerald-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  }

  // Determine reputation label based on score
  const getReputationLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Average';
    if (score >= 30) return 'Poor';
    return 'Unreliable';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-black/50 backdrop-blur-sm border border-[#00FF88]/30 rounded-xl p-5 mb-4"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h3 className="text-lg font-semibold text-white truncate max-w-[250px]">
          {device.deviceAddress}
        </h3>
        <div className="mt-2 sm:mt-0">
          {device.status === 'checked' ? (
            <div className={`flex items-center ${getReputationColor(device.reputationScore || 0)}`}>
              <ShieldCheck className="w-5 h-5 mr-2" />
              <span className="font-bold">{formatScore(device.reputationScore || 0)}</span>
              <span className="ml-2 text-sm">{getReputationLabel(device.reputationScore || 0)}</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-400">
              <Clock className="w-5 h-5 mr-2" />
              <span>{device.status === 'skipped' ? 'Skipped' : 'Error'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center text-gray-300">
            <FiServer className="w-4 h-4 mr-2 text-[#00FF88]" />
            <span className="text-sm">Ngrok Link:</span>
            <span className="ml-2 text-sm text-[#00FF88] truncate max-w-[200px]">
              {device.ngrokLink || 'Not available'}
            </span>
          </div>

          <div className="flex items-center text-gray-300">
            <FiClock className="w-4 h-4 mr-2 text-[#00FF88]" />
            <span className="text-sm">Last Checked:</span>
            <span className="ml-2 text-sm">
              {new Date(device.checked).toLocaleString()}
            </span>
          </div>

          {device.consensusDetails && (
            <div className="flex items-center text-gray-300">
              <Share2 className="w-4 h-4 mr-2 text-[#00FF88]" />
              <span className="text-sm">Consensus Method:</span>
              <span className="ml-2 text-sm capitalize">
                {device.consensusDetails.consensusMethod}
              </span>
            </div>
          )}
        </div>

        {device.status === 'checked' && device.retrievalStats && (
          <div className="space-y-2">
            <div className="flex items-center text-gray-300">
              <FiCheckCircle className="w-4 h-4 mr-2 text-[#00FF88]" />
              <span className="text-sm">Success Rate:</span>
              <span className="ml-2 text-sm">
                {(device.retrievalStats.successRate * 100).toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center text-gray-300">
              <Clock className="w-4 h-4 mr-2 text-[#00FF88]" />
              <span className="text-sm">Avg Response Time:</span>
              <span className="ml-2 text-sm">
                {device.retrievalStats.averageResponseTime.toFixed(0)} ms
              </span>
            </div>

            <div className="flex items-center text-gray-300">
              <Zap className="w-4 h-4 mr-2 text-[#00FF88]" />
              <span className="text-sm">Total Checks:</span>
              <span className="ml-2 text-sm">
                {device.retrievalStats.totalChecks}
              </span>
            </div>
          </div>
        )}
      </div>

      {device.consensusDetails && device.consensusDetails.topicId && (
        <div className="mt-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-start">
            <Share2 className="w-5 h-5 mr-2 text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm text-blue-400 font-medium">Hedera Consensus Service</p>
              <p className="text-xs text-gray-400 mt-1">
                HCS Topic: <span className="text-blue-400">{device.consensusDetails.topicId}</span>
              </p>
              <p className="text-xs text-gray-400">
                Checker nodes: <span className="text-blue-400">{device.consensusDetails.checkerCount}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {device.status === 'error' && (
        <div className="mt-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="flex items-start">
            <FiXCircle className="w-5 h-5 mr-2 text-red-400 mt-0.5" />
            <div>
              <p className="text-sm text-red-400 font-medium">Error checking device</p>
              <p className="text-xs text-gray-400 mt-1">{device.error}</p>
            </div>
          </div>
        </div>
      )}

      {device.status === 'skipped' && (
        <div className="mt-2 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start">
            <FiClock className="w-5 h-5 mr-2 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-400 font-medium">Device skipped</p>
              <p className="text-xs text-gray-400 mt-1">{device.reason}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// SearchForm component
const SearchForm = ({ onSearch, isLoading }: { onSearch: (address: string, numChecks: number) => void, isLoading: boolean }) => {
  const [deviceAddress, setDeviceAddress] = useState('')
  const [numChecks, setNumChecks] = useState(5)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (deviceAddress.trim() || deviceAddress === '') { // Allow empty for all devices
      onSearch(deviceAddress.trim(), numChecks)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto mb-8">
      <div className="bg-black/50 backdrop-blur-sm border border-[#00FF88]/30 rounded-xl p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="deviceAddress" className="block text-sm font-medium text-gray-300 mb-1">
              Device Address (optional)
            </label>
            <div className="relative">
              <input
                type="text"
                id="deviceAddress"
                value={deviceAddress}
                onChange={(e) => setDeviceAddress(e.target.value)}
                placeholder="0x... (leave empty to check all devices)"
                className="w-full p-3 pl-10 bg-black/70 border border-[#00FF88]/20 rounded-lg text-white focus:border-[#00FF88]/50 focus:outline-none"
              />
              <FiServer className="absolute left-3 top-3.5 text-[#00FF88]" />
            </div>
          </div>

          <div className="w-full md:w-48">
            <label htmlFor="numChecks" className="block text-sm font-medium text-gray-300 mb-1">
              Number of Checks
            </label>
            <select
              id="numChecks"
              value={numChecks}
              onChange={(e) => setNumChecks(Number(e.target.value))}
              className="w-full p-3 bg-black/70 border border-[#00FF88]/20 rounded-lg text-white focus:border-[#00FF88]/50 focus:outline-none"
            >
              <option value={3}>3 checks</option>
              <option value={5}>5 checks</option>
              <option value={10}>10 checks</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full md:w-auto px-6 py-3 rounded-lg ${isLoading
                  ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                  : 'bg-[#00FF88] text-black hover:bg-[#00FF88]/90'
                } transition-colors flex items-center justify-center font-medium`}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                  Checking...
                </>
              ) : (
                <>
                  <FiSearch className="mr-2" />
                  Check Devices
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

export default function DeviceCheckerPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hcsInfo, setHcsInfo] = useState<HcsInfo>({
    network: 'Loading...',
    deviceRegistryTopicId: 'Loading...',
    checkerRegistryTopicId: 'Loading...',
    lastRefreshed: new Date().toLocaleString()
  })

  // Fetch initial HCS info
  useEffect(() => {
    const fetchHcsInfo = async () => {
      try {
        const response = await fetch('/api/register-checker')
        if (!response.ok) {
          throw new Error('Failed to fetch HCS info')
        }
        const data = await response.json()
        setHcsInfo(data.hcsInfo)
      } catch (err: any) {
        console.error('Error fetching HCS info:', err)
        setError(err.message || 'Failed to fetch HCS info')
      }
    }
    fetchHcsInfo()
  }, [])

  // Function to search devices by address
  const searchDevices = async (deviceAddress: string, numChecks: number) => {
    setIsLoading(true)
    setError(null)
    setSelectedDevices([]) // Reset selected devices when loading new ones

    try {
      const queryParams = new URLSearchParams()
      if (deviceAddress) {
        queryParams.append('deviceAddress', deviceAddress.toLowerCase())
      }
      queryParams.append('numRetrievals', numChecks.toString())

      const response = await fetch(`/api/device-checker?${queryParams.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to check devices')
      }

      const data = await response.json()
      setDevices(data.results || [])

    } catch (err: any) {
      console.error('Error checking devices:', err)
      setError(err.message || 'An error occurred while checking devices')
    } finally {
      setIsLoading(false)
    }
  }

  // Function to toggle device selection
  const toggleDeviceSelection = (deviceAddress: string) => {
    setSelectedDevices(prev => {
      if (prev.includes(deviceAddress)) {
        return prev.filter(addr => addr !== deviceAddress);
      } else {
        return [...prev, deviceAddress];
      }
    });
  };

  // Function to select all devices
  const selectAllDevices = () => {
    if (selectedDevices.length === devices.length) {
      // If all are selected, unselect all
      setSelectedDevices([]);
    } else {
      // Otherwise, select all
      setSelectedDevices(devices.map(device => device.deviceAddress));
    }
  };

  // Function to trigger self-check using our server
  const triggerServerSelfCheck = async () => {
    if (devices.length === 0) {
      setError('No devices to check. Please search for devices first.')
      return
    }

    setIsLoading(true)
    setError(null)
    setSelectedDevices([])

    try {
      // Call self-check API with empty deviceAddresses to check all devices
      const response = await fetch('/api/self-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deviceAddresses: [] })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to perform self-check')
      }

      const data = await response.json()
      setDevices(data)

      // Refresh devices to show updated reputation after a short delay
      setTimeout(() => {
        searchDevices('', 5)
      }, 5000) // 5-second delay to allow HCS to process
    } catch (err: any) {
      console.error('Error performing self-check:', err)
      setError(err.message || 'An error occurred while performing self-check')
    } finally {
      setIsLoading(false)
    }
  }

  // Function to trigger manual self-check for all or selected devices
  const triggerManualCheck = async (checkAll: boolean = false) => {
    if (devices.length === 0) {
      setError('No devices to check. Please search for devices first.')
      return
    }

    if (!checkAll && selectedDevices.length === 0) {
      setError('Please select at least one device to check or use "Check All Devices".')
      return
    }

    setIsLoading(true)
    setError(null)
    setSelectedDevices([])

    try {
      // Determine which device addresses to include
      const deviceAddresses = checkAll 
        ? [] // Empty array means check all devices on the backend
        : selectedDevices;

      // Call self-check API
      const response = await fetch('/api/self-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deviceAddresses })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to perform self-check')
      }

      const data = await response.json()
      setDevices(data)

      // Refresh devices to show updated reputation after a short delay
      setTimeout(() => {
        searchDevices('', 5)
      }, 5000) // 5-second delay to allow HCS to process
    } catch (err: any) {
      console.error('Error performing self-check:', err)
      setError(err.message || 'An error occurred while performing self-check')
    } finally {
      setIsLoading(false)
    }
  }

  // Function to register server as checker
  const registerAsChecker = async () => {
    setIsRegistering(true)
    setError(null)
    
    try {
      const response = await fetch('/api/register-checker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress: '0.0.5868472', // Hedera account ID format
          serverUrl: window.location.origin // Current server URL
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to register checker')
      }

      const data = await response.json()
      console.log('Registration successful:', data)
      alert('Successfully registered as a checker node!')
    } catch (err: any) {
      console.error('Error registering checker:', err)
      setError(err.message || 'Failed to register as checker')
    } finally {
      setIsRegistering(false)
    }
  }

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
              DePIN Device Checker
            </h1>
            <p className="text-xl mb-6 text-[#AAAAAA] max-w-4xl mx-auto">
              Verify device reliability and build reputation scores based on content retrieval from Akave buckets.
            </p>
            <p className="text-md mb-6 text-[#888888] max-w-3xl mx-auto">
              The Checker Network creates verifiable quality of service metrics for DePIN nodes,
              measuring data retrieval success rates and response times.
            </p>
            
            {/* Register as Checker Button */}
            <button
              onClick={registerAsChecker}
              disabled={isRegistering}
              className={`px-6 py-3 rounded-lg text-black font-medium mb-8 ${
                isRegistering
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#00FF88] hover:bg-[#00FF88]/90'
              }`}
            >
              {isRegistering ? (
                <>
                  <span className="animate-spin inline-block mr-2">⚡</span>
                  Registering...
                </>
              ) : (
                'Register as Checker Node'
              )}
            </button>
          </motion.div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 px-6">
        <div className="container mx-auto">
          <SearchForm onSearch={searchDevices} isLoading={isLoading} />

          {error && (
            <div className="w-full max-w-4xl mx-auto mb-8 p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
              <div className="flex items-start">
                <FiXCircle className="w-6 h-6 mr-3 text-red-400 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">Error</p>
                  <p className="text-gray-300 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {isLoading && devices.length === 0 && (
            <div className="w-full max-w-4xl mx-auto text-center py-12">
              <div className="inline-block p-3 rounded-full bg-[#00FF88]/10 mb-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FF88]"></div>
              </div>
              <p className="text-gray-300">Checking devices, please wait...</p>
              <p className="text-gray-500 text-sm mt-2">This may take a few moments to complete</p>
            </div>
          )}

          {!isLoading && devices.length === 0 && !error && (
            <div className="w-full max-w-4xl mx-auto text-center py-12">
              <div className="inline-block p-3 rounded-full bg-gray-800 mb-6">
                <FiServer className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-gray-300">No devices found</p>
              <p className="text-gray-500 text-sm mt-2">Try searching for a different device address</p>
            </div>
          )}

          {devices.length > 0 && (
            <div className="w-full max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#00FF88]">
                  Device Reputation Scores
                </h2>
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-2">
                    <button
                      onClick={triggerServerSelfCheck}
                      disabled={isLoading}
                      className={`px-4 py-2 rounded-lg flex items-center text-sm ${
                        isLoading
                          ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      } transition-colors`}
                    >
                      {isLoading ? (
                        <>
                          <span className="animate-spin mr-2">
                            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </span>
                          Server Checking...
                        </>
                      ) : (
                        <>
                          <FiServer className="w-4 h-4 mr-2" />
                          Server Self-Check
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => triggerManualCheck(true)}
                      disabled={isLoading}
                      className={`px-4 py-2 rounded-lg flex items-center text-sm ${
                        isLoading
                          ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      } transition-colors`}
                    >
                      {isLoading ? (
                        <>
                          <span className="animate-spin mr-2">
                            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </span>
                          Checking All...
                        </>
                      ) : (
                        <>
                          <FiServer className="w-4 h-4 mr-2" />
                          Check All Devices
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => triggerManualCheck(false)}
                      disabled={isLoading || selectedDevices.length === 0}
                      className={`px-4 py-2 rounded-lg flex items-center text-sm ${
                        isLoading && selectedDevices.length === 0
                          ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      } transition-colors`}
                    >
                      {isLoading && selectedDevices.length === 0 ? (
                        <>
                          <span className="animate-spin mr-2">
                            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </span>
                          Checking Selected...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          Check Selected ({selectedDevices.length})
                        </>
                      )}
                    </button>
                  </div>
                  <span className="text-sm text-gray-400">
                    {devices.length} device{devices.length !== 1 ? 's' : ''} found
                  </span>
                </div>
              </div>

              {/* Selection Controls */}
              <div className="mb-4 flex justify-between items-center">
                <div className="flex items-center">
                  <button
                    onClick={selectAllDevices}
                    className="text-sm text-[#00FF88] hover:underline focus:outline-none"
                  >
                    {selectedDevices.length === devices.length 
                      ? 'Unselect All' 
                      : selectedDevices.length === 0 
                        ? 'Select All' 
                        : `Select All (${selectedDevices.length}/${devices.length} selected)`}
                  </button>
                </div>
                <div className="text-xs text-gray-400">
                  Select devices to check or use "Check All Devices" to test everything
                </div>
              </div>

              <div className="space-y-4">
                {devices.map((device, index) => (
                  <div key={device.deviceAddress || index} className="flex items-start">
                    <div className="pt-5 pr-3">
                      <input
                        type="checkbox"
                        id={`device-${device.deviceAddress}`}
                        checked={selectedDevices.includes(device.deviceAddress)}
                        onChange={() => toggleDeviceSelection(device.deviceAddress)}
                      />
                    </div>
                    <div className="flex-1">
                      <DeviceCard device={device} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}