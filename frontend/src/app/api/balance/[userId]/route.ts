import { NextRequest, NextResponse } from 'next/server';
import { FRANKY_TOKEN_ADDRESS } from '@/lib/constants';

export async function GET(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        // First get the holder's data from Metal
        const response = await fetch(
            `https://api.metal.build/holder/${params.userId}`,
            {
                headers: {
                    'x-api-key': process.env.METAL_API_KEY || '',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const holderData = await response.json();

        // Get token details to include price information
        const tokenResponse = await fetch(
            `https://api.metal.build/token/${FRANKY_TOKEN_ADDRESS}`,
            {
                headers: {
                    'x-api-key': process.env.METAL_API_KEY || '',
                },
            }
        );

        if (!tokenResponse.ok) {
            throw new Error(`Token API request failed with status ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();

        // Return combined holder and token data
        return NextResponse.json({
            balance: holderData.balance,
            usdValue: holderData.balance * tokenData.price,
            tokenSymbol: tokenData.symbol,
            tokenName: tokenData.name,
            holderAddress: holderData.address
        });
    } catch (error) {
        console.error('Error fetching balance:', error);
        return NextResponse.json(
            { error: 'Failed to fetch balance' },
            { status: 500 }
        );
    }
} 