import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface Device {
  __typename: string;
  id: string;
  ngrokLink: string;
}

interface User {
  __typename: string;
  id: string;
}

interface Agent {
  __typename: string;
  id: string;
  deviceAddress: Device;
  owner: User;
  avatar: string;
  subname: string;
  perApiCallFee: string;
  characterConfig: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const isSubdomain = hostname.includes('.frankyagent.xyz') && !hostname.match(/^www\.frankyagent\.xyz$/)

  if (isSubdomain) {
    // Extract subdomain (agent prefix)
    const subdomain = hostname.split('.')[0]
    
    // If it's a browser request (GET), serve the Hello page
    if (request.method === 'GET') {
      return NextResponse.rewrite(new URL('/subdomain', url))
    }
    
    try {
      console.log(`Processing request for subdomain: ${subdomain}`)
      
      try {
        // Fetch agents from the API endpoint
        const response = await fetch('https://www.frankyagent.xyz/api/graph/agents')
        
        if (!response.ok) {
          console.error(`Failed to fetch agents: ${response.status} ${response.statusText}`)
          return new NextResponse('Failed to fetch agents', { status: 500 })
        }
        
        const agents: Agent[] = await response.json()
        
        // Find agent with matching subname
        const agent = agents.find(agent => agent.subname === subdomain)
        
        if (!agent || !agent.deviceAddress?.ngrokLink) {
          console.error(`No agent found with subname: ${subdomain} or ngrok link not available`)
          return new NextResponse('Agent not found or ngrok link not available', { status: 404 })
        }

        const ngrokUrl = agent.deviceAddress.ngrokLink
        console.log(`Found ngrok URL for ${subdomain}: ${ngrokUrl}`)
        
        // Forward the request to the ngrok URL
        return NextResponse.rewrite(new URL(ngrokUrl + url.pathname + url.search))
      } catch (error) {
        console.error(`Error fetching agent data: ${error}`)
        return new NextResponse('Failed to get agent data', { status: 500 })
      }
    } catch (error) {
      console.error('Error processing agent request:', error)
      return new NextResponse('Internal Server Error', { status: 500 })
    }
  }

  // For the main domain, continue to the normal app
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 
