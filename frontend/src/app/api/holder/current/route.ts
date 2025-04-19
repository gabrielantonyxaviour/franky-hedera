import { NextRequest, NextResponse } from 'next/server';
import { FRANKY_TOKEN_ADDRESS } from '@/lib/constants';

export async function GET(request: NextRequest) {
    try {
        // Get the wallet address from query parameter
        const { searchParams } = new URL(request.url);
        const walletAddress = searchParams.get('address');
        
        if (!walletAddress) {
            console.log('[Metal API] Error: No wallet address provided');
            return NextResponse.json(
                { error: 'No wallet address provided' },
                { status: 401 }
            );
        }

        console.log(`[Metal API] Creating/Getting holder for wallet: ${walletAddress}`);
        console.log(`[Metal API] Request URL: https://api.metal.build/holder/${walletAddress}`);
        console.log('[Metal API] Request body:', {
            tokens: [{
                address: FRANKY_TOKEN_ADDRESS,
                balance: 0
            }]
        });

        // Use the wallet address as the userId for Metal
        const response = await fetch(
            `https://api.metal.build/holder/${walletAddress}`,
            {
                method: 'PUT', // PUT will get or create the holder
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.METAL_API_KEY || '',
                },
                body: JSON.stringify({
                    tokens: [{
                        address: FRANKY_TOKEN_ADDRESS,
                        balance: 0 // Initial balance
                    }]
                })
            }
        );

        if (!response.ok) {
            console.error(`[Metal API] Holder creation/fetch failed with status ${response.status}`);
            console.error('[Metal API] Response:', await response.text());
            throw new Error(`API request failed with status ${response.status}`);
        }

        const holderData = await response.json();
        console.log('[Metal API] Holder response:', holderData);

        console.log(`[Metal API] Fetching token details for: ${FRANKY_TOKEN_ADDRESS}`);
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
            console.error(`[Metal API] Token fetch failed with status ${tokenResponse.status}`);
            console.error('[Metal API] Token Response:', await tokenResponse.text());
            throw new Error(`Token API request failed with status ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('[Metal API] Token data:', tokenData);

        const holderBalance = holderData.tokens?.find((t: any) => t.address === FRANKY_TOKEN_ADDRESS)?.balance || 0;
        const usdValue = holderBalance * tokenData.price;

        console.log('[Metal API] Calculated values:', {
            balance: holderBalance,
            usdValue,
            tokenSymbol: tokenData.symbol,
            tokenName: tokenData.name
        });

        // Return combined holder and token data
        return NextResponse.json({
            id: holderData.id,
            address: holderData.address,
            balance: holderBalance,
            usdValue: usdValue,
            tokenSymbol: tokenData.symbol,
            tokenName: tokenData.name
        });
    } catch (error) {
        console.error('[Metal API] Unexpected error:', error);
        if (error instanceof Error) {
            console.error('[Metal API] Error details:', {
                message: error.message,
                stack: error.stack
            });
        }
        return NextResponse.json(
            { error: 'Failed to fetch holder' },
            { status: 500 }
        );
    }
} 