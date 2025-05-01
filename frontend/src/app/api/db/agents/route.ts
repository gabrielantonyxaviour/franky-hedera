import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export interface Agent {
  id: string
  name: string
  subname: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
  creator_comment: string
  tags: string[]
  talkativeness: number
  is_favorite: boolean
  device_address: string
  owner_address: string
  per_api_call_fee: string
  is_public: boolean
  tools: string[]
  tx_hash: string
  created_at: string
}

// Helper function to get Supabase client
async function getSupabaseClient() {
  const cookieStore = cookies()
  return createRouteHandlerClient({ 
    cookies: () => cookieStore 
  })
}

// GET /api/db/agents - Get all agents
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  const subname = searchParams.get('subname')
  
  try {
    const supabase = await getSupabaseClient()
    
    if (subname) {
      // Get agent by subname
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('subname', subname.toLowerCase())
        .single()

      if (error) throw error
      
      return NextResponse.json(transformAgentData(data))
    }

    if (address) {
      // Get agent by device or owner address
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .or(`device_address.eq.${address.toLowerCase()},owner_address.eq.${address.toLowerCase()}`)

      if (error) throw error
      
      return NextResponse.json(data.map(transformAgentData))
    }

    // Get all agents
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data.map(transformAgentData))

  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 })
  }
}

// POST /api/db/agents - Create new agent record
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseClient()
    
    // First, check if we need to enable service role for admin-level access
    let serviceRoleClient;
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Create a direct Supabase client with service role to bypass RLS
      serviceRoleClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
    
    // Determine which client to use (service role or standard)
    const client = serviceRoleClient || supabase;
    
    const json = await request.json()
    const {
      name,
      subname,
      description,
      personality,
      scenario,
      first_mes,
      mes_example,
      creator_comment,
      tags,
      talkativeness,
      is_favorite,
      device_address,
      owner_address,
      per_api_call_fee,
      is_public,
      tools,
      tx_hash,
      metadata_url
    } = json

    // Prepare the agent data
    const agentData = {
      name,
      subname: subname?.toLowerCase() || '',
      description: description || '',
      personality: personality || '',
      scenario: scenario || '',
      first_mes: first_mes || '',
      mes_example: mes_example || '',
      creator_comment: creator_comment || '',
      tags: tags || [],
      talkativeness: talkativeness || 0.5,
      is_favorite: is_favorite || false,
      device_address: device_address?.toLowerCase() || '',
      owner_address: owner_address?.toLowerCase() || '',
      per_api_call_fee: per_api_call_fee || '0',
      is_public: is_public || false,
      tools: tools || [],
      tx_hash: tx_hash || '',
      metadata_url: metadata_url || '',
      created_at: new Date().toISOString()
    }

    // If you have RLS policies, we might need to use rpc functions or direct SQL instead
    // Option 1: Try the normal insert first
    let result;
    try {
      const { data, error } = await client
        .from('agents')
        .insert([agentData])
        .select()
        .single()

      if (error) throw error
      result = data;
    } catch (insertError) {
      console.log("Insert error with standard approach:", insertError);
      
      // Option 2: Try using a stored procedure if available
      try {
        const { data, error } = await client.rpc('create_agent', agentData);
        if (error) throw error;
        result = data;
      } catch (rpcError) {
        console.log("RPC error:", rpcError);
        
        // Option 3: Fall back to database level bypassing if authorized
        if (serviceRoleClient) {
          const { data, error } = await serviceRoleClient
            .from('agents')
            .insert([agentData])
            .select()
            .single();
            
          if (error) throw error;
          result = data;
        } else {
          throw new Error("Cannot bypass RLS policies - service role key not available");
        }
      }
    }

    return NextResponse.json(transformAgentData(result))

  } catch (error) {
    console.error('Error creating agent:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 })
  }
}

// Helper function to transform agent data to match contract indexer format
function transformAgentData(data: Agent) {
  return {
    id: data.id,
    name: data.name,
    subname: data.subname,
    description: data.description,
    personality: data.personality,
    scenario: data.scenario,
    firstMes: data.first_mes,
    mesExample: data.mes_example,
    creatorComment: data.creator_comment,
    tags: data.tags,
    talkativeness: data.talkativeness,
    isFavorite: data.is_favorite,
    deviceAddress: data.device_address,
    ownerAddress: data.owner_address,
    perApiCallFee: data.per_api_call_fee,
    isPublic: data.is_public,
    tools: data.tools,
    txHash: data.tx_hash,
    createdAt: data.created_at
  }
} 