'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import axios from 'axios'
import { ethers } from 'ethers'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

// Define interface types for our data
interface Agent {
  id: number
  txHash: string
  blockNumber: number
  timestamp: number
  prefix: string
  config?: string
  secrets?: string
  secretsHash?: string
  deviceAddress: string
  perApiCallFee: string
  isPublic: boolean
  agentAddress: string
  owner: string
  error?: boolean
}

interface Transaction {
  transactionHash: string
  blockNumber: number
  timestamp: number
  from: string
  to: string
  input: string
  functionSelector?: string
}

interface CharacterData {
  name?: string
  personality?: string
  backstory?: string
  appearance?: string
  [key: string]: any // For other possible fields
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
const CONTRACT_ADDRESS = '0x18c2e2f87183034700cc2A7cf6D86a71fd209678'

const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "prefix", "type": "string"},
      {"internalType": "string", "name": "config", "type": "string"},
      {"internalType": "string", "name": "secrets", "type": "string"},
      {"internalType": "bytes32", "name": "secretsHash", "type": "bytes32"},
      {"internalType": "address", "name": "deviceAddress", "type": "address"},
      {"internalType": "uint256", "name": "perApiCallFee", "type": "uint256"},
      {"internalType": "bool", "name": "isPublic", "type": "bool"}
    ],
    "name": "createAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "agentAddress", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "deviceAddress", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "prefix", "type": "string"},
      {"indexed": false, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "perApiCallFee", "type": "uint256"},
      {"indexed": false, "internalType": "bytes32", "name": "secretsHash", "type": "bytes32"},
      {"indexed": false, "internalType": "string", "name": "character", "type": "string"},
      {"indexed": false, "internalType": "string", "name": "secrets", "type": "string"},
      {"indexed": false, "internalType": "bool", "name": "isPublic", "type": "bool"}
    ],
    "name": "AgentCreated",
    "type": "event"
  }
] as const

