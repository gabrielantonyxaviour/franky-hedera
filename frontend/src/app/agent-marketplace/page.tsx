'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Header from '@/components/ui/Header'
import { useRouter } from 'next/navigation'
import { FiCpu, FiServer, FiLink, FiHash, FiDollarSign, FiUser, FiUserCheck, FiX, FiCopy, FiCheck } from 'react-icons/fi'
import { useChainId, useAccount, useSignMessage } from 'wagmi'
import { baseSepolia } from '@/components/baseChains'
import axios from 'axios'
import { ethers } from 'ethers'
import { getApiKey } from '@/utils/apiKey'

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

// Helper function to get explorer URL
const getExplorerUrl = (chainId: number, hash: string) => {
  if (chainId === baseSepolia.id) {
    return `https://sepolia.basescan.org/tx/${hash}`
  }
  if (chainId === 11155111) {
    return `https://sepolia.etherscan.io/tx/${hash}`
  }
  return `https://etherscan.io/tx/${hash}`
}

// Define agent interface
interface Agent {
  id: number
  prefix: string
  agentAddress: string
  deviceAddress: string
  owner: string
  perApiCallFee: string
  character: string
  isPublic: boolean
  txHash: string
  blockNumber: number
  timestamp: number
  name?: string
  description?: string
}

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function for exponential backoff retry
const retryWithBackoff = async (
  fn: () => Promise<any>,
  retries = 3,
  initialDelay = 1000,
  maxDelay = 10000
) => {
  let currentDelay = initialDelay
  
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      if (i === retries || (error.response?.status !== 429 && error.status !== 429)) {
        throw error
      }
      
      const retryAfter = error.response?.headers?.['retry-after']
      const delayTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(currentDelay, maxDelay)
      
      await delay(delayTime)
      
      currentDelay *= 2
    }
  }
}

// Helper function to extract IPFS hash from config URL
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
  const hash = extractIPFSHash(configUrl);
  if (!hash) {
    console.error("Could not extract IPFS hash from config URL");
    return null;
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
          return data;
        } catch (jsonError) {
          console.error("Error parsing JSON:", jsonError);
          throw new Error("Invalid JSON response from gateway");
        }
      } catch (err: any) {
        console.log(`Failed with ${gateway}: ${err.message}`);
        // Continue to next gateway
      }
    }
    
    throw new Error('Failed to retrieve content from any gateway');
  } catch (error: any) {
    console.error("Error fetching character data:", error);
    return null;
  }
}

// Background component (reused from device marketplace)
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

