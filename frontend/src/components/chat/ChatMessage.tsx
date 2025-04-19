'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  content: string
  role: MessageRole
  timestamp: Date
}

interface ChatMessageProps {
  message: Message
  isLatest: boolean
}

// Animated typing indicator
function TypingIndicator() {
  return (
    <div className="flex space-x-2 p-2">
      {[0, 1, 2].map((dot) => (
        <motion.div
          key={dot}
          className="w-2 h-2 rounded-full bg-[var(--primary-green)]"
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: dot * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}

// Code block renderer
function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <div className="my-2 rounded-md overflow-hidden">
      <div className="bg-gray-900 px-4 py-2 text-xs text-[var(--text-secondary)] border-b border-[var(--primary-green)]/20">
        Code
      </div>
      <pre className="bg-black/50 p-4 overflow-x-auto text-sm">
        <code className="text-[var(--primary-green)]">{children}</code>
      </pre>
    </div>
  )
}

// Process message content to render code blocks
function formatMessageContent(content: string) {
  // Simple regex to detect code blocks (```code```)
  const parts = content.split(/(```[\s\S]*?```)/g)
  
  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      // Extract code without the backticks
      const code = part.slice(3, -3)
      return <CodeBlock key={index}>{code}</CodeBlock>
    }
    
    // Regular text
    return <p key={index} className="mb-2">{part}</p>
  })
}

export default function ChatMessage({ message, isLatest }: ChatMessageProps) {
  const isUser = message.role === 'user'
  
  return (
    <motion.div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className={`max-w-[80%] rounded-xl p-4 ${
          isUser 
            ? 'bg-[var(--primary-green)]/20 border border-[var(--primary-green)]/30' 
            : 'bg-black/50 border border-gray-800'
        }`}
      >
        {/* Message content */}
        <div className={`${isUser ? 'text-[var(--primary-green)]' : 'text-[var(--text-primary)]'}`}>
          {formatMessageContent(message.content)}
        </div>
        
        {/* Typing indicator for the latest assistant message */}
        {!isUser && isLatest && message.content.endsWith('...') && (
          <TypingIndicator />
        )}
        
        {/* Timestamp */}
        <div className="text-xs text-[var(--text-secondary)] mt-2">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  )
} 