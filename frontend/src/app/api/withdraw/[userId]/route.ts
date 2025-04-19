import { FRANKY_TOKEN_ADDRESS } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest
) {
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();

    try {
        // Parse the request body
        const body = await request.json();
        const { amount, toAddress } = body;

        // Validate required fields
        if (amount === undefined || !toAddress) {
            return NextResponse.json(
                { error: 'tokenAddress, amount, and toAddress are required' },
                { status: 400 }
            );
        }

        // Call the Metal API
        const response = await fetch(
            `https://api.metal.build/holder/${userId}/withdraw`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.METAL_API_KEY || 'YOUR-API-KEY',
                },
                body: JSON.stringify({
                    tokenAddress: FRANKY_TOKEN_ADDRESS,
                    amount,
                    toAddress,
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(
                `API request failed with status ${response.status}${errorData ? `: ${JSON.stringify(errorData)}` : ''
                }`
            );
        }

        const { success } = await response.json();

        return NextResponse.json({ success });
    } catch (error) {
        console.error('Error processing holder withdrawal:', error);
        return NextResponse.json(
            { error: 'Failed to process withdrawal request' },
            { status: 500 }
        );
    }
}