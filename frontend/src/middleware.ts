import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface Device {
  id: string;
  ngrokUrl: string;
  walletAddress: string;
  status: string;
}

interface Agent {
  id: string;
  device_address: string;
  owner_address: string;
  subname: string;
  is_public: boolean;
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const isHederaSubdomain = hostname.includes('.franky-hedera.vercel.app')
  const isMainDomain = hostname === 'franky-hedera.vercel.app'
  const isSubdomain = isHederaSubdomain && !isMainDomain

  if (isSubdomain) {
    // Extract subdomain (agent prefix)
    const subdomain = hostname.split('.')[0]
    
    // If it's a browser request (GET), serve the subdomain page
    if (request.method === 'GET') {
      return NextResponse.rewrite(new URL('/subdomain', url))
    }
    
    try {
      console.log(`Processing request for subdomain: ${subdomain}`)
      
      try {
        // 1. First fetch agent by subname from Supabase
        const agentResponse = await fetch(`https://franky-hedera.vercel.app/api/db/agents?subname=${subdomain}`)
        
        if (!agentResponse.ok) {
          console.error(`Failed to fetch agent: ${agentResponse.status} ${agentResponse.statusText}`)
          return new NextResponse('Failed to fetch agent', { status: 500 })
        }
        
        const agent: Agent = await agentResponse.json()
        
        if (!agent || !agent.device_address) {
          console.error(`No agent found with subname: ${subdomain}`)
          return new NextResponse('Agent not found', { status: 404 })
        }

        // 2. Then fetch device details using the device address
        const deviceResponse = await fetch(`https://franky-hedera.vercel.app/api/db/devices?address=${agent.device_address}`)

        if (!deviceResponse.ok) {
          console.error(`Failed to fetch device: ${deviceResponse.status} ${deviceResponse.statusText}`)
          return new NextResponse('Failed to fetch device', { status: 500 })
        }

        const device: Device = await deviceResponse.json()

        if (!device || !device.ngrokUrl || device.status !== 'Active') {
          console.error(`Device not found or inactive for agent: ${subdomain}`)
          return new NextResponse('Device not found or inactive', { status: 404 })
        }

        console.log(`Found ngrok URL for ${subdomain}: ${device.ngrokUrl}`)
        
        // Forward the request to the ngrok URL
        return NextResponse.rewrite(new URL(device.ngrokUrl + url.pathname + url.search))
      } catch (error) {
        console.error(`Error fetching data: ${error}`)
        return new NextResponse('Failed to process request', { status: 500 })
      }
    } catch (error) {
      console.error('Error processing request:', error)
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
