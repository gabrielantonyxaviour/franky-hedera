'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Header from '@/components/ui/Header'
import { useRouter } from 'next/navigation'
import { FiCpu, FiServer, FiLink, FiHash, FiDollarSign, FiUser, FiUserCheck, FiX, FiCopy, FiCheck } from 'react-icons/fi'
import axios from 'axios'
import { ethers } from 'ethers'
import { getApiKey } from '@/utils/apiKey'
import { usePrivy } from '@privy-io/react-auth'
import { getPublicAgents } from '@/lib/graph'

// Updated contract information for Base Mainnet
const CONTRACT_ADDRESS = '0x486989cd189ED5DB6f519712eA794Cee42d75b29'

const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "subname", "type": "string" },
      { "internalType": "string", "name": "avatar", "type": "string" },
      {
        "components": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "description", "type": "string" },
          { "internalType": "string", "name": "personality", "type": "string" },
          { "internalType": "string", "name": "scenario", "type": "string" },
          { "internalType": "string", "name": "first_mes", "type": "string" },
          { "internalType": "string", "name": "mes_example", "type": "string" },
          { "internalType": "string", "name": "creatorcomment", "type": "string" },
          { "internalType": "string", "name": "tags", "type": "string" },
          { "internalType": "string", "name": "talkativeness", "type": "string" }
        ], "internalType": "struct Character", "name": "characterConfig", "type": "tuple"
      },
      { "internalType": "string", "name": "secrets", "type": "string" },
      { "internalType": "bytes32", "name": "secretsHash", "type": "bytes32" },
      { "internalType": "address", "name": "deviceAddress", "type": "address" },
      { "internalType": "uint256", "name": "perApiCallFee", "type": "uint256" },
      { "internalType": "bool", "name": "isPublic", "type": "bool" }
    ],
    "name": "createAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "agentAddress", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "deviceAddress", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "avatar", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "subname", "type": "string" },
      { "indexed": false, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "perApiCallFee", "type": "uint256" },
      { "indexed": false, "internalType": "bytes32", "name": "secretsHash", "type": "bytes32" },
      {
        "components": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "description", "type": "string" },
          { "internalType": "string", "name": "personality", "type": "string" },
          { "internalType": "string", "name": "scenario", "type": "string" },
          { "internalType": "string", "name": "first_mes", "type": "string" },
          { "internalType": "string", "name": "mes_example", "type": "string" },
          { "internalType": "string", "name": "creatorcomment", "type": "string" },
          { "internalType": "string", "name": "tags", "type": "string" },
          { "internalType": "string", "name": "talkativeness", "type": "string" }
        ], "indexed": false, "internalType": "struct Character", "name": "characterConfig", "type": "tuple"
      },
      { "indexed": false, "internalType": "string", "name": "secrets", "type": "string" },
      { "indexed": false, "internalType": "bool", "name": "isPublic", "type": "bool" }
    ],
    "name": "AgentCreated",
    "type": "event"
  }
] as const

// Define agent interface
interface Agent {
  id: number
  prefix: string
  agentAddress: string
  deviceAddress: string
  owner: string
  perApiCallFee: string
  character: string // Will be used as avatar URL
  isPublic: boolean
  txHash: string
  blockNumber: number
  timestamp: number
  name: string
  description: string
  avatar?: string // Alias for character for better naming
  characterConfig?: {
    name: string
    description: string
    personality: string
    scenario: string
    first_mes: string
    mes_example: string
    creatorcomment: string
    tags: string
    talkativeness: string
  }
}


