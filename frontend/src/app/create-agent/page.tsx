'use client'

import Header from '@/components/ui/Header'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import ToolboxPanel from '@/components/dnd/ToolboxPanel'
import ConstructionZone from '@/components/dnd/ConstructionZone'
import PromptForge from '@/components/dnd/PromptForge'
import { useWalletStore } from '@/store/useWalletStore'
import { useRouter } from 'next/navigation'

// Define tool types
export interface Tool {
  id: string
  name: string
  description: string
  icon: string
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

export default function CreateAgentPage() {
  const [selectedTools, setSelectedTools] = useState<Tool[]>([])
  const [systemPrompt, setSystemPrompt] = useState('')
  const [agentName, setAgentName] = useState('')
  const { isConnected, address } = useWalletStore()
  const router = useRouter()
  
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
    <main className="min-h-screen pb-20">
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
        
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
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
          transition={{ delay: 0.7 }}
        >
          <button
            onClick={handleCreateAgent}
            className="px-8 py-4 rounded-xl bg-[#00FF88]/20 border border-[#00FF88]/50 text-[#00FF88] text-xl font-bold hover:bg-[#00FF88]/30 transition-colors"
          >
            Create Agent
          </button>
        </motion.div>
      </div>
    </main>
  )
} 