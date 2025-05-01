import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export interface Agent {
  id: string;
  name: string;
  subname: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_comment: string;
  tags: string[];
  talkativeness: number;
  is_favorite: boolean;
  device_address: string;
  owner_address: string;
  per_api_call_fee: string;
  is_public: boolean;
  tools: string[];
  tx_hash: string;
  created_at: string;
}

// GET /api/db/agents - Get all agents
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const subname = searchParams.get("subname");

  try {
    const supabase = await getSupabaseClient()
    
    if (subname) {
      // Get agent by subname
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("subname", subname.toLowerCase())
        .single();

      if (error) throw error;

      return NextResponse.json(transformAgentData(data));
    }

    if (address) {
      // Get agent by device or owner address
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .or(
          `device_address.eq.${address.toLowerCase()},owner_address.eq.${address.toLowerCase()}`
        );

      if (error) throw error;

      return NextResponse.json(data.map(transformAgentData));
    }

    // Get all agents
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data.map(transformAgentData));
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unknown error occurred" },
      { status: 500 }
    );
  }
}

// POST /api/db/agents - Create new agent record
export async function POST(request: Request) {
  try {
    const json = await request.json();
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
    } = json;

    const { data, error } = await supabase
      .from("agents")
      .insert([
        {
          name,
          subname: subname.toLowerCase(),
          description,
          personality,
          scenario,
          first_mes,
          mes_example,
          creator_comment,
          tags,
          talkativeness,
          is_favorite,
          device_address: device_address.toLowerCase(),
          owner_address: owner_address.toLowerCase(),
          per_api_call_fee,
          is_public,
          tools,
          tx_hash,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformAgentData(data));
  } catch (error) {
    console.error('Error creating agent:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unknown error occurred" },
      { status: 500 }
    );
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
    createdAt: data.created_at,
  };
}
