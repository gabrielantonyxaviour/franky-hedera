// app/api/holder/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
    request: NextRequest
) {
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();

    try {
        // Call the Metal API to update the holder
        const response = await fetch(`https://api.metal.build/holder/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.METAL_API_KEY || 'YOUR-API-KEY',
            },
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const holderData = await response.json();

        return NextResponse.json(holderData);
    } catch (error) {
        console.error('Error updating holder:', error);
        return NextResponse.json(
            { error: 'Failed to update holder' },
            { status: 500 }
        );
    }
}