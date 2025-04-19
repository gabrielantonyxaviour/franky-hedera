import { NextResponse } from "next/server";
import { FRANKY_TOKEN_ADDRESS } from "@/lib/constants";

export async function GET() {
  try {
    const response = await fetch(
      "https://api.metal.build/token/" + FRANKY_TOKEN_ADDRESS,
      {
        headers: {
          "x-api-key": process.env.METAL_API_KEY || "YOUR-API-KEY",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("API request error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
