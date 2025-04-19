// app/api/commission/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

export async function POST(
    request: NextRequest,
) {
    const {address} = await request.json();
    const privateKey = process.env.PRIVATE_KEY;
    if(!privateKey) {
        return NextResponse.json({ error: 'PRIVATE_KEY is not set' }, { status: 500 });
    }

    if(!address) {
        return NextResponse.json({ error: 'Address is not set' }, { status: 400 });
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http(),
    });

    const txHash = await walletClient.sendTransaction({ 
            to: address,
            value: parseEther('0.00055'),
    });

    return NextResponse.json({ txHash });


}