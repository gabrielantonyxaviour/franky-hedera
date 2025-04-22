import { NextRequest, NextResponse } from 'next/server'

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

// Function to fetch agents from the Graph API
async function fetchAgents(): Promise<Agent[]> {
  try {
    console.log('Fetching agents from Graph API...');
    const response = await fetch('https://www.frankyagent.xyz/api/graph/agents');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.status} ${response.statusText}`);
    }
    
    const agents = await response.json();
    console.log(`Fetched ${agents.length} agents from Graph API`);
    return agents;
  } catch (error) {
    console.error('Error fetching agents:', error);
    return [];
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

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]
  
  // Log for debugging
  console.log(`API subdomain route called for: ${hostname}, subdomain: ${subdomain}`)
  
  // Try to find the agent for this subdomain
  const agent = await findAgentBySubdomain(subdomain)
  
  return NextResponse.json({ 
    message: 'Hello from subdomain API!',
    subdomain,
    agent: agent ? {
      id: agent.id,
      avatar: agent.avatar,
      subname: agent.subname,
      ngrokLink: agent.deviceAddress?.ngrokLink,
      isPublic: agent.isPublic
    } : null,
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]
  
  // Log for debugging
  console.log(`API subdomain POST route called for: ${hostname}, subdomain: ${subdomain}`)
  
  // Try to find the agent for this subdomain
  const agent = await findAgentBySubdomain(subdomain)
  
  // If no agent is found, return an error
  if (!agent) {
    return NextResponse.json({ 
      error: 'Agent not found',
      subdomain,
      timestamp: new Date().toISOString()
    }, { status: 404 })
  }
  
  // If agent is found but no ngrok link, return an error
  if (!agent.deviceAddress?.ngrokLink) {
    return NextResponse.json({ 
      error: 'Ngrok link not available for this agent',
      subdomain,
      agentId: agent.id,
      timestamp: new Date().toISOString()
    }, { status: 404 })
  }
  
  return NextResponse.json({ 
    message: 'Agent found',
    subdomain,
    agent: {
      id: agent.id,
      avatar: agent.avatar,
      subname: agent.subname,
      ngrokLink: agent.deviceAddress.ngrokLink,
      isPublic: agent.isPublic
    },
    timestamp: new Date().toISOString()
  })
} 