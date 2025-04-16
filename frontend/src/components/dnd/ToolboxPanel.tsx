'use client'

import { useDraggable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { Tool } from '@/app/create-agent/page'

interface ToolboxPanelProps {
  tools: Tool[]
}

function DraggableTool({ tool }: { tool: Tool }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tool.id,
  })
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging ? 0.8 : 1,
  } : undefined
  
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-4 mb-4 rounded-lg cyberpunk-border bg-black/50 backdrop-blur-sm cursor-grab active:cursor-grabbing"
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center">
        <div className="text-3xl mr-3">{tool.icon}</div>
        <div>
          <h3 className="font-bold text-[var(--primary-green)]">{tool.name}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{tool.description}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default function ToolboxPanel({ tools }: ToolboxPanelProps) {
  return (
    <div className="p-6 rounded-xl cyberpunk-border bg-black/70 backdrop-blur-md h-full">
      <h2 className="text-2xl font-bold mb-6 gradient-text">Tool Library</h2>
      <p className="mb-6 text-[var(--text-secondary)]">Drag tools to the construction zone to add them to your agent.</p>
      
      <div className="space-y-4">
        {tools.map(tool => (
          <DraggableTool key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  )
} 