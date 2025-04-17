'use client'

import Header from '@/components/ui/Header'
import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import ToolboxPanel from '@/components/dnd/ToolboxPanel'
import ConstructionZone from '@/components/dnd/ConstructionZone'
import PromptForge from '@/components/dnd/PromptForge'
import { useWalletStore } from '@/store/useWalletStore'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiCpu, FiServer, FiSmartphone, FiLink } from 'react-icons/fi'

// Define tool types
export interface Tool {
  id: string
  name: string
  description: string
  icon: string
}

// Define device type
interface DeviceInfo {
  deviceId: string
  deviceModel: string
  deviceStatus: string
  deviceAddress: string
  ngrokLink: string
}

// Available tools
const availableTools: Tool[] = [
  {
    id: 'swap',
    name: '1inch Swap',
    description: 'Swap tokens at the best rates across multiple DEXes',
    icon: '💱'
  },
  {
    id: 'limit',
    name: '1inch Limit Order',
    description: 'Create limit orders with conditional execution',
    icon: '📊'
  },
  {
    id: 'balance',
    name: 'Balance Checker',
    description: 'Check token balances across multiple chains',
    icon: '💰'
  },
  {
    id: 'gas',
    name: 'Gas Estimator',
    description: 'Estimate gas costs for transactions',
    icon: '⛽'
  },
  {
    id: 'price',
    name: 'Price Oracle',
    description: 'Get real-time token prices from multiple sources',
    icon: '🔮'
  },
  {
    id: 'nft',
    name: 'NFT Explorer',
    description: 'Browse and analyze NFT collections',
    icon: '🖼️'
  }
]

// Client component that uses useSearchParams
function CreateAgentContent() {
  const [selectedTools, setSelectedTools] = useState<Tool[]>([])
  const [systemPrompt, setSystemPrompt] = useState('')
  const [agentName, setAgentName] = useState('')
  const { isConnected, address } = useWalletStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Extract device information from query parameters
  const deviceInfo: DeviceInfo | null = searchParams.get('deviceId') 
    ? {
        deviceId: searchParams.get('deviceId') || '',
        deviceModel: searchParams.get('deviceModel') || '',
        deviceStatus: searchParams.get('deviceStatus') || '',
        deviceAddress: searchParams.get('deviceAddress') || '',
        ngrokLink: searchParams.get('ngrokLink') || ''
      } 
    : null
  
  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    })
  )
  
  // Handle drag end event
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    
    if (over && over.id === 'construction-zone') {
      // Find the tool that was dragged
      const draggedTool = availableTools.find(tool => tool.id === active.id)
      
      if (draggedTool && !selectedTools.some(tool => tool.id === draggedTool.id)) {
        setSelectedTools([...selectedTools, draggedTool])
      }
    }
  }
  
  // Handle tool removal
  function handleRemoveTool(toolId: string) {
    setSelectedTools(selectedTools.filter(tool => tool.id !== toolId))
  }
  
  // Handle agent creation
  function handleCreateAgent() {
    if (!agentName.trim()) {
      alert('Please give your agent a name')
      return
    }
    
    if (selectedTools.length === 0) {
      alert('Please select at least one tool')
      return
    }
    
    // In a real app, this would send data to an API
    console.log('Creating agent:', {
      name: agentName,
      tools: selectedTools,
      systemPrompt,
      creator: address
    })
    
    // Generate a random agent ID (in a real app, this would come from the API)
    const newAgentId = Math.random().toString(36).substring(2, 10)
    
    // Redirect to chat page
    router.push(`/chat/${newAgentId}`)
  }
  
  return (
    <>
      <Header />
      
      <div className="container mx-auto px-4 pt-32">
        <motion.h1 
          className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Build Your AI Agent
        </motion.h1>
        
        {deviceInfo && (
          <motion.div
            className="mb-8 p-4 rounded-xl border border-[#00FF88] border-opacity-30 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-xl font-semibold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent mb-4">
              Selected Device
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <FiSmartphone className="text-[#00FF88] mr-2" />
                <span className="text-gray-300">{deviceInfo.deviceModel}</span>
              </div>
              <div className="flex items-center">
                <FiServer className="text-[#00FF88] mr-2" />
                <span className="text-gray-300">Status: {deviceInfo.deviceStatus}</span>
              </div>
              <div className="flex items-center">
                <FiLink className="text-[#00FF88] mr-2" />
                <span className="text-gray-300 text-sm">{deviceInfo.ngrokLink}</span>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-gray-400">Device Address: </span>
                <span className="text-xs text-[#00FF88] ml-2">
                  {`${deviceInfo.deviceAddress.slice(0, 6)}...${deviceInfo.deviceAddress.slice(-4)}`}
                </span>
              </div>
            </div>
          </motion.div>
        )}
        
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: deviceInfo ? 0.4 : 0.2 }}
        >
          <label htmlFor="agent-name" className="block mb-2 text-gray-300">
            Agent Name
          </label>
          <input
            id="agent-name"
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="My DeFi Assistant"
            className="w-full p-3 rounded-lg bg-black/50 border border-[#00FF88]/30 focus:border-[#00FF88] focus:outline-none focus:ring-1 focus:ring-[#00FF88]"
          />
        </motion.div>
        
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Toolbox Panel */}
            <motion.div 
              className="lg:col-span-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <ToolboxPanel tools={availableTools} />
            </motion.div>
            
            {/* Construction Zone */}
            <motion.div 
              className="lg:col-span-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <ConstructionZone 
                selectedTools={selectedTools} 
                onRemoveTool={handleRemoveTool} 
              />
            </motion.div>
            
            {/* Prompt Forge */}
            <motion.div 
              className="lg:col-span-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <PromptForge 
                systemPrompt={systemPrompt} 
                setSystemPrompt={setSystemPrompt} 
              />
            </motion.div>
          </div>
        </DndContext>
        
        <motion.div 
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={handleCreateAgent}
            disabled={!isConnected}
            className="px-8 py-4 rounded-lg bg-gradient-to-r from-[#00FF88]/20 to-emerald-500/20 border border-[#00FF88] text-[#00FF88] hover:from-[#00FF88]/30 hover:to-emerald-500/30 transition-all duration-300 shadow-lg shadow-emerald-900/30 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnected ? 'Create Agent' : 'Connect Wallet to Continue'}
          </button>
          {!isConnected && (
            <p className="mt-3 text-sm text-gray-400">
              You need to connect your wallet to create an agent
            </p>
          )}
        </motion.div>
      </div>
    </>
  )
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-gray-300 flex flex-col items-center">
        <div className="h-12 w-12 mb-4 border-4 border-t-emerald-400 border-gray-700 rounded-full animate-spin"></div>
        <p>Loading agent builder...</p>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function CreateAgentPage() {
  return (
    <main className="min-h-screen pb-20">
      <Suspense fallback={<LoadingFallback />}>
        <CreateAgentContent />
      </Suspense>
    </main>
  )
} 