'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Header from '@/components/ui/Header'

// Simple hero animation
const HeroAnimation = () => {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30"></div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[#00FF88] opacity-20"
            style={{
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 50 - 25],
              y: [0, Math.random() * 50 - 25],
              scale: [1, Math.random() * 0.5 + 0.8, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      
      {/* Hexagon grid pattern */}
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
        <rect width="100%" height="100%" fill="url(#hexagons)" />
      </svg>
      
      {/* Glowing center */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
        style={{
          background: 'radial-gradient(circle at center, rgba(0,255,136,0.2) 0%, transparent 70%)'
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}

// Simple glow button
const GlowButton = ({ children, href, onClick }: { children: React.ReactNode, href?: string, onClick?: () => void }) => {
  const buttonContent = (
    <motion.div
      className="relative overflow-hidden px-8 py-4 rounded-xl bg-black/50 backdrop-blur-sm border border-[#00FF88] border-opacity-50"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <span className="relative z-10 text-2xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
        {children}
      </span>
      
      {/* Glow effect */}
      <div 
        className="absolute -inset-10"
        style={{ 
          background: 'radial-gradient(circle at center, rgba(0,255,136,0.3) 0%, transparent 70%)'
        }}
      />
    </motion.div>
  )
  
  if (href) {
    return <Link href={href}>{buttonContent}</Link>
  }
  
  return buttonContent
}

// Feature card component
const FeatureCard = ({ title, description, icon }: { title: string, description: string, icon: string }) => {
  return (
    <motion.div 
      className="p-6 rounded-xl border border-[#00FF88] border-opacity-30 bg-black/50 backdrop-blur-sm"
      whileHover={{ 
        y: -5,
        boxShadow: '0 10px 25px -5px rgba(0, 255, 136, 0.3)'
      }}
    >
      <div className="text-4xl mb-4 text-[#00FF88]">{icon}</div>
      <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">{title}</h3>
      <p className="text-[#AAAAAA]">{description}</p>
    </motion.div>
  )
}

// Main Home component
export default function Home() {
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted to avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <main className="min-h-screen">
      <Header />
      <HeroAnimation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
              Build Your AI Agent
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-[#AAAAAA] max-w-3xl mx-auto">
              Create custom AI agents with DeFi tools integration. Powered by 1inch protocol.
            </p>
            
            <GlowButton href="/create-agent">
              Build Your Agent →
            </GlowButton>
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 px-4 relative" style={{
        backgroundImage: `linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }}>
        <div className="container mx-auto">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold mb-12 text-center bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Powerful Features
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon="🔮"
              title="Visual Agent Builder"
              description="Drag and drop tools to create your custom AI agent with an intuitive interface."
            />
            <FeatureCard 
              icon="💱"
              title="1inch Integration"
              description="Access DeFi tools including swaps and limit orders directly through your agent."
            />
            <FeatureCard 
              icon="🧠"
              title="Custom Prompts"
              description="Fine-tune your agent's behavior with advanced prompt engineering."
            />
            <FeatureCard 
              icon="🔐"
              title="Web3 Authentication"
              description="Secure access with your Ethereum, Polygon or Arbitrum wallet."
            />
            <FeatureCard 
              icon="💬"
              title="Natural Conversations"
              description="Chat with your agent using natural language for a seamless experience."
            />
            <FeatureCard 
              icon="🚀"
              title="Extensible Platform"
              description="New tools and integrations added regularly to expand capabilities."
            />
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 px-4 relative">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="p-12 rounded-2xl border border-[#00FF88] border-opacity-30 bg-black/50 backdrop-blur-sm"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
              Ready to create your own AI agent?
            </h2>
            
            <GlowButton href="/create-agent">
              Start Building Now →
            </GlowButton>
          </motion.div>
        </div>
      </section>
    </main>
  )
}
