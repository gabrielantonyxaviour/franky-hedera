'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { v4 as uuidv4 } from 'uuid'
import { FiCopy, FiCheck, FiSmartphone, FiTerminal, FiDownload, FiServer } from 'react-icons/fi'
import Link from 'next/link'

type MessageRole = 'user' | 'assistant'

interface Message {
  id: string
  content: string
  role: MessageRole
  timestamp: Date
  showDeployDeviceInfo?: boolean
}

// CodeBlock component for displaying commands with copy functionality
const CodeBlock = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  return (
    <div className="relative mt-3 mb-6 rounded-lg overflow-hidden w-full">
      <div className="bg-black/70 backdrop-blur-sm border border-[#00FF88] border-opacity-30 p-5 font-mono text-sm md:text-base overflow-x-auto">
        <code className="text-[#00FF88]">{code}</code>
      </div>
      <button
        onClick={copyToClipboard}
        className="absolute top-3 right-3 p-2 rounded-md bg-black/50 hover:bg-black/80 text-[#00FF88] transition-colors"
        aria-label="Copy to clipboard"
      >
        {copied ? <FiCheck /> : <FiCopy />}
      </button>
    </div>
  )
}

// Instruction Step component
const InstructionStep = ({
  number,
  title,
  icon,
  children
}: {
  number: number,
  title: string,
  icon: React.ReactNode,
  children: React.ReactNode
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: number * 0.1 }}
      className="mb-6 p-4 rounded-xl border border-[#00FF88] border-opacity-30 bg-black/50 backdrop-blur-sm"
    >
      <div className="flex items-center mb-3">
        <div className="flex justify-center items-center h-10 w-10 rounded-full bg-[#00FF88] bg-opacity-20 text-[#00FF88] mr-3">
          {icon}
        </div>
        <h3 className="text-lg font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
          Step {number}: {title}
        </h3>
      </div>
      <div className="text-[#CCCCCC] ml-12 text-sm">
        {children}
      </div>
    </motion.div>
  )
}

// DeployDeviceInfo component to show when user asks about deploying devices
const DeployDeviceInfo = () => {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-[#AAAAAA] mb-4">
        Here's how you can deploy your mobile device to earn $FIL by hosting AI agents:
      </p>
      
      <InstructionStep 
        number={1} 
        title="Setup your Phone" 
        icon={<FiSmartphone size={20} />}
      >
        <p>Watch this video tutorial to set up your phone with Termux, an Android terminal emulator that allows you to run Linux commands:</p>
        <div className="mt-3 relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe 
            className="absolute inset-0 w-full h-full rounded-lg border border-[#00FF88]/30"
            src="https://www.youtube.com/embed/s3TXc-jiQ40?si=xq88k3gI5n1OUJHk"
            title="Setup Termux for Franky"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </InstructionStep>
      
      <InstructionStep 
        number={2} 
        title="Run Franky" 
        icon={<FiTerminal size={20} />}
      >
        <p>Use the following curl command to download, install and run Franky:</p>
        <CodeBlock code="pkg update && pkg install nodejs libqrencode termux-api jq curl && git clone https://github.com/Marshal-AM/franky.git && cd franky && cd agent-framework && chmod +x franky && ./franky start" />
        <p>This script will download all necessary files to run Franky on your device.</p>
      </InstructionStep>
    </div>
  )
}

