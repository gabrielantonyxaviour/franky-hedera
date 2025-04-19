import { NextRequest, NextResponse } from "next/server";
import { FRANKY_TOKEN_ADDRESS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const { address } = await request.json();
  try {
    console.log("Received address:", address);
    console.log(
      "https://api.metal.build/token/" + FRANKY_TOKEN_ADDRESS + "/distribute"
    );
    console.log(process.env.METAL_API_KEY);
    console.log("API request body:");
    console.log({
      sendToAddress: address,
      amount: 69,
    });

    const response = await fetch(
      "https://api.metal.build/token/" + FRANKY_TOKEN_ADDRESS + "/distribute",
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.METAL_API_KEY || "YOUR-API-KEY",
        },
        method: "POST",
        body: JSON.stringify({
          sendToAddress: address,
          amount: 69,
        }),
      }
    );

    // if (!response.ok) {
    //   throw new Error(`API request failed with status ${response.status}`);
    // }

    const data = await response.json();
    console.log("API response data:", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("API request error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