const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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
        {agent.character ? (
          <div className="h-12 w-12 rounded-full overflow-hidden mr-4">
            <img
              src={agent.character}
              alt={agent.name || agent.prefix}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://placehold.co/100x100/00FF88/1A1A1A?text=AI&font=Roboto';
              }}
            />
          </div>
        ) : (
          <div className="flex justify-center items-center h-12 w-12 rounded-full bg-[#00FF88] bg-opacity-20 text-[#00FF88] mr-4">
            <FiUserCheck className="text-2xl" />
          </div>
        )}
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
          <span>Fee per API Call: <span className="text-[#00FF88] font-medium">{agent.perApiCallFee} $FIL</span></span>
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
            href={`https://filecoin-testnet.blockscout.com/tx/` + agent.txHash}
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
  isOpen,
  onClose
}: {
  agent: Agent | null
  isOpen: boolean
  onClose: () => void
}) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { user } = usePrivy();

  const handlePurchase = async () => {
    if (!agent || !user || !user.smartWallet) return;

    try {
      setIsPurchasing(true);

      try {
        console.log('Generating API key for agent:', agent.agentAddress);

        // Generate API key using the agent address and wallet address
        const key = await getApiKey(
          agent.agentAddress,
          { address: user.smartWallet.address }, false
          // isMainnet,
          // Pass the signMessage function as a separate parameter
          // async (message: string): Promise<`0x${string}`> => {
          //   return await signMessageAsync({ message });
          // }
        );

        setApiKey(key);
        setKeyError(null);
      } catch (error: any) {
        console.error('Error generating API key:', error);
        setKeyError(error.message || 'Error generating API key');
      }
    } catch (error: any) {
      console.error('Error generating API key:', error);
      setKeyError(error.message || 'Failed to generate API key');
    } finally {
      setIsPurchasing(false);
    }
  };

  const copyApiKey = async () => {
    if (!apiKey) return;

    try {
      await navigator.clipboard.writeText(apiKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && agent && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal content */}
          <motion.div
            className="bg-black/90 border border-[#00FF88]/30 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <FiX className="text-xl" />
            </button>

            {/* Agent details */}
            <div className="mb-6 flex items-center">
              {agent.character ? (
                <div className="h-16 w-16 rounded-full overflow-hidden mr-4">
                  <img
                    src={agent.character}
                    alt={agent.name || agent.prefix}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://placehold.co/100x100/00FF88/1A1A1A?text=AI&font=Roboto';
                    }}
                  />
                </div>
              ) : (
                <div className="flex justify-center items-center h-16 w-16 rounded-full bg-[#00FF88] bg-opacity-20 text-[#00FF88] mr-4">
                  <FiUserCheck className="text-3xl" />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-white">{agent.prefix}</h2>
                {agent.name && (
                  <p className="text-[#00FF88]">{agent.name}</p>
                )}
              </div>
            </div>

            {/* Description */}
            {agent.description && (
              <div className="mb-6 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-lg p-4">
                <p className="text-gray-200">{agent.description}</p>
              </div>
            )}

            {/* Character Configuration Details */}
            {agent.characterConfig && (
              <div className="mb-6 space-y-4">
                <h3 className="text-xl font-bold text-white border-b border-[#00FF88]/20 pb-2">Character Details</h3>

                {/* Personality */}
                {agent.characterConfig.personality && (
                  <div>
                    <h4 className="text-[#00FF88] text-sm mb-1">Personality</h4>
                    <p className="text-gray-200">{agent.characterConfig.personality}</p>
                  </div>
                )}

                {/* Scenario */}
                {agent.characterConfig.scenario && (
                  <div>
                    <h4 className="text-[#00FF88] text-sm mb-1">Scenario</h4>
                    <p className="text-gray-200">{agent.characterConfig.scenario}</p>
                  </div>
                )}

                {/* First Message */}
                {agent.characterConfig.first_mes && (
                  <div>
                    <h4 className="text-[#00FF88] text-sm mb-1">First Message</h4>
                    <p className="text-gray-200">{agent.characterConfig.first_mes}</p>
                  </div>
                )}

                {/* Message Example */}
                {agent.characterConfig.mes_example && (
                  <div>
                    <h4 className="text-[#00FF88] text-sm mb-1">Message Example</h4>
                    <p className="text-gray-200">{agent.characterConfig.mes_example}</p>
                  </div>
                )}

                {/* Creator Comment */}
                {agent.characterConfig.creatorcomment && (
                  <div>
                    <h4 className="text-[#00FF88] text-sm mb-1">Creator Comment</h4>
                    <p className="text-gray-200">{agent.characterConfig.creatorcomment}</p>
                  </div>
                )}

                {/* Tags */}
                {agent.characterConfig.tags && (
                  <div>
                    <h4 className="text-[#00FF88] text-sm mb-1">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {agent.characterConfig.tags.split(',').map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-[#00FF88]/10 text-[#00FF88] rounded-md text-sm"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Talkativeness */}
                {agent.characterConfig.talkativeness && (
                  <div>
                    <h4 className="text-[#00FF88] text-sm mb-1">Talkativeness</h4>
                    <p className="text-gray-200">{agent.characterConfig.talkativeness}</p>
                  </div>
                )}
              </div>
            )}

            {/* Agent Details */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center text-[#CCCCCC]">
                <FiDollarSign className="mr-2 text-[#00FF88]" />
                <span>Fee per API Call: <span className="text-[#00FF88] font-medium">{agent.perApiCallFee} $FIL</span></span>
              </div>

              <div className="flex items-center text-[#CCCCCC]">
                <FiHash className="mr-2 text-[#00FF88]" />
                <span>Agent: <span className="text-[#00FF88] font-medium">{agent.agentAddress}</span></span>
              </div>

              <div className="flex items-center text-[#CCCCCC]">
                <FiCpu className="mr-2 text-[#00FF88]" />
                <span>Device: <span className="text-[#00FF88] font-medium">{agent.deviceAddress}</span></span>
              </div>

              <div className="flex items-center text-[#CCCCCC]">
                <FiUser className="mr-2 text-[#00FF88]" />
                <span>Owner: <span className="text-[#00FF88] font-medium">{agent.owner}</span></span>
              </div>
            </div>

            {/* API Key Section */}
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4 text-white">Generate API Key</h3>

              {apiKey ? (
                <div className="mb-6">
                  <div className="flex">
                    <input
                      type="text"
                      value={apiKey}
                      readOnly
                      className="py-2 px-4 rounded-l-lg bg-gray-900 text-white border border-[#00FF88]/50 flex-grow"
                    />
                    <button
                      onClick={copyApiKey}
                      className="py-2 px-4 rounded-r-lg bg-[#00FF88]/20 text-[#00FF88] hover:bg-[#00FF88]/30 flex items-center"
                    >
                      {isCopied ? <FiCheck className="text-lg" /> : <FiCopy className="text-lg" />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    This API key gives you access to interact with the agent.
                  </p>
                </div>
              ) : keyError ? (
                <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300">
                  <p>{keyError}</p>
                  <button
                    onClick={handlePurchase}
                    className="mt-3 py-2 px-4 rounded-lg bg-[#00FF88]/20 text-[#00FF88] hover:bg-[#00FF88]/30"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="mb-6">
                  <p className="mb-4 text-gray-300">
                    Generate an API key to interact with this agent. Your wallet must be connected to Base Mainnet.
                  </p>
                  <button
                    onClick={handlePurchase}
                    disabled={!user?.smartWallet || isPurchasing}
                    className={`py-2 px-6 rounded-lg text-center 
                      ${(!user?.smartWallet)
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-[#00FF88]/20 text-[#00FF88] hover:bg-[#00FF88]/30'
                      } transition-colors flex items-center justify-center`}
                  >
                    {isPurchasing ? (
                      <>
                        <span className="animate-spin w-5 h-5 border-t-2 border-r-2 border-[#00FF88] rounded-full mr-2"></span>
                        Generating...
                      </>
                    ) : (
                      'Generate API Key'
                    )}
                  </button>

                  {!user?.smartWallet && (
                    <p className="text-sm text-yellow-400 mt-2">
                      Your wallet must be connected to generate an API key.
                    </p>
                  )}

                  {user?.smartWallet && (
                    <p className="text-sm text-yellow-400 mt-2">
                      Please switch to Base Mainnet to generate an API key.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-8 text-center">
                <a
                  href={`https://filecoin-testnet.blockscout.com/tx/` + agent.txHash}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00FF88] hover:underline"
                >
                  View on Block Explorer
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AgentMarketplacePage() {
  const [isClient, setIsClient] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const router = useRouter()

  // Set isClient to true after component mounts
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Fetch agents using API
  useEffect(() => {
    if (!isClient) return
    (async function () {
      // const fetchedAgents = await getPublicAgents()
      const agentsRequest = await fetch("/api/graph/agents")
      if (!agentsRequest.ok) {
        setLoading(false)
        setError("Failed to fetch agents")
        return
      }
      const agentsResponse = await agentsRequest.json()
      console.log(agentsResponse)
      // console.log("Public Agents from Graph:", agents)
      // setAgents(fetchedAgents)
      setLoading(false)
      setError(null)
    })()
  }, [isClient])

  const handleAgentSelect = async (agent: Agent) => {
    setSelectedAgent(agent)
  }

  const closeModal = () => {
    setSelectedAgent(null)
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
                Pay per API call in $FIL tokens to interact with these agents.
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
            isOpen={!!selectedAgent}
            onClose={closeModal}
          />
        )}
      </AnimatePresence>
    </>
  )
}
