import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createPublicClient, http } from 'viem'
import { normalize } from 'viem/ens'
import { mainnet } from 'viem/chains'

// Create a public client for ENS resolution
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
})

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
      
      // Construct the full ENS name
      const ensName = normalize(`${subdomain}.frankyagent.xyz`)
      
      try {
        // Fetch the ngrok URL from ENS text record
        const ngrokUrl = await publicClient.getEnsText({
          name: ensName,
          key: 'url'
        })
        
        if (!ngrokUrl) {
          console.error(`Ngrok URL not found in ENS text record for: ${ensName}`)
          return new NextResponse('Ngrok URL not found', { status: 404 })
        }

        console.log(`Found ngrok URL for ${ensName}: ${ngrokUrl}`)
        
        // Forward the request to the ngrok URL
        return NextResponse.rewrite(new URL(ngrokUrl + url.pathname + url.search))
      } catch (error) {
        console.error(`Error fetching ENS text record: ${error}`)
        return new NextResponse('Failed to get ngrok URL from ENS', { status: 500 })
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
