'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

// Agent interface (simplified version of what we get from the API)
interface AgentInfo {
  id: string;
  avatar: string;
  subname: string;
  ngrokLink: string;
  isPublic: boolean;
}

interface ApiResponse {
  message: string;
  subdomain: string;
  agent: AgentInfo | null;
  timestamp: string;
}

export default function SubdomainPage() {
  const pathname = usePathname()
  const [subdomain, setSubdomain] = useState<string>('')
  const [agent, setAgent] = useState<AgentInfo | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    // Extract subdomain from hostname
    const hostname = window.location.hostname
    const subdomain = hostname.split('.')[0]
    setSubdomain(subdomain)
    
    // Log for debugging
    console.log('Subdomain page loaded, pathname:', pathname)
    console.log('Hostname:', hostname, 'Subdomain:', subdomain)
    
    // Fetch agent information
    const fetchAgentInfo = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/subdomain')
        
        if (!response.ok) {
          throw new Error(`Failed to fetch agent info: ${response.status}`)
        }
        
        const data: ApiResponse = await response.json()
        console.log('Agent data:', data)
        
        if (data.agent) {
          setAgent(data.agent)
        }
      } catch (err) {
        console.error('Error fetching agent info:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    
    if (subdomain) {
      fetchAgentInfo()
    }
  }, [pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center p-8 max-w-xl">
        <h1 className="text-6xl font-bold mb-8">Hello!</h1>
        
        {loading ? (
          <p className="text-xl">Loading agent information...</p>
        ) : error ? (
          <div className="text-red-500 mb-4">
            <p>Error: {error}</p>
          </div>
        ) : agent ? (
          <div className="mb-8">
            <div className="mb-6 flex justify-center">
              {agent.avatar && (
                <div className="rounded-full overflow-hidden w-32 h-32 mb-4 mx-auto relative">
                  <Image 
                    src={agent.avatar} 
                    alt={`${agent.subname}'s avatar`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
            </div>
            <h2 className="text-3xl font-bold mb-2">{agent.subname}</h2>
            <p className="text-gray-400 mb-4">Agent ID: {agent.id.substring(0, 8)}...{agent.id.substring(agent.id.length - 6)}</p>
            <p className="text-xl mb-6">You've reached a Franky agent's subdomain.</p>
            {agent.isPublic ? (
              <p className="text-green-400">This is a public agent.</p>
            ) : (
              <p className="text-yellow-400">This is a private agent.</p>
            )}
          </div>
        ) : (
          <div className="mb-8">
            <p className="text-xl">You've reached a Franky agent subdomain.</p>
            <p className="text-gray-400 mt-4">No agent information available for '{subdomain}'</p>
          </div>
        )}
        
        <p className="text-sm text-gray-500 mt-8">
          Use POST requests to interact with this agent.
        </p>
      </div>
    </div>
  )
} 