// Agent card component
const AgentCard = ({ agent, onClick }: { agent: Agent, onClick: () => void }) => {
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
          <FiUserCheck className="text-2xl" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
            {agent.prefix}
          </h3>
          {agent.name && (
            <p className="text-white/80 text-sm mt-1">
              {agent.name}
            </p>
          )}
        </div>
      </div>
      
      <div className="space-y-4 flex-grow">
        {agent.description && (
          <div className="text-[#CCCCCC] border-l-2 border-[#00FF88]/30 pl-3">
            <p className="text-sm italic">{agent.description}</p>
          </div>
        )}
        
        <div className="flex items-center text-[#CCCCCC]">
          <FiDollarSign className="mr-2 text-[#00FF88]" />
          <span>Fee per API Call: <span className="text-[#00FF88] font-medium">{agent.perApiCallFee} $FRANKY</span></span>
        </div>
        
        <div className="flex items-center text-[#CCCCCC]">
          <FiHash className="mr-2 text-[#00FF88]" />
          <span>Agent: <span className="text-[#00FF88] font-medium">{`${agent.agentAddress.slice(0, 6)}...${agent.agentAddress.slice(-4)}`}</span></span>
        </div>
        
        <div className="flex items-center text-[#CCCCCC]">
          <FiCpu className="mr-2 text-[#00FF88]" />
          <span>Device: <span className="text-[#00FF88] font-medium">{`${agent.deviceAddress.slice(0, 6)}...${agent.deviceAddress.slice(-4)}`}</span></span>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-[#00FF88] border-opacity-20">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Owner</span>
          <span className="text-xs text-[#00FF88]">
            {`${agent.owner.slice(0, 6)}...${agent.owner.slice(-4)}`}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">Registration Tx</span>
          <a 
            href={`https://sepolia.basescan.org/tx/${agent.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#00FF88] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            View
          </a>
        </div>
      </div>
      
      <motion.button
        onClick={onClick}
        className="mt-4 w-full py-2 rounded-lg bg-[#00FF88] bg-opacity-10 text-[#00FF88] hover:bg-opacity-20 transition-colors"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        Use Agent
      </motion.button>
    </motion.div>
  )
}

// Preview Modal Component
const PreviewModal = ({ 
  agent, 
  characterData, 
  isOpen, 
  onClose 
}: { 
  agent: Agent | null
  characterData: any
  isOpen: boolean
  onClose: () => void
}) => {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const handlePurchase = async () => {
    if (!agent || !address) return

    setLoading(true)
    setError(null)
    try {
      // Create a signer function that matches the create agent page implementation
      const signer = async (message: string): Promise<`0x${string}`> => {
        try {
          console.log('Raw message to sign:', message)
          
          // Handle the message format
          let messageToSign: string
          if (typeof message === 'string') {
            messageToSign = message.startsWith('0x') ? message : `0x${Buffer.from(message).toString('hex')}`
          } else {
            // If message is not a string, convert it to string first
            messageToSign = `0x${Buffer.from(String(message)).toString('hex')}`
          }
          
          console.log('Formatted message for signing:', messageToSign)
          
          const signature = await signMessageAsync({
            message: messageToSign as `0x${string}`
          })
          
          console.log('Signature received:', signature)
          return signature
        } catch (err: any) {
          console.error('Error in signing process:', err)
          if (err.code === 4001) {
            throw new Error('User rejected signing')
          }
          throw new Error(`Error signing message: ${err.message || 'Unknown error'}`)
        }
      }

      console.log('Generating API key for agent:', agent.agentAddress)
      const key = await getApiKey(
        agent.agentAddress,
        { signMessage: signer },
        false // isMainnet
      )
      console.log('API key generated successfully')
      setApiKey(key)
    } catch (err: any) {
      console.error('Error in handlePurchase:', err)
      setError(err.message || 'Failed to generate API key')
    } finally {
      setLoading(false)
    }
  }

  const copyApiKey = async () => {
    if (!apiKey) return
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy API key:', err)
    }
  }

  if (!isOpen || !agent) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-black/90 border border-[#00FF88]/30 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white"
        >
          <FiX size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
          {agent.prefix}
        </h2>

        {/* Character Data */}
        <div className="mb-6 space-y-4">
          {characterData && Object.entries(characterData).map(([key, value]) => (
            <div key={key} className="border-l-2 border-[#00FF88]/30 pl-3">
              <h3 className="text-[#00FF88] text-sm uppercase mb-1">{key}</h3>
              <p className="text-white/80 text-sm whitespace-pre-wrap">{String(value)}</p>
            </div>
          ))}
        </div>

        {/* API Key Section */}
        <div className="border-t border-[#00FF88]/20 pt-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/80">Price per API Call:</span>
            <span className="text-[#00FF88] font-bold">{agent.perApiCallFee} $FRANKY</span>
          </div>

          {apiKey ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/80">Your API Key:</span>
                <button
                  onClick={copyApiKey}
                  className="text-[#00FF88] hover:text-[#00FF88]/80 flex items-center"
                >
                  {copied ? <FiCheck className="mr-1" /> : <FiCopy className="mr-1" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="bg-black/50 p-2 rounded border border-[#00FF88]/20 break-all font-mono text-sm text-white/90">
                {apiKey}
              </div>
            </div>
          ) : (
            <motion.button
              onClick={handlePurchase}
              className="w-full py-3 rounded-lg bg-[#00FF88] text-black font-bold hover:bg-[#00FF88]/90 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading || !address}
            >
              {loading ? 'Generating API Key...' : !address ? 'Connect Wallet' : 'View API Key'}
            </motion.button>
          )}

          {error && (
            <p className="mt-2 text-red-400 text-sm">{error}</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function AgentMarketplacePage() {
  const [isClient, setIsClient] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [characterData, setCharacterData] = useState<any>(null)
  const router = useRouter()
  const chainId = useChainId()
  
  // Set isClient to true after component mounts
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Fetch agents using Nodit API
  useEffect(() => {
    if (!isClient) return
    
    const fetchAgents = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch('/api/agents')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        if (data.error) {
          throw new Error(data.error)
        }

        // Log raw response for debugging
        console.log('Agent Marketplace Response:', data)
        
        const agentsArray = await Promise.all(data.agents.map(async (agent: any, index: number) => {
          const agentData: Agent = {
            id: index + 1,
            prefix: agent.prefix,
            agentAddress: agent.agentAddress,
            deviceAddress: agent.deviceAddress,
            owner: agent.owner,
            perApiCallFee: agent.perApiCallFee,
            character: agent.character,
            isPublic: agent.isPublic,
            txHash: agent.txHash,
            blockNumber: agent.blockNumber,
            timestamp: agent.timestamp
          }
          
          // Fetch character data from IPFS
          try {
            const characterData = await fetchCharacterData(agent.character)
            if (characterData) {
              agentData.name = characterData.name
              agentData.description = characterData.description
              console.log(`Character data fetched for agent ${agent.agentAddress}:`, characterData)
            }
          } catch (error) {
            console.error(`Error fetching character data for agent ${agent.agentAddress}:`, error)
          }
          
          return agentData
        }))
        
        // Sort agents by timestamp (newest first)
        agentsArray.sort((a: Agent, b: Agent) => b.timestamp - a.timestamp)
        
        // Log final processed agents
        console.log('Final processed agents:', agentsArray)
        
        setAgents(agentsArray)
      } catch (error: any) {
        console.error("Error fetching agents:", error)
        setError(error.message || "Failed to load agents")
      } finally {
        setLoading(false)
      }
    }
    
    fetchAgents()
  }, [isClient])
  
  // Handle agent selection
  const handleAgentSelect = async (agent: Agent) => {
    setSelectedAgent(agent)
    try {
      const data = await fetchCharacterData(agent.character)
      setCharacterData(data)
    } catch (error) {
      console.error('Error fetching character data:', error)
    }
  }

  const closeModal = () => {
    setSelectedAgent(null)
    setCharacterData(null)
  }
  
  if (!isClient) {
    return null
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
                Agent Marketplace
              </h1>
              <p className="text-xl mb-6 text-[#AAAAAA] max-w-4xl mx-auto">
                Browse and use public AI agents deployed on the network.
                Each agent has unique capabilities and can be used for a small fee.
              </p>
              <p className="text-lg mb-12 text-emerald-400 max-w-4xl mx-auto">
                Pay per API call in $FRANKY tokens to interact with these agents.
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
                <p className="text-[#AAAAAA]">Loading agents from blockchain...</p>
              </div>
            ) : error ? (
              <div className="text-center py-20 px-4">
                <div className="p-6 rounded-xl border border-red-500 border-opacity-30 bg-black/50 backdrop-blur-sm max-w-2xl mx-auto">
                  <p className="text-xl text-red-400 mb-4">Error loading agents</p>
                  <p className="text-[#AAAAAA]">{error}</p>
                </div>
              </div>
            ) : agents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {agents.map(agent => (
                  <AgentCard 
                    key={agent.txHash}
                    agent={agent}
                    onClick={() => handleAgentSelect(agent)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-xl text-[#AAAAAA] mb-3">No public agents available.</p>
                <Link href="/create-agent">
                  <motion.button
                    className="px-6 py-2 rounded-lg bg-[#00FF88]/20 border border-[#00FF88]/50 text-[#00FF88] hover:bg-[#00FF88]/30 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Create the first public agent!
                  </motion.button>
                </Link>
              </div>
            )}
          </div>
        </section>
        
      </main>
      
      <AnimatePresence>
        {selectedAgent && (
          <PreviewModal
            agent={selectedAgent}
            characterData={characterData}
            isOpen={!!selectedAgent}
            onClose={closeModal}
          />
        )}
      </AnimatePresence>
    </>
  )
}
