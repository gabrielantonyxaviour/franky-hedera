import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/db/devices - Get all devices
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  try {
    if (address) {
      // Get device by address
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("wallet_address", address.toLowerCase())
        .single();

      if (error) throw error;

      // Transform to match contract indexer format
      return NextResponse.json({
        id: data.id,
        deviceModel: data.device_model,
        ram: data.ram,
        storage: data.storage,
        cpu: data.cpu,
        ngrokUrl: data.ngrok_url,
        walletAddress: data.wallet_address,
        hostingFee: data.hosting_fee,
        agentCount: data.agent_count,
        status: data.status,
        lastActive: data.last_active,
        txHash: data.tx_hash,
        registeredAt: data.registered_at,
      });
    }

    // Get all devices
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .order("registered_at", { ascending: false });

    if (error) throw error;

    // Transform to match contract indexer format
    const transformedData = data.map((device: any) => ({
      id: device.id,
      deviceModel: device.device_model,
      ram: device.ram,
      storage: device.storage,
      cpu: device.cpu,
      ngrokUrl: device.ngrok_url,
      walletAddress: device.wallet_address,
      hostingFee: device.hosting_fee,
      agentCount: device.agent_count,
      status: device.status,
      lastActive: device.last_active,
      txHash: device.tx_hash,
      registeredAt: device.registered_at,
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/db/devices - Create new device record
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const {
      deviceModel,
      ram,
      storage,
      cpu,
      ngrokUrl,
      walletAddress,
      hostingFee,
      txHash,
    } = json;

    const { data, error } = await supabase
      .from("devices")
      .insert([
        {
          device_model: deviceModel,
          ram,
          storage,
          cpu,
          ngrok_url: ngrokUrl,
          wallet_address: walletAddress.toLowerCase(),
          hosting_fee: hostingFee,
          tx_hash: txHash,
          status: "Active",
          agent_count: 0,
          last_active: new Date().toISOString(),
          registered_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
