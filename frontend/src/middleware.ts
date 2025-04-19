import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ethers } from 'ethers'

// Contract ABI for getting ngrok URL from agent contract
const AGENT_ACCOUNT_ABI = [
  "function getNgrokUrl() external view returns (string)"
]

// RPC URL for the Base mainnet
const RPC_URL = `https://base-mainnet.nodit.io/${process.env.NEXT_PUBLIC_NODIT_API_KEY}`

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
      
      // Fetch agent data from our API
      const apiResponse = await fetch(`${url.protocol}//${url.host}/api/agents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!apiResponse.ok) {
        console.error(`API response error: ${apiResponse.status}`)
        return new NextResponse('Failed to fetch agent data', { status: 500 })
      }
      
      const apiData = await apiResponse.json()
      
      if (!apiData.agents || !Array.isArray(apiData.agents)) {
        console.error('Invalid API response format', apiData)
        return new NextResponse('Invalid API response format', { status: 500 })
      }
      
      // Find the agent with matching prefix/subname
      const matchingAgent = apiData.agents.find(
        (agent: any) => agent.prefix === subdomain || agent.subname === subdomain
      )
      
      if (!matchingAgent) {
        console.error(`Agent not found for subdomain: ${subdomain}`)
        return new NextResponse('Agent not found', { status: 404 })
      }
      
      console.log(`Found agent: ${matchingAgent.agentAddress} for subdomain: ${subdomain}`)
      
      // Connect to the blockchain to get the current ngrok URL
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const agentAccount = new ethers.Contract(matchingAgent.agentAddress, AGENT_ACCOUNT_ABI, provider)
      
      try {
        const ngrokUrl = await agentAccount.getNgrokUrl()
        
        if (!ngrokUrl) {
          console.error(`Ngrok URL not found for agent: ${matchingAgent.agentAddress}`)
          return new NextResponse('Ngrok URL not found', { status: 404 })
        }

        
        // Forward the request to the ngrok URL
        return NextResponse.rewrite(new URL("https://0ca0-111-235-226-124.ngrok-free.app" + url.pathname + url.search))
      } catch (error) {
        console.error(`Error fetching ngrok URL from contract: ${error}`)
        return new NextResponse('Failed to get ngrok URL', { status: 500 })
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
