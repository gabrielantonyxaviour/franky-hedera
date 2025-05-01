import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export interface Agent {
  id: string;
  name: string;
  subname: string;
  description: string | null;
  personality: string | null;
  scenario: string | null;
  first_mes: string | null;
  mes_example: string | null;
  creator_comment: string | null;
  tags: string[];
  talkativeness: number | null;
  is_favorite: boolean;
  device_address: string;
  owner_address: string;
  per_api_call_fee: string;
  is_public: boolean;
  tools: string[];
  metadata_url: string;
  tx_hash: string;
  created_at: string;
  updated_at: string;
}

// GET /api/db/agents - Get all agents
export async function GET(request: Request) {
  console.log("GET /api/db/agents - Request received");
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const subname = searchParams.get("subname");

  try {
    if (subname) {
      console.log(`Fetching agent by subname: ${subname}`);
      // Get agent by subname
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("subname", subname.toLowerCase())
        .single();

      if (error) throw error;
      console.log(`Found agent with subname ${subname}`);

      return NextResponse.json(transformAgentData(data));
    }

    if (address) {
      console.log(`Fetching agents for address: ${address}`);
      // Get agent by device or owner address
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .or(
          `device_address.eq.${address.toLowerCase()},owner_address.eq.${address.toLowerCase()}`
        );

      if (error) throw error;
      console.log(`Found ${data.length} agents for address ${address}`);

      return NextResponse.json(data.map(transformAgentData));
    }

    console.log("Fetching all agents");
    // Get all agents
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    console.log(`Found ${data.length} total agents`);

    return NextResponse.json(data.map(transformAgentData));
  } catch (error) {
    console.error("Error in GET /api/db/agents:", error);
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
  console.log("POST /api/db/agents - Request received");
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
      tags = [],
      talkativeness,
      is_favorite = false,
      device_address,
      owner_address,
      per_api_call_fee,
      metadata_url,
      is_public = true,
      tools = [],
      tx_hash,
    } = json;

    console.log(`Creating new agent with subname: ${subname}`);
    console.log(
      JSON.stringify(
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
          metadata_url,
        },
        null,
        2
      )
    );
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
          metadata_url,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    console.log(`Successfully created agent with ID: ${data.id}`);

    return NextResponse.json(transformAgentData(data));
  } catch (error) {
    console.error("Error in POST /api/db/agents:", error);
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
    updatedAt: data.updated_at,
  };
}
