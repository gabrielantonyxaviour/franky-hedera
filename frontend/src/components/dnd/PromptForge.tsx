'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface PromptForgeProps {
  systemPrompt: string
  setSystemPrompt: (prompt: string) => void
}

// Example prompt suggestions
const promptSuggestions = [
  "You are a DeFi assistant that helps users manage their crypto portfolio.",
  "You are a trading bot that can execute swaps and limit orders on behalf of users.",
  "You are a crypto market analyst that provides insights on token prices and market trends.",
  "You are a helpful assistant that can check balances and estimate gas costs for transactions."
]

export default function PromptForge({ systemPrompt, setSystemPrompt }: PromptForgeProps) {
  const [charCount, setCharCount] = useState(0)
  const maxChars = 1000
  
  // Update character count when prompt changes
  useEffect(() => {
    setCharCount(systemPrompt.length)
  }, [systemPrompt])
  
  // Calculate progress percentage for the character counter
  const progressPercentage = Math.min((charCount / maxChars) * 100, 100)
  
  // Handle suggestion click
  function handleSuggestionClick(suggestion: string) {
    setSystemPrompt(suggestion)
  }
  
  return (
    <div className="p-6 rounded-xl cyberpunk-border bg-black/70 backdrop-blur-md h-full">
      <h2 className="text-2xl font-bold mb-6 gradient-text">Prompt Forge</h2>
      <p className="mb-6 text-[var(--text-secondary)]">
        Define your agent's behavior with a system prompt.
      </p>
      
      <div className="relative mb-2">
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Enter a system prompt for your AI agent..."
          className="w-full h-48 p-4 rounded-lg bg-black/50 border border-[var(--primary-green)]/30 focus:border-[var(--primary-green)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-green)] resize-none text-[var(--text-primary)]"
          maxLength={maxChars}
        />
        
        {/* Floating glow effect */}
        <div className="absolute -inset-1 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.15)_0%,transparent_70%)] rounded-lg pointer-events-none" />
      </div>
      
      {/* Character counter */}
      <div className="flex justify-between items-center mb-6 text-sm text-[var(--text-secondary)]">
        <div>Characters</div>
        <div>{charCount} / {maxChars}</div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 w-full bg-gray-800 rounded-full mb-6 overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-[var(--primary-green)] to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      {/* Prompt suggestions */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4 text-[var(--text-secondary)]">Suggestions</h3>
        <div className="space-y-2">
          {promptSuggestions.map((suggestion, index) => (
            <motion.button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full p-3 text-left text-sm rounded-lg border border-[var(--primary-green)]/20 hover:border-[var(--primary-green)]/50 hover:bg-[var(--primary-green)]/10 transition-colors"
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
} 