import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Agent interface matching the Graph API response structure
interface Agent {
  __typename: string;
  id: string;
  deviceAddress: {
    __typename: string;
    id: string;
    ngrokLink: string;
  };
  owner: {
    __typename: string;
    id: string;
  };
  avatar: string;
  subname: string;
  perApiCallFee: string;
  characterConfig: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

// Cache for agents data to avoid repeated API calls
let agentsCache: Agent[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache TTL

// Function to fetch agents from the Graph API
async function fetchAgents(): Promise<Agent[]> {
  try {
    // Clear cache if it's older than the TTL
    const now = Date.now();
    if (agentsCache && now - lastFetchTime < CACHE_TTL) {
      return agentsCache;
    }

    console.log('Fetching agents from Graph API...');
    const response = await fetch('https://www.frankyagent.xyz/api/graph/agents');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.status} ${response.statusText}`);
    }
    
    const agents = await response.json();
    agentsCache = agents;
    lastFetchTime = now;
    console.log(`Fetched ${agents.length} agents from Graph API`);
    return agents;
  } catch (error) {
    console.error('Error fetching agents:', error);
    // Return cached data if available, or empty array if not
    return agentsCache || [];
  }
}

// Function to find agent by subdomain name
async function findAgentBySubdomain(subdomain: string): Promise<Agent | null> {
  try {
    const agents = await fetchAgents();
    const agent = agents.find(agent => agent.subname && agent.subname.toLowerCase() === subdomain.toLowerCase());
    
    if (agent) {
      console.log(`Found agent for subdomain ${subdomain}:`, agent.id);
    } else {
      console.log(`No agent found for subdomain ${subdomain}`);
    }
    
    return agent || null;
  } catch (error) {
    console.error(`Error finding agent for subdomain ${subdomain}:`, error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const isSubdomain = hostname.includes('.frankyagent.xyz') && !hostname.match(/^www\.frankyagent\.xyz$/)

  // Skip middleware for the subdomain page itself
  if (url.pathname === '/subdomain') {
    return NextResponse.next()
  }

  if (isSubdomain) {
    // Extract subdomain (agent prefix)
    const subdomain = hostname.split('.')[0]
    
    // If it's a browser request (GET), serve the Hello page
    if (request.method === 'GET') {
      console.log(`Handling subdomain request for: ${subdomain}, rewriting to /subdomain`)
      
      // Important: Clone the URL and modify it
      const rewriteUrl = new URL(request.url)
      // Change only the pathname
      rewriteUrl.pathname = '/subdomain'
      
      // Use redirect instead of rewrite for clearer debugging
      return NextResponse.redirect(rewriteUrl)
    }
    
    try {
      console.log(`Processing request for subdomain: ${subdomain}`)
      
      // Find the agent using the subdomain name
      const agent = await findAgentBySubdomain(subdomain);
      
      if (!agent || !agent.deviceAddress?.ngrokLink) {
        console.error(`Ngrok URL not found for subdomain: ${subdomain}`);
        return new NextResponse('Ngrok URL not found', { status: 404 });
      }
      
      const ngrokUrl = agent.deviceAddress.ngrokLink;
      console.log(`Found ngrok URL for ${subdomain}: ${ngrokUrl}`);
      
      // Forward the request to the ngrok URL
      return NextResponse.rewrite(new URL(ngrokUrl + url.pathname + url.search));
    } catch (error) {
      console.error('Error processing agent request:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
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