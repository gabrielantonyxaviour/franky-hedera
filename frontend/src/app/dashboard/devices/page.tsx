'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import axios from 'axios'
import { ethers } from 'ethers'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePrivy } from '@privy-io/react-auth'

// Define interface types for our data
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

interface Transaction {
  transactionHash: string
  blockNumber: number
  timestamp: number
  from: string
  input: string
  functionSelector?: string
}

// Shared styles
const cardStyle = "bg-black/30 backdrop-blur-sm border border-[#00FF88]/20 rounded-lg p-4 mb-4 hover:border-[#00FF88]/40 transition-all cursor-pointer"
const labelStyle = "text-[#00FF88] text-sm"
const valueStyle = "text-white text-lg font-medium"
const idStyle = "text-white/60 text-xs mt-1"
const emptyStateStyle = "text-white/60 italic text-center mt-12"

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Contract information
const CONTRACT_ADDRESS = '0x486989cd189ED5DB6f519712eA794Cee42d75b29'

const CONTRACT_ABI = [
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
  }
] as const

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
    if (mounted && user?.smartWallet) {
      setLoading(true)
      fetchDevices(user.smartWallet.address)
    }
  }, [user, mounted])

  const fetchDevices = async (walletAddress: string) => {
    setLoading(true)
    setError(null)
    setDebugInfo(null)

    try {
      const devicesData = await getDevicesByOwner(walletAddress, true)
      setDevices(devicesData.devices)
      if (devicesData.debug) {
        setDebugInfo(devicesData.debug)
      }
    } catch (error: any) {
      console.error("Error fetching devices:", error)
      setError(error?.message || "Failed to load devices data")
    } finally {
      setLoading(false)
    }
  }

  async function getDevicesByOwner(ownerAddress: string, showDebug = false): Promise<{
    devices: Device[],
    debug?: {
      functionSelector: string;
      allSelectors: { selector: string, from: string }[];
    }
  }> {
    try {
      console.log(`🔍 Searching for devices registered by: ${ownerAddress}`);
      const noditAPIKey = process.env.NEXT_PUBLIC_NODIT_API_KEY
      const axiosInstance = axios.create({
        baseURL: "https://web3.nodit.io/v1/base/mainnet",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-KEY": noditAPIKey,
        },
      })

      // Create interface using ethers
      const contractInterface = new ethers.Interface(CONTRACT_ABI)
      const registerDeviceFunction = contractInterface.getFunction("registerDevice")
      if (!registerDeviceFunction) {
        throw new Error("Could not find registerDevice function in ABI")
      }
      const registerDeviceSelector = registerDeviceFunction.selector

      const txResult = await axiosInstance.post(
        "/blockchain/getTransactionsByAccount",
        {
          accountAddress: CONTRACT_ADDRESS,
          withDecode: true,
        }
      )

      if (!txResult.data?.items?.length) {
        console.log("\nℹ️ No transactions found for this contract")
        return { devices: [] }
      }

      const deviceRegistrationTxs = txResult.data.items.filter((tx: Transaction) => {
        return tx.functionSelector?.toLowerCase() === registerDeviceSelector.toLowerCase() &&
          tx.from?.toLowerCase() === ownerAddress.toLowerCase()
      })

      if (deviceRegistrationTxs.length > 0) {
        console.log(`✅ Found ${deviceRegistrationTxs.length} device registration transaction(s) by this address:\n`)

        // Sort transactions by timestamp (newest first)
        deviceRegistrationTxs.sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp)

        const parsedDevices = deviceRegistrationTxs.map((tx: Transaction, index: number) => {
          console.log(`🖥️ Device Registration #${index + 1}`)
          console.log(`- TX Hash: ${tx.transactionHash}`)
          console.log(`- Block: ${tx.blockNumber}`)
          console.log(`- Date: ${new Date(tx.timestamp * 1000).toLocaleString()}`)

          try {
            const decodedData = contractInterface.parseTransaction({ data: tx.input })
            if (!decodedData || !decodedData.args) {
              throw new Error("Failed to decode transaction data")
            }

            console.log("\nRegistration Parameters:")
            console.log(`  Device Model: ${decodedData.args.deviceModel}`)
            console.log(`  RAM: ${decodedData.args.ram}`)
            console.log(`  Storage: ${decodedData.args.storageCapacity}`)
            console.log(`  CPU: ${decodedData.args.cpu}`)
            console.log(`  Ngrok Link: ${decodedData.args.ngrokLink}`)
            console.log(`  Hosting Fee: ${decodedData.args.hostingFee.toString()}`)
            console.log(`  Device Address: ${decodedData.args.deviceAddress}`)
            console.log(`  Verification Hash: ${decodedData.args.verificationHash}`)
            console.log("----------------------------------------")

            return {
              id: index + 1,
              txHash: tx.transactionHash,
              blockNumber: tx.blockNumber,
              timestamp: tx.timestamp,
              deviceModel: decodedData.args.deviceModel,
              ram: decodedData.args.ram,
              storageCapacity: decodedData.args.storageCapacity,
              cpu: decodedData.args.cpu,
              ngrokLink: decodedData.args.ngrokLink,
              deviceAddress: decodedData.args.deviceAddress,
              hostingFee: decodedData.args.hostingFee.toString(),
              verificationHash: decodedData.args.verificationHash
            }
          } catch (error) {
            console.log("⚠️ Could not decode device details")
            return {
              id: index + 1,
              txHash: tx.transactionHash,
              blockNumber: tx.blockNumber,
              timestamp: tx.timestamp,
              deviceModel: "Unknown",
              deviceAddress: "Unknown",
              hostingFee: "0",
              error: true
            }
          }
        })

        // Return all parsed devices without filtering
        return { devices: parsedDevices }
      } else {
        console.log("\n❌ No devices found for this wallet address")

        if (showDebug) {
          console.log("\nDebug Info:")
          console.log(`Looking for function selector: ${registerDeviceSelector}`)
          console.log(`All function selectors found:`)

          const allSelectors = txResult.data.items.map((tx: Transaction) => {
            console.log(`- ${tx.functionSelector} (from: ${tx.from})`)
            return {
              selector: tx.functionSelector || 'unknown',
              from: tx.from
            }
          })

          return {
            devices: [],
            debug: {
              functionSelector: registerDeviceSelector,
              allSelectors
            }
          }
        }

        return { devices: [] }
      }
    } catch (error: any) {
      console.error("\n⛔ Error:", error.message)
      if (error.response) {
        console.error("API Error:", error.response.data)
      }
      throw error
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
            <Link href="/dashboard" className="flex items-center text-[#00FF88]/80 hover:text-[#00FF88] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Dashboard
            </Link>
          </motion.div>
        </div>

        {!user?.smartWallet && (
          <div className="text-center py-20 text-white/70">
            <p className="text-xl">Please connect your wallet to view your devices</p>
          </div>
        )}

        {user?.smartWallet && loading && (
          <div className="text-center py-20 text-white/70">
            <div className="w-12 h-12 border-4 border-[#00FF88]/20 border-t-[#00FF88] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl">Loading your devices...</p>
          </div>
        )}

        {user?.smartWallet && !loading && error && (
          <div className="text-center py-20 text-red-400">
            <p className="text-xl">Error loading devices</p>
            <p className="text-sm mt-2">{error}</p>
            <button
              onClick={() => fetchDevices(user?.smartWallet?.address || '')}
              className="mt-4 px-4 py-2 bg-[#00FF88]/20 text-[#00FF88] rounded-lg hover:bg-[#00FF88]/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {user?.smartWallet && !loading && !error && (
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
                          {parseInt(device.hostingFee) > 0 ? `${device.hostingFee} $FRANKY` : 'Free'}
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