import { ethers } from 'ethers'

interface AgentCreatedEventArgs {
  agentAddress: string
  deviceAddress: string
  prefix: string
  owner: string
  perApiCallFee: bigint
  secretsHash: string
  character: string
  secrets: string
  isPublic: boolean
}

const FRANKY_ABI = [
  "event AgentCreated(address indexed agentAddress, address indexed deviceAddress, string prefix, address owner, uint256 perApiCallFee, bytes32 secretsHash, string character, string secrets, bool isPublic)"
]

const FRANKY_CONTRACT_ADDRESS = '0x18c2e2f87183034700cc2A7cf6D86a71fd209678'
const RPC_URL = `https://base-sepolia.nodit.io/${process.env.NEXT_PUBLIC_NODIT_API_KEY}`

// In-memory cache of subdomain to agent address mappings
const subdomainCache = new Map<string, string>()

export async function getAgentAddressFromSubdomain(subdomain: string): Promise<string | null> {
  // Check cache first
  if (subdomainCache.has(subdomain)) {
    return subdomainCache.get(subdomain)!
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const frankyContract = new ethers.Contract(FRANKY_CONTRACT_ADDRESS, FRANKY_ABI, provider)

    // Get the filter for AgentCreated events
    const filter = frankyContract.filters.AgentCreated()
    
    // Get all past events
    const events = await frankyContract.queryFilter(filter)
    
    // Find the event with matching prefix and parse it
    for (const event of events) {
      const parsed = frankyContract.interface.parseLog({
        topics: event.topics as string[],
        data: event.data
      })
      
      if (parsed?.args && parsed.args[2] === subdomain) { // prefix is the third argument
        const agentAddress = parsed.args[0] as string // agentAddress is the first argument
        
        // Cache the result
        subdomainCache.set(subdomain, agentAddress)
        
        return agentAddress
      }
    }
    
    return null
  } catch (error) {
    console.error('Error getting agent address:', error)
    return null
  }
} 