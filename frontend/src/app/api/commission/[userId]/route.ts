// app/api/commission/[userId]/route.ts
import { FRANKY_TOKEN_ADDRESS } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
) {
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();

    try {
        // Parse the request body
        const body = await request.json();
        const { amount } = body;

        // Validate required fields
        if (amount === undefined) {
            return NextResponse.json(
                { error: 'tokenAddress and amount are required' },
                { status: 400 }
            );
        }

        // Call the Metal API
        const response = await fetch(
            `https://api.metal.build/holder/${userId}/spend`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.METAL_API_KEY || 'YOUR-API-KEY',
                },
                body: JSON.stringify({
                    tokenAddress: FRANKY_TOKEN_ADDRESS,
                    amount,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const { success } = await response.json();

        return NextResponse.json({ success });
    } catch (error) {
        console.error('Error processing holder spend:', error);
        return NextResponse.json(
            { error: 'Failed to process spend request' },
            { status: 500 }
        );
    }
}