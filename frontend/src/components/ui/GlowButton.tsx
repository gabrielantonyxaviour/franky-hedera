'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { MouseEvent, ReactNode, useRef } from 'react'
import Link from 'next/link'

interface GlowButtonProps {
  children: ReactNode
  href?: string
  onClick?: () => void
  className?: string
}

export default function GlowButton({ 
  children, 
  href, 
  onClick, 
  className = '' 
}: GlowButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  
  // Motion values for magnetic effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  // Smooth spring physics for natural movement
  const springConfig = { damping: 25, stiffness: 400 }
  const x = useSpring(mouseX, springConfig)
  const y = useSpring(mouseY, springConfig)
  
  // Transform mouse position to button movement (limited range)
  const moveX = useTransform(x, (val) => val / 10)
  const moveY = useTransform(y, (val) => val / 10)
  
  // Glow position follows mouse more dramatically
  const glowX = useTransform(x, (val) => val / 5)
  const glowY = useTransform(y, (val) => val / 5)
  
  function handleMouseMove(e: MouseEvent) {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      // Calculate distance from center
      mouseX.set(e.clientX - centerX)
      mouseY.set(e.clientY - centerY)
    }
  }
  
  function handleMouseLeave() {
    // Reset position when mouse leaves
    mouseX.set(0)
    mouseY.set(0)
  }
  
  const buttonContent = (
    <motion.div
      ref={buttonRef}
      className={`relative overflow-hidden px-8 py-4 rounded-xl bg-black/50 backdrop-blur-sm border border-[#00FF88] border-opacity-50 ${className}`}
      style={{ x: moveX, y: moveY }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <span className="relative z-10 text-2xl font-bold gradient-text">
        {children}
      </span>
      
      {/* Glow effect */}
      <motion.div 
        className="absolute -inset-10"
        style={{ 
          x: glowX, 
          y: glowY,
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