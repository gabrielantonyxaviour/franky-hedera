'use client'

import { useState, FormEvent, KeyboardEvent, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading: boolean
}

export default function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])
  
  // Handle form submission
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim())
      setMessage('')
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }
  
  // Handle keyboard shortcuts
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }
  
  return (
    <motion.div 
      className="border-t border-[var(--primary-green)]/20 bg-black/50 backdrop-blur-md p-4 rounded-b-xl"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isLoading}
          className="w-full p-4 pr-12 rounded-xl bg-black/70 border border-[var(--primary-green)]/30 focus:border-[var(--primary-green)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-green)] resize-none max-h-32 text-[var(--text-primary)]"
          rows={1}
        />
        
        <motion.button
          type="submit"
          disabled={!message.trim() || isLoading}
          className={`absolute right-3 bottom-3 p-2 rounded-lg ${
            message.trim() && !isLoading
              ? 'bg-[var(--primary-green)]/20 text-[var(--primary-green)] hover:bg-[var(--primary-green)]/30'
              : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
          } transition-colors`}
          whileHover={message.trim() && !isLoading ? { scale: 1.05 } : {}}
          whileTap={message.trim() && !isLoading ? { scale: 0.95 } : {}}
        >
          {isLoading ? (
            <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </motion.button>
        
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.1)_0%,transparent_70%)] rounded-xl pointer-events-none" />
      </form>
      
      <div className="mt-2 text-xs text-center text-[var(--text-secondary)]">
        Press Enter to send, Shift+Enter for new line
      </div>
    </motion.div>
  )
} 