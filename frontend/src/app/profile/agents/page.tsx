'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { formatEther } from 'viem'
import { useWalletInterface } from '@/hooks/use-wallet-interface'

// Define interface types for our data
interface Agent {
  id: number
  txHash: string
  blockNumber: number
  timestamp: number
  prefix: string
  agentAddress: string
  deviceAddress: string
  perApiCallFee: string
  isPublic: boolean
  owner: string
  avatar?: string
  name?: string
  description?: string
  characterConfig: {
    name: string
    description: string
    personality: string
    scenario: string
    first_mes: string
    mes_example: string
    creatorcomment: string
    tags: string[]
    talkativeness: string
  }
}

// Shared styles
const cardStyle = "bg-black/30 backdrop-blur-sm border border-[#00FF88]/20 rounded-lg p-4 mb-4 hover:border-[#00FF88]/40 transition-all cursor-pointer"
const labelStyle = "text-[#00FF88] text-sm"
const valueStyle = "text-white text-lg font-medium"
const emptyStateStyle = "text-white/60 italic text-center mt-12"

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const { accountId } = useWalletInterface()
  // Fix hydration issues by waiting for component to mount
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && accountId) {
      setLoading(true)
      fetchAgents()
    }
  }, [accountId, mounted])

  const fetchAgents = async () => {
    if (!accountId) return

    setLoading(true)
    setError(null)

    try {
      // Changed to fetch from Supabase endpoint
      const agentsRequest = await fetch("/api/db/agents?address=" + accountId.toLowerCase())
      if (!agentsRequest.ok) {
        setLoading(false)
        setError("Failed to fetch agents")
        return
      }
      const agentsResponse = await agentsRequest.json()
      console.log('Agents from Supabase:', agentsResponse)
      
      const formattedAgents = await Promise.all(agentsResponse.map(async (agent: any) => {
        if (!agent) return;
        
        // Fetch character config from metadata_url
        const characterRequest = await fetch(`/api/akave/fetch-json?url=${encodeURIComponent(agent.metadata_url)}`)
        const character = await characterRequest.json()
        
        // Transform to match existing format
        return {
          id: agent.id,
          prefix: agent.subname,
          agentAddress: agent.id,
          deviceAddress: agent.device_address,
          owner: agent.owner_address,
          perApiCallFee: formatEther(agent.per_api_call_fee),
          characterConfig: character,
          isPublic: agent.is_public,
          timestamp: new Date(agent.created_at).getTime() / 1000,
          name: agent.name || '',
          avatar: character.avatarUrl // Avatar URL is stored in character config
        }
      }))
      
      console.log('Formatted agents:', formattedAgents.filter((agent: any) => agent !== null))
      setAgents(formattedAgents.filter((agent: any) => agent !== null))
    } catch (error: any) {
      console.error("Error fetching agents:", error)
      setError(error?.message || "Failed to load agents data")
    } finally {
      setLoading(false)
    }
  }

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
            <Link href="/profile" className="flex items-center text-[#00FF88]/80 hover:text-[#00FF88] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </Link>
          </motion.div>
        </div>

        {!accountId && (
          <div className="text-center py-20 text-white/70">
            <p className="text-xl">Please connect your wallet to view your agents</p>
          </div>
        )}

        {accountId && loading && (
          <div className="text-center py-20 text-white/70">
            <div className="w-12 h-12 border-4 border-[#00FF88]/20 border-t-[#00FF88] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl">Loading your agents...</p>
          </div>
        )}

        {accountId && !loading && error && (
          <div className="text-center py-20 text-red-400">
            <p className="text-xl">Error loading agents</p>
            <p className="text-sm mt-2">{error}</p>
            <button
              onClick={fetchAgents}
              className="mt-4 px-4 py-2 bg-[#00FF88]/20 text-[#00FF88] rounded-lg hover:bg-[#00FF88]/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {accountId && !loading && !error && (
          <div className="max-w-3xl mx-auto">
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-black/30 backdrop-blur-sm border border-[#00FF88]/20 rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Your Registered Agents</h2>
                <p className="text-white/70">Here are all the agents you've registered.</p>
              </div>

              {agents.length === 0 ? (
                <div className="bg-black/30 backdrop-blur-sm border border-[#00FF88]/20 rounded-lg p-8 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-[#00FF88]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className={emptyStateStyle}>No agents registered yet</p>
                  <p className="text-white/50 text-sm mt-2 mb-6">Create a new agent to get started.</p>
                </div>
              ) : (
                agents.map((agent, idx) => (
                  <motion.div
                    key={idx.toString()}
                    className={cardStyle}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <div className="flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          {agent.avatar ? (
                            <div className="h-12 w-12 rounded-full overflow-hidden mr-4">
                              <img
                                src={`/api/akave/fetch-image?url=${encodeURIComponent(agent.avatar)}`}
                                alt={agent.prefix}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = 'https://placehold.co/100x100/00FF88/1A1A1A?text=AI&font=Roboto';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex justify-center items-center h-12 w-12 rounded-full bg-[#00FF88]/20 text-[#00FF88] mr-4">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <span className={labelStyle}>Agent Name</span>
                            <span className={valueStyle + " block"}>{agent.prefix || "Unknown"}</span>
                            {agent.name && (
                              <span className="text-[#00FF88]/60 text-sm">{agent.name}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <a
                            href={`https://basescan.org/address/${agent.agentAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-lg bg-[#00FF88]/10 hover:bg-[#00FF88]/20 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <img src="/etherscan.svg" alt="View on Etherscan" className="w-5 h-5" />
                          </a>
                        </div>
                      </div>

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
                          <span className={labelStyle}>Per API Call Fee</span>
                          <p className="text-white/80 text-sm">{agent.perApiCallFee} $HBAR</p>
                        </div>
                        <div>
                          <span className={labelStyle}>Visibility</span>
                          <p className="text-white/80 text-sm">{agent.isPublic ? "Public" : "Private"}</p>
                        </div>
                      </div>

                      {agent.description && (
                        <div className="mt-3">
                          <span className={labelStyle}>Description</span>
                          <p className="text-white/80 text-sm line-clamp-2">{agent.description}</p>
                        </div>
                      )}

                      <div className="flex justify-between mt-3">
                        <span className="text-xs text-white/40">
                          Created: {new Date(agent.timestamp * 1000).toLocaleString()}
                        </span>
                      </div>
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
              onClick={() => setSelectedAgent(null)}
            >
              <motion.div
                className="bg-black/90 backdrop-blur-md border border-[#00FF88]/30 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center">
                    {selectedAgent.avatar ? (
                      <div className="h-16 w-16 rounded-full overflow-hidden mr-4">
                        <img
                          src={selectedAgent.avatar}
                          alt={selectedAgent.prefix}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://placehold.co/100x100/00FF88/1A1A1A?text=AI&font=Roboto';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex justify-center items-center h-16 w-16 rounded-full bg-[#00FF88]/20 text-[#00FF88] mr-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
                        {selectedAgent.prefix || 'Unknown'}
                      </h2>
                      {selectedAgent.name && (
                        <p className="text-[#00FF88]/80">{selectedAgent.name}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedAgent(null)}
                    className="text-white/60 hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Character Description */}
                  {selectedAgent.description && (
                    <div>
                      <h3 className="text-[#00FF88] text-sm mb-1">Description</h3>
                      <p className="text-white/90">{selectedAgent.description}</p>
                    </div>
                  )}

                  {/* Character Personality */}
                  {selectedAgent.characterConfig?.personality && (
                    <div>
                      <h3 className="text-[#00FF88] text-sm mb-1">Personality</h3>
                      <p className="text-white/90">{selectedAgent.characterConfig.personality}</p>
                    </div>
                  )}

                  {/* Character Scenario */}
                  {selectedAgent.characterConfig?.scenario && (
                    <div>
                      <h3 className="text-[#00FF88] text-sm mb-1">Scenario</h3>
                      <p className="text-white/90">{selectedAgent.characterConfig.scenario}</p>
                    </div>
                  )}

                  {/* First Message */}
                  {selectedAgent.characterConfig?.first_mes && (
                    <div>
                      <h3 className="text-[#00FF88] text-sm mb-1">First Message</h3>
                      <p className="text-white/90">{selectedAgent.characterConfig.first_mes}</p>
                    </div>
                  )}

                  {/* Message Example */}
                  {selectedAgent.characterConfig?.mes_example && (
                    <div>
                      <h3 className="text-[#00FF88] text-sm mb-1">Message Example</h3>
                      <p className="text-white/90">{selectedAgent.characterConfig.mes_example}</p>
                    </div>
                  )}

                  {/* Creator Comment */}
                  {selectedAgent.characterConfig?.creatorcomment && (
                    <div>
                      <h3 className="text-[#00FF88] text-sm mb-1">Creator Comment</h3>
                      <p className="text-white/90">{selectedAgent.characterConfig.creatorcomment}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedAgent.characterConfig?.tags && (
                    <div>
                      <h3 className="text-[#00FF88] text-sm mb-1">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedAgent.characterConfig.tags.map((tag, index) => (
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
                  {selectedAgent.characterConfig?.talkativeness && (
                    <div>
                      <h3 className="text-[#00FF88] text-sm mb-1">Talkativeness</h3>
                      <p className="text-white/90">{selectedAgent.characterConfig.talkativeness}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 