export default function ChatInterface({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean
  onClose: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Function to check if message is asking about deploying a device
  const isAskingAboutDeployingDevice = (message: string) => {
    const deployKeywords = [
      'deploy device', 'how to deploy', 'setup device', 'deploy a device', 
      'register device', 'deploy my phone', 'deploy my device', 'how can i deploy',
      'how do i deploy', 'deploy my android', 'deploy my iphone', 'deploy mobile'
    ]
    
    const lowerMessage = message.toLowerCase()
    return deployKeywords.some(keyword => lowerMessage.includes(keyword))
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    const isDeployQuestion = isAskingAboutDeployingDevice(input)
    
    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      content: input,
      role: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    
    try {
      if (isDeployQuestion) {
        // For deploy device questions, create a custom response
        setTimeout(() => {
          const assistantMessage: Message = {
            id: uuidv4(),
            content: "Here's how to deploy your device with Franky:",
            role: 'assistant',
            timestamp: new Date(),
            showDeployDeviceInfo: true
          }
          
          setMessages(prev => [...prev, assistantMessage])
          setIsLoading(false)
        }, 1000)
      } else {
        // Regular API call for other questions
        const response = await fetch('https://franky-1.onrender.com/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: input })
        })
        
        if (!response.ok) {
          throw new Error('Failed to get response from agent')
        }
        
        const data = await response.json()
        
        // Add assistant response
        const assistantMessage: Message = {
          id: uuidv4(),
          content: data.message || data.response || "I'm having trouble responding right now.",
          role: 'assistant',
          timestamp: new Date()
        }
        
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Error communicating with agent:', error)
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        content: "Sorry, I encountered an error. Please try again later.",
        role: 'assistant',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearConversation = () => {
    setMessages([])
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Background elements to match home screen */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-30"></div>
            {/* Hexagon grid pattern */}
            <svg
              className="absolute inset-0 w-full h-full opacity-10"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="hexagons"
                  width="50"
                  height="43.4"
                  patternUnits="userSpaceOnUse"
                  patternTransform="scale(2)"
                >
                  <path
                    d="M25 0 L50 14.4 L50 38.6 L25 53 L0 38.6 L0 14.4 Z"
                    fill="none"
                    stroke="#00FF88"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hexagons)" />
            </svg>

            {/* Static glow */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(0,255,136,0.2) 0%, transparent 70%)",
              }}
            />
          </div>
          
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          {/* Chat container */}
          <div className="flex flex-col w-full max-w-3xl h-full px-4 pt-20 pb-8 mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col flex-1 items-center justify-center">
                <h1 className="text-4xl font-semibold text-white mb-12">What can I help with?</h1>
                
                {/* Input container for empty state */}
                <div className="w-full max-w-[800px]">
                  <div className="relative shadow-[0_0_10px_rgba(0,255,136,0.15)] rounded-2xl">
                    <textarea
                      rows={1}
                      placeholder="Ask anything"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full py-3.5 pl-4 pr-14 rounded-2xl border border-[#00FF88]/30 bg-black/50 text-white resize-none focus:outline-none focus:border-[#00FF88]/50"
                      disabled={isLoading}
                      style={{ minHeight: '56px', maxHeight: '200px', height: 'auto' }}
                    />
                    <div className="absolute right-2 bottom-2.5 flex space-x-2">
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`p-1.5 rounded-full bg-black ${!input.trim() || isLoading ? 'opacity-40 cursor-not-allowed' : 'opacity-100'}`}
                      >
                        {isLoading ? (
                          <svg className="w-5 h-5 animate-spin text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 11L12 6L17 11M12 18V7" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(90 12 12)"></path>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Messages display */}
                <div className="flex-1 overflow-y-auto pb-4">
                  {messages.map((message) => (
                    <div 
                      key={message.id} 
                      className="mb-6"
                    >
                      <div className="flex">
                        <div className="flex items-start max-w-3xl">
                          <div className="flex-shrink-0 mr-4">
                            {message.role === 'assistant' ? (
                              <div className="h-8 w-8 rounded-full bg-[#00FF88]/20 flex items-center justify-center">
                                <span className="text-[#00FF88] text-sm">AI</span>
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                                <span className="text-white text-sm">You</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-sm text-white">
                              {message.role === 'assistant' ? 'Franky AI' : 'You'}
                            </p>
                            <div className="prose text-[#AAAAAA]">
                              {message.content}
                            </div>
                            
                            {/* Display deploy device information if this message should show it */}
                            {message.showDeployDeviceInfo && (
                              <DeployDeviceInfo />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="mb-6">
                      <div className="flex">
                        <div className="flex items-start max-w-3xl">
                          <div className="flex-shrink-0 mr-4">
                            <div className="h-8 w-8 rounded-full bg-[#00FF88]/20 flex items-center justify-center">
                              <span className="text-[#00FF88] text-sm">AI</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-sm text-white">Franky AI</p>
                            <div className="flex space-x-2">
                              {[0, 1, 2].map((dot) => (
                                <motion.div
                                  key={dot}
                                  className="w-2 h-2 rounded-full bg-[#00FF88]"
                                  animate={{
                                    opacity: [0.3, 1, 0.3],
                                    scale: [0.8, 1.2, 0.8]
                                  }}
                                  transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: dot * 0.2
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Chat input when conversation is active */}
                <div className="w-full max-w-3xl mt-4">
                  <div className="relative shadow-[0_0_10px_rgba(0,255,136,0.15)] rounded-2xl">
                    <textarea
                      rows={1}
                      placeholder="Send a message"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full py-3.5 pl-4 pr-14 rounded-2xl border border-[#00FF88]/30 bg-black/50 text-white resize-none focus:outline-none focus:border-[#00FF88]/50"
                      disabled={isLoading}
                      style={{ minHeight: '56px', maxHeight: '200px', height: 'auto' }}
                    />
                    <div className="absolute right-2 bottom-2.5">
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`p-1.5 rounded-full bg-black border border-[#00FF88]/30 ${!input.trim() || isLoading ? 'opacity-40 cursor-not-allowed' : 'opacity-100'}`}
                      >
                        {isLoading ? (
                          <svg className="w-5 h-5 animate-spin text-[#00FF88]" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 11L12 6L17 11M12 18V7" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(90 12 12)"></path>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 
