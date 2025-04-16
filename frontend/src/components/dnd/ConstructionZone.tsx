'use client'

import { useDroppable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { Tool } from '@/app/create-agent/page'
import { useEffect, useRef } from 'react'

interface ConstructionZoneProps {
  selectedTools: Tool[]
  onRemoveTool: (id: string) => void
}

// Particle animation component
function NeuralNetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = canvas.offsetWidth
        canvas.height = canvas.offsetHeight
      }
    }
    
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    // Particle class
    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string
      
      constructor() {
        this.x = Math.random() * (canvas?.width || 300)
        this.y = Math.random() * (canvas?.height || 300)
        this.size = Math.random() * 2 + 0.5
        this.speedX = (Math.random() - 0.5) * 0.5
        this.speedY = (Math.random() - 0.5) * 0.5
        this.color = `rgba(0, 255, 136, ${Math.random() * 0.5 + 0.2})`
      }
      
      update() {
        this.x += this.speedX
        this.y += this.speedY
        
        if (this.x < 0 || this.x > (canvas?.width || 300)) this.speedX *= -1
        if (this.y < 0 || this.y > (canvas?.height || 300)) this.speedY *= -1
      }
      
      draw() {
        if (!ctx) return
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    
    // Create particles
    const particles: Particle[] = []
    const particleCount = 50
    
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }
    
    // Animation loop
    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw connections
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.05)'
      ctx.lineWidth = 0.5
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < 100) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
      
      // Update and draw particles
      particles.forEach(particle => {
        particle.update()
        particle.draw()
      })
      
      requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])
  
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

function SelectedTool({ tool, onRemove }: { tool: Tool, onRemove: () => void }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="p-3 rounded-lg cyberpunk-border bg-black/70 backdrop-blur-sm flex items-center justify-between"
    >
      <div className="flex items-center">
        <div className="text-2xl mr-2">{tool.icon}</div>
        <div className="font-medium text-[var(--primary-green)]">{tool.name}</div>
      </div>
      <button 
        onClick={onRemove}
        className="text-[var(--text-secondary)] hover:text-[var(--primary-green)] transition-colors"
      >
        ✕
      </button>
    </motion.div>
  )
}

export default function ConstructionZone({ selectedTools, onRemoveTool }: ConstructionZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'construction-zone',
  })
  
  return (
    <div 
      ref={setNodeRef}
      className={`p-6 rounded-xl cyberpunk-border bg-black/70 backdrop-blur-md h-[500px] relative overflow-hidden ${
        isOver ? 'border-[var(--primary-green)] ring-2 ring-[var(--primary-green)]/30' : ''
      }`}
    >
      <h2 className="text-2xl font-bold mb-6 gradient-text relative z-10">Construction Zone</h2>
      <p className="mb-6 text-[var(--text-secondary)] relative z-10">
        {selectedTools.length === 0 
          ? 'Drop tools here to add them to your agent.' 
          : `${selectedTools.length} tool${selectedTools.length !== 1 ? 's' : ''} selected.`}
      </p>
      
      <div className="relative z-10 space-y-3 mt-8">
        {selectedTools.map(tool => (
          <SelectedTool 
            key={tool.id} 
            tool={tool} 
            onRemove={() => onRemoveTool(tool.id)} 
          />
        ))}
      </div>
      
      {/* Neural network visualization */}
      <div className="absolute inset-0 opacity-50">
        <NeuralNetworkBackground />
      </div>
      
      {/* Empty state */}
      {selectedTools.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div 
            className="text-[var(--text-secondary)] text-center"
            animate={{ 
              y: [0, -10, 0],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="text-5xl mb-4">👇</div>
            <div>Drag tools here</div>
          </motion.div>
        </div>
      )}
    </div>
  )
} 