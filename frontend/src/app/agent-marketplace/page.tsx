'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Header from '@/components/ui/Header'
import { FiCpu, FiHash, FiDollarSign, FiUser, FiUserCheck, FiX, FiCopy, FiCheck } from 'react-icons/fi'
import { getApiKey } from '@/utils/apiKey'
import { usePrivy, useSignMessage } from '@privy-io/react-auth'
import { formatEther, Hex } from 'viem'

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
  avatar?: string // Alias for character for better naming
  characterConfig?: {
    name: string
    personality: string
    scenario: string
    first_mes: string
    mes_example: string
    creatorcomment: string
    tags: string[]
    talkativeness: string
  }
}

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
const AgentCard = ({ keyVal, agent, onClick }: { keyVal: string, agent: Agent, onClick: () => void }) => {
  return (
    <motion.div
      key={keyVal}
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
              src={`/api/akave/fetch-image?url=${encodeURIComponent(agent.character)}`}
              alt={agent.prefix}
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
          {agent.characterConfig && (
            <p className="text-white/80 text-sm mt-1">
              {agent.characterConfig.name}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 flex-grow">
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
            href={`https://filecoin-testnet.blockscout.com/address/` + agent.agentAddress}
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
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { user } = usePrivy();
  const { signMessage } = useSignMessage()

  const handlePurchase = async () => {
    if (!agent || !user || !user.wallet) return;

    try {
      setIsPurchasing(true);

      try {
        console.log('Generating API key for agent:', agent.agentAddress);

        // Generate API key using the agent address and wallet address
        const key = await getApiKey(
          agent.agentAddress,
          user.wallet.address as Hex,
          signMessage
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
                    src={`/api/akave/fetch-image?url=${encodeURIComponent(agent.character)}`}
                    alt={agent.prefix}
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
                {agent.characterConfig?.name && (
                  <p className="text-[#00FF88]">{agent.characterConfig?.name}</p>
                )}
              </div>
            </div>


            {/* Character Configuration Details */}
            {agent.characterConfig && (
              <div className="mb-6 space-y-4">
                <h3 className="text-xl font-bold text-white border-b border-[#00FF88]/20 pb-2">Character Details</h3>

                {/* Personality */}
                {agent && (
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
                      {agent.characterConfig.tags.map((tag, index) => (
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
                    Generate an API key to interact with this agent. Your wallet must be connected to Filecoin Calibration Testnet.
                  </p>
                  <button
                    onClick={handlePurchase}
                    disabled={!user?.wallet || isPurchasing}
                    className={`py-2 px-6 rounded-lg text-center 
                      ${(!user?.wallet)
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

                  {!user?.wallet && (
                    <p className="text-sm text-yellow-400 mt-2">
                      Your wallet must be connected to generate an API key.
                    </p>
                  )}
                </div>
              )}

              {/* <div className="mt-8 text-center">
                <a
                  href={`https://filecoin-testnet.blockscout.com/tx/` + agent.txHash}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00FF88] hover:underline"
                >
                  View on Block Explorer
                </a>
              </div> */}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AgentMarketplacePage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  useEffect(() => {
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
      const formattedAgents = await Promise.all(agentsResponse.map(async (agent: any) => {
        const characterRequest = await fetch(`/api/akave/fetch-json?url=${encodeURIComponent(agent.characterConfig)}`)
        console.log(`/api/akave/fetch-json?url=${encodeURIComponent(agent.characterConfig)}`)
        const character = await characterRequest.json()
        return {
          id: agent.id,
          prefix: agent.subname,
          agentAddress: agent.id,
          deviceAddress: agent.deviceAddress.id,
          owner: agent.owner.id,
          perApiCallFee: formatEther(agent.perApiCallFee),
          character: agent.avatar,
          characterConfig: character,
          isPublic: agent.isPublic,
          timestamp: new Date(agent.createdAt * 1000).toLocaleDateString(),
          name: agent.subname || '',
          avatar: agent.avatar
        }
      }))
      console.log(formattedAgents)
      setAgents(formattedAgents)
      setLoading(false)
      setError(null)
    })()
  }, [])

  const handleAgentSelect = async (agent: Agent) => {
    setSelectedAgent(agent)
  }

  const closeModal = () => {
    setSelectedAgent(null)
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
              {agents.map((agent, idx) => (
                <AgentCard
                  keyVal={idx.toString()}
                  key={idx.toString()}
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
