'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePrivy } from '@privy-io/react-auth'
import { formatEther } from 'viem'

interface Device {
  id: number
  txHash: string
  blockNumber: number
  timestamp: number
  deviceModel: string
  ram?: string
  storageCapacity?: string
  cpu?: string
  ngrokLink?: string
  deviceAddress: string
  hostingFee: string
  verificationHash?: string
  signature?: string
  error?: boolean
}


// Shared styles
const cardStyle = "bg-black/30 backdrop-blur-sm border border-[#00FF88]/20 rounded-lg p-4 mb-4 hover:border-[#00FF88]/40 transition-all cursor-pointer"
const labelStyle = "text-[#00FF88] text-sm"
const valueStyle = "text-white text-lg font-medium"
const emptyStateStyle = "text-white/60 italic text-center mt-12"

export default function DevicesPage() {
  const { user } = usePrivy()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [debugInfo, setDebugInfo] = useState<{
    functionSelector: string;
    allSelectors: { selector: string, from: string }[];
  } | null>(null)

  // Fix hydration issues by waiting for component to mount
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && user && user.wallet) {
      setLoading(true)
      fetchDevices(user.wallet.address)
    }
  }, [user, mounted])

  const fetchDevices = async (walletAddress: string) => {
    if (!user) return
    if (!user.wallet) return
    setLoading(true)
    setError(null)
    setDebugInfo(null)

    try {
      console.log(walletAddress)
      const devicesRequest = await fetch('/api/graph/devices-by-owner?address=' + walletAddress)
      if (!devicesRequest.ok) {
        throw new Error(`HTTP error! status: ${devicesRequest.status}`)
      }
      const fetchedDevices = await devicesRequest.json()
      console.log("Fetched devices:", fetchedDevices)
      const formattedDevices = await Promise.all(
        fetchedDevices.map(async (device: any) => {
          const metadataRequest = await fetch(`/api/akave/fetch-json?url=${encodeURIComponent(device.metadata)}`);
          const metadata = await metadataRequest.json();

          return {
            id: device.id,
            deviceModel: metadata.deviceModal ?? 'Samsung Galaxy S23',
            ram: metadata.ram ?? '8GB',
            storage: metadata.storage ?? '128GB',
            cpu: metadata.cpu ?? 'Snapdragon 8 Gen 2',
            ngrokLink: device.ngrokLink,
            walletAddress: device.id,
            hostingFee: device.hostingFee,
            agentCount: device.agents.length,
            status: device.agents.length > 0 ? 'In Use' : 'Available',
            lastActive: new Date(device.updatedAt * 1000).toLocaleDateString(),
            registeredAt: new Date(device.createdAt * 1000).toLocaleDateString(),
          };
        })
      );
      setDevices(formattedDevices.filter(Boolean));
    } catch (error: any) {
      console.error("Error fetching devices:", error)
      setError(error?.message || "Failed to load devices data")
    } finally {
      setLoading(false)
    }
  }

  // Return a loading state until mounted to avoid hydration errors
  if (!mounted) {
    return (
      <div className="pt-24 min-h-screen bg-gradient-to-b from-black to-emerald-950/20">
        <div className="container mx-auto px-4 pb-16">
          <motion.h1
            className="text-3xl md:text-4xl font-bold mb-10 text-center bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            My Devices
          </motion.h1>
          <div className="text-center py-20 text-white/70">
            <p className="text-xl">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 min-h-screen bg-gradient-to-b from-black to-emerald-950/20">
      <div className="container mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-10">
          <motion.h1
            className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            My Devices
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href="/profile" className="flex items-center text-[#00FF88]/80 hover:text-[#00FF88] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </Link>
          </motion.div>
        </div>

        {!user?.wallet && (
          <div className="text-center py-20 text-white/70">
            <p className="text-xl">Please connect your wallet to view your devices</p>
          </div>
        )}

        {user?.wallet && loading && (
          <div className="text-center py-20 text-white/70">
            <div className="w-12 h-12 border-4 border-[#00FF88]/20 border-t-[#00FF88] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl">Loading your devices...</p>
          </div>
        )}

        {user?.wallet && !loading && error && (
          <div className="text-center py-20 text-red-400">
            <p className="text-xl">Error loading devices</p>
            <p className="text-sm mt-2">{error}</p>
            <button
              onClick={() => fetchDevices(user?.wallet?.address || '')}
              className="mt-4 px-4 py-2 bg-[#00FF88]/20 text-[#00FF88] rounded-lg hover:bg-[#00FF88]/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {user?.wallet && !loading && !error && (
          <div className="max-w-3xl mx-auto">
            {/* Devices List */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-black/30 backdrop-blur-sm border border-[#00FF88]/20 rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Your Registered Devices</h2>
                <p className="text-white/70">Here are all the devices you've registered on the network.</p>
              </div>

              {devices.length === 0 ? (
                <div className="bg-black/30 backdrop-blur-sm border border-[#00FF88]/20 rounded-lg p-8 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-[#00FF88]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className={emptyStateStyle}>No devices registered yet</p>
                  <p className="text-white/50 text-sm mt-2 mb-6">Register a device to get started.</p>

                  {debugInfo && (
                    <div className="mt-8 bg-black/50 p-4 rounded-lg text-left overflow-auto max-h-64">
                      <h3 className="text-[#00FF88] font-mono text-sm mb-2">Debug Information</h3>
                      <p className="text-white/70 text-xs font-mono mb-2">
                        Looking for function selector: {debugInfo.functionSelector}
                      </p>
                      <p className="text-white/70 text-xs font-mono mb-1">All function selectors found:</p>
                      <ul className="text-white/50 text-xs font-mono">
                        {debugInfo.allSelectors.map((item, idx) => (
                          <li key={idx} className="mb-0.5">
                            - {item.selector} (from: {item.from.substring(0, 10)}...)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                devices.map((device) => (
                  <motion.div
                    key={device.txHash}
                    className={cardStyle}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <div className="flex flex-col">
                      <span className={labelStyle}>Device Model</span>
                      <span className={valueStyle}>{device.deviceModel || "Unknown"}</span>

                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div>
                          <span className={labelStyle}>RAM</span>
                          <p className="text-white/80 text-sm">{device.ram || "N/A"}</p>
                        </div>
                        <div>
                          <span className={labelStyle}>Storage</span>
                          <p className="text-white/80 text-sm">{device.storageCapacity || "N/A"}</p>
                        </div>
                        <div>
                          <span className={labelStyle}>CPU</span>
                          <p className="text-white/80 text-sm">{device.cpu || "N/A"}</p>
                        </div>
                      </div>

                      {device.deviceAddress && (
                        <div className="mt-3">
                          <span className={labelStyle}>Device Address</span>
                          <p className="text-white/80 text-sm font-mono text-xs">
                            {device.deviceAddress}
                          </p>
                        </div>
                      )}

                      <div className="mt-3">
                        <span className={labelStyle}>Hosting Fee</span>
                        <p className="text-white/80 text-sm">
                          {parseInt(device.hostingFee) > 0 ? `${formatEther(BigInt(device.hostingFee))} $FIL` : 'Free'}
                        </p>
                      </div>

                      <div className="flex justify-between mt-3">
                        <span className="text-xs text-white/40">
                          Registered: {new Date(device.timestamp * 1000).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
} 