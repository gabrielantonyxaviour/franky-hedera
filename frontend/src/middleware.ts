import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ethers } from 'ethers'
import { getAgentAddressFromSubdomain } from './lib/ens'

// Contract ABI - we only need the relevant functions
const FRANKY_ABI = [
  "function getAgent(address agentAddress) external view returns (tuple(address agentAddress, address deviceAddress, string prefix, string config, string secrets, bytes32 secretsHash, address owner, uint256 perApiCallFee, uint8 status))",
  "function getDevice(address deviceAddress) external view returns (tuple(string deviceModel, string ram, string storageCapacity, string cpu, string ngrokLink, address deviceAddress, uint256 hostingFee, uint256 agentCount, bool isRegistered))"
]

const AGENT_ACCOUNT_ABI = [
  "function getNgrokUrl() external view returns (string)"
]

const FRANKY_CONTRACT_ADDRESS = '0x18c2e2f87183034700cc2A7cf6D86a71fd209678'
const RPC_URL = `https://base-sepolia.nodit.io/${process.env.NEXT_PUBLIC_NODIT_API_KEY}`

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
      // Get the agent's address from the subdomain
      const agentAddress = await getAgentAddressFromSubdomain(subdomain)
      
      if (!agentAddress) {
        return new NextResponse('Agent not found', { status: 404 })
      }

      // Connect to the blockchain
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const frankyContract = new ethers.Contract(FRANKY_CONTRACT_ADDRESS, FRANKY_ABI, provider)
      
      // Get the agent's details from the contract
      const agent = await frankyContract.getAgent(agentAddress)
      
      // Get the device details
      const device = await frankyContract.getDevice(agent.deviceAddress)
      
      // Get the agent's account contract to get the current ngrok URL
      const agentAccount = new ethers.Contract(agentAddress, AGENT_ACCOUNT_ABI, provider)
      const ngrokUrl = await agentAccount.getNgrokUrl()
      
      if (!ngrokUrl) {
        return new NextResponse('Ngrok URL not found', { status: 404 })
      }

      // Forward the request to the ngrok URL
      return NextResponse.rewrite(new URL(ngrokUrl + url.pathname + url.search))
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