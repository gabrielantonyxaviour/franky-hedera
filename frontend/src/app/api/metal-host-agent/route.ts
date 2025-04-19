import { FRANKY_TOKEN_ADDRESS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId, deviceOwner, amount } = await request.json();

    const spendRequest = await fetch(
      `https://api.metal.build/holder/${userId}/spend`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.METAL_API_KEY || "YOUR-API-KEY",
        },
        body: JSON.stringify({
          tokenAddress: FRANKY_TOKEN_ADDRESS,
          amount: amount * 0.1,
        }),
      }
    );
    const spendResponse = await spendRequest.json();
    // Call the Metal API
    const withdrawRequest = await fetch(
      `https://api.metal.build/holder/${userId}/withdraw`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.METAL_API_KEY || "YOUR-API-KEY",
        },
        body: JSON.stringify({
          tokenAddress: FRANKY_TOKEN_ADDRESS,
          toAddress: deviceOwner,
          amount: amount * 0.9,
        }),
      }
    );

    const data = await withdrawRequest.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error processing holder withdrawal:", error);
    return NextResponse.json(
      { error: "Failed to process withdrawal request" },
      { status: 500 }
    );
  }
}