export default function AgentsPage() {
  const { address } = useAccount()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [debugInfo, setDebugInfo] = useState<{
    functionSelector: string;
    allSelectors: {selector: string, from: string}[];
  } | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [characterData, setCharacterData] = useState<CharacterData | null>(null)
  const [characterLoading, setCharacterLoading] = useState(false)
  const [characterError, setCharacterError] = useState<string | null>(null)
  
  // Fix hydration issues by waiting for component to mount
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && address) {
      setLoading(true)
      fetchAgents(address)
    }
  }, [address, mounted])

  // When an agent is selected, fetch its character data
  useEffect(() => {
    if (selectedAgent && selectedAgent.config) {
      fetchCharacterData(selectedAgent.config)
    }
  }, [selectedAgent])

  const fetchAgents = async (walletAddress: string) => {
    setLoading(true)
    setError(null)
    setDebugInfo(null)
    
    try {
      const agentsData = await getAgentsByCreator(walletAddress, true)
      setAgents(agentsData.agents)
      if (agentsData.debug) {
        setDebugInfo(agentsData.debug)
      }
    } catch (error: any) {
      console.error("Error fetching agents:", error)
      setError(error?.message || "Failed to load agents data")
    } finally {
      setLoading(false)
    }
  }

  // Function to extract IPFS hash from config URL
  const extractIPFSHash = (configUrl: string): string => {
    if (!configUrl) return '';
    
    // If it's already just a hash
    if (configUrl.indexOf('/') === -1) return configUrl;
    
    // Extract the hash from IPFS URL format
    const parts = configUrl.split('/ipfs/');
    if (parts.length > 1) {
      return parts[1].trim();
    }
    
    return '';
  }

  // Function to fetch character data from IPFS
  const fetchCharacterData = async (configUrl: string) => {
    setCharacterLoading(true)
    setCharacterError(null)
    setCharacterData(null)
    
    const hash = extractIPFSHash(configUrl);
    if (!hash) {
      setCharacterError("Could not extract IPFS hash from config URL");
      setCharacterLoading(false);
      return;
    }
    
    try {
      // Try the Pinata gateway from environment variables first
      const pinataGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;
      
      const gateways = [
        pinataGateway ? `https://${pinataGateway}/ipfs/${hash}` : null,
        `https://ipfs.io/ipfs/${hash}`,
        `https://cloudflare-ipfs.com/ipfs/${hash}`,
        `https://gateway.pinata.cloud/ipfs/${hash}`,
      ].filter(Boolean) as string[];
      
      let fetchSuccess = false;
      
      for (const gateway of gateways) {
        try {
          console.log(`Trying to fetch character data from ${gateway}...`);
          
          const response = await fetch(gateway);
          if (!response.ok) {
            throw new Error(`Gateway responded with ${response.status}: ${response.statusText}`);
          }
          
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            console.log(`Successfully fetched character data from ${gateway}`);
            setCharacterData(data);
            fetchSuccess = true;
            break;
          } catch (jsonError) {
            console.error("Error parsing JSON:", jsonError);
            throw new Error("Invalid JSON response from gateway");
          }
        } catch (err: any) {
          console.log(`Failed with ${gateway}: ${err.message}`);
          // Continue to next gateway
        }
      }
      
      if (!fetchSuccess) {
        throw new Error('Failed to retrieve content from any gateway');
      }
    } catch (error: any) {
      console.error("Error fetching character data:", error);
      setCharacterError(error.message || "Failed to load character data");
    } finally {
      setCharacterLoading(false);
    }
  }

  // Function to close the modal
  const closeModal = () => {
    setSelectedAgent(null);
    setCharacterData(null);
    setCharacterError(null);
  }

  async function getAgentsByCreator(creatorAddress: string, showDebug = false): Promise<{
    agents: Agent[],
    debug?: {
      functionSelector: string;
      allSelectors: {selector: string, from: string}[];
    }
  }> {
    try {
      console.log(`🔍 Searching for agents created by: ${creatorAddress}`);
      const noditAPIKey = process.env.NEXT_PUBLIC_NODIT_API_KEY
      const axiosInstance = axios.create({
        baseURL: "https://web3.nodit.io/v1/base/sepolia",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-KEY": noditAPIKey,
        },
      })

      // Create interface using ethers
      const contractInterface = new ethers.Interface(CONTRACT_ABI)
      const createAgentFunction = contractInterface.getFunction("createAgent")
      if (!createAgentFunction) {
        throw new Error("Could not find createAgent function in ABI")
      }
      const createAgentSelector = createAgentFunction.selector

      const txResult = await axiosInstance.post(
        "/blockchain/getTransactionsByAccount",
        {
          accountAddress: CONTRACT_ADDRESS,
          withDecode: true,
        }
      )

      if (!txResult.data?.items?.length) {
        console.log("\nℹ️ No transactions found for this contract")
        return { agents: [] }
      }

      const agentCreationTxs = txResult.data.items.filter((tx: Transaction) => {
        return tx.functionSelector?.toLowerCase() === createAgentSelector.toLowerCase() && 
               tx.from?.toLowerCase() === creatorAddress.toLowerCase()
      })

      if (agentCreationTxs.length > 0) {
        console.log(`✅ Found ${agentCreationTxs.length} agent(s) created by this address:\n`)
        
        const parsedAgents = agentCreationTxs.map((tx: Transaction, index: number) => {
          console.log(`🤖 Agent #${index + 1}`)
          console.log(`- TX Hash: ${tx.transactionHash}`)
          console.log(`- Block: ${tx.blockNumber}`)
          console.log(`- Date: ${new Date(tx.timestamp * 1000).toLocaleString()}`)
          
          try {
            const decodedData = contractInterface.parseTransaction({ data: tx.input })
            if (!decodedData || !decodedData.args) {
              throw new Error("Failed to decode transaction data")
            }
            
            console.log("\nCreation Parameters:")
            console.log(`  Prefix: ${decodedData.args.prefix}`)
            console.log(`  Config: ${decodedData.args.config}`)
            console.log(`  Secrets: ${decodedData.args.secrets}`)
            console.log(`  Secrets Hash: ${decodedData.args.secretsHash}`)
            console.log(`  Device Address: ${decodedData.args.deviceAddress}`)
            console.log(`  Per API Call Fee: ${decodedData.args.perApiCallFee.toString()}`)
            console.log(`  Is Public: ${decodedData.args.isPublic}`)
            console.log("----------------------------------------")
            
            return {
              id: index + 1,
              txHash: tx.transactionHash,
              blockNumber: tx.blockNumber,
              timestamp: tx.timestamp,
              prefix: decodedData.args.prefix,
              config: decodedData.args.config,
              secrets: decodedData.args.secrets,
              secretsHash: decodedData.args.secretsHash,
              deviceAddress: decodedData.args.deviceAddress,
              perApiCallFee: decodedData.args.perApiCallFee.toString(),
              isPublic: decodedData.args.isPublic,
              agentAddress: tx.to,
              owner: tx.from
            }
          } catch (error) {
            console.log("⚠️ Could not decode agent details")
            return {
              id: index + 1,
              txHash: tx.transactionHash,
              blockNumber: tx.blockNumber,
              timestamp: tx.timestamp,
              prefix: "Unknown",
              deviceAddress: "Unknown",
              perApiCallFee: "0",
              isPublic: false,
              agentAddress: tx.to,
              owner: tx.from,
              error: true
            }
          }
        })
        
        return { agents: parsedAgents }
      } else {
        console.log("\n❌ No agents found for this wallet address")
        
        if (showDebug) {
          console.log("\nDebug Info:")
          console.log(`Looking for function selector: ${createAgentSelector}`)
          console.log(`All function selectors found:`)
          
          const allSelectors = txResult.data.items.map((tx: Transaction) => {
            console.log(`- ${tx.functionSelector} (from: ${tx.from})`)
            return { 
              selector: tx.functionSelector || 'unknown', 
              from: tx.from 
            }
          })
          
          return { 
            agents: [],
            debug: {
              functionSelector: createAgentSelector,
              allSelectors
            }
          }
        }
        
        return { agents: [] }
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
            My Agents
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
            My Agents
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href="/dashboard" className="flex items-center text-[#00FF88]/80 hover:text-[#00FF88] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Dashboard
            </Link>
          </motion.div>
        </div>

        {!address && (
          <div className="text-center py-20 text-white/70">
            <p className="text-xl">Please connect your wallet to view your agents</p>
          </div>
        )}

        {address && loading && (
          <div className="text-center py-20 text-white/70">
            <p className="text-xl">Loading your agents...</p>
          </div>
        )}

        {address && !loading && error && (
          <div className="text-center py-20 text-red-400">
            <p className="text-xl">Error loading agents</p>
            <p className="text-sm mt-2">{error}</p>
            <button 
              onClick={() => fetchAgents(address)}
              className="mt-4 px-4 py-2 bg-[#00FF88]/20 text-[#00FF88] rounded-lg hover:bg-[#00FF88]/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {address && !loading && !error && (
          <div className="max-w-3xl mx-auto">
            {/* Agents List */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-black/30 backdrop-blur-sm border border-[#00FF88]/20 rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Your Registered Agents</h2>
                <p className="text-white/70">Here are all the agents you've registered on the network. Click on an agent to view its character details.</p>
              </div>
              
              {agents.length === 0 ? (
                <div className="bg-black/30 backdrop-blur-sm border border-[#00FF88]/20 rounded-lg p-8 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-[#00FF88]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className={emptyStateStyle}>No agents registered yet</p>
                  <p className="text-white/50 text-sm mt-2 mb-6">Create a new agent to get started.</p>
                  
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
                agents.map((agent) => (
                  <motion.div 
                    key={agent.txHash}
                    className={cardStyle}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <div className="flex flex-col">
                      <span className={labelStyle}>Agent Prefix</span>
                      <span className={valueStyle}>{agent.prefix || "Unknown"}</span>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <span className={labelStyle}>Device Address</span>
                          <p className="text-white/80 text-sm font-mono">{`${agent.deviceAddress.slice(0, 6)}...${agent.deviceAddress.slice(-4)}`}</p>
                        </div>
                        <div>
                          <span className={labelStyle}>Agent Address</span>
                          <p className="text-white/80 text-sm font-mono">{`${agent.agentAddress.slice(0, 6)}...${agent.agentAddress.slice(-4)}`}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <span className={labelStyle}>API Call Fee</span>
                          <p className="text-white/80 text-sm">{agent.perApiCallFee} $FRANKY</p>
                        </div>
                        <div>
                          <span className={labelStyle}>Visibility</span>
                          <p className="text-white/80 text-sm">{agent.isPublic ? "Public" : "Private"}</p>
                        </div>
                      </div>
                      
                      {agent.secretsHash && (
                        <div className="mt-3">
                          <span className={labelStyle}>Secrets Hash</span>
                          <p className="text-white/80 text-sm font-mono text-xs overflow-hidden text-ellipsis">
                            {agent.secretsHash.substring(0, 16)}...
                          </p>
                        </div>
                      )}
                      
                      <div className="flex justify-between mt-3">
                        <span className="text-xs text-white/40">
                          Created: {new Date(agent.timestamp * 1000).toLocaleString()}
                        </span>
                      </div>
                      
                      {agent.config && (
                        <div className="mt-3 flex justify-end">
                          <span className="text-xs text-[#00FF88]/60 flex items-center">
                            <svg 
                              className="w-4 h-4 mr-1" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              strokeWidth={1.5} 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Character
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>
        )}
        
        {/* Character Details Modal */}
        <AnimatePresence>
          {selectedAgent && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            >
              <motion.div
                className="bg-black/90 backdrop-blur-md border border-[#00FF88]/30 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
                    {selectedAgent.prefix || "Agent"} Character
                  </h2>
                  <button 
                    onClick={closeModal}
                    className="text-white/60 hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {characterLoading && (
                  <div className="py-20 text-center">
                    <div className="w-12 h-12 border-4 border-[#00FF88]/20 border-t-[#00FF88] rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/70">Loading character data...</p>
                  </div>
                )}
                
                {!characterLoading && characterError && (
                  <div className="py-10 text-center">
                    <svg className="w-12 h-12 mx-auto mb-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-red-400 font-medium mb-2">Error loading character data</p>
                    <p className="text-white/60 text-sm">{characterError}</p>
                    
                    {selectedAgent.config && (
                      <div className="mt-6 border-t border-white/10 pt-4">
                        <p className="text-white/70 text-sm mb-2">Config URL:</p>
                        <p className="text-white/90 text-sm font-mono break-all">{selectedAgent.config}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {!characterLoading && !characterError && characterData && (
                  <div className="space-y-6">
                    {/* Character Name */}
                    {characterData.name && (
                      <div>
                        <h3 className="text-[#00FF88] text-sm mb-1">Name</h3>
                        <p className="text-white text-xl font-medium">{characterData.name}</p>
                      </div>
                    )}
                    
                    {/* Character Personality */}
                    {characterData.personality && (
                      <div>
                        <h3 className="text-[#00FF88] text-sm mb-1">Personality</h3>
                        <p className="text-white/90">{characterData.personality}</p>
                      </div>
                    )}
                    
                    {/* Character Backstory */}
                    {characterData.backstory && (
                      <div>
                        <h3 className="text-[#00FF88] text-sm mb-1">Backstory</h3>
                        <p className="text-white/90">{characterData.backstory}</p>
                      </div>
                    )}
                    
                    {/* Character Appearance */}
                    {characterData.appearance && (
                      <div>
                        <h3 className="text-[#00FF88] text-sm mb-1">Appearance</h3>
                        <p className="text-white/90">{characterData.appearance}</p>
                      </div>
                    )}
                    
                    {/* Other Fields */}
                    {Object.entries(characterData)
                      .filter(([key]) => !['name', 'personality', 'backstory', 'appearance'].includes(key))
                      .map(([key, value]) => (
                        <div key={key}>
                          <h3 className="text-[#00FF88] text-sm mb-1 capitalize">{key.replace(/_/g, ' ')}</h3>
                          <p className="text-white/90">
                            {typeof value === 'object' 
                              ? JSON.stringify(value, null, 2)
                              : String(value)
                            }
                          </p>
                        </div>
                      ))
                    }
                    
                    {/* Raw JSON View */}
                    <div className="mt-8 pt-4 border-t border-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-[#00FF88] font-mono text-sm">Raw JSON Data</h3>
                        {selectedAgent.config && (
                          <p className="text-xs text-white/50">
                            IPFS Hash: {extractIPFSHash(selectedAgent.config)}
                          </p>
                        )}
                      </div>
                      <pre className="text-white/70 text-xs font-mono bg-black/50 p-4 rounded-lg overflow-x-auto">
                        {JSON.stringify(characterData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 