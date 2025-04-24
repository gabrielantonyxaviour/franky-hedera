import { uploadJsonToPinata } from '@/utils/pinata';
import { NextResponse } from 'next/server';
export async function POST(request: Request) {
    try {
        const { json } = await request.json();
        const url = await uploadJsonToPinata(json)
        return NextResponse.json({
            success: true,
            url
        })
    } catch (e: any) {
        console.error('Error assigning devices:', e);
        return NextResponse.json(
            { error: e.message || 'Internal server error' },
            { status: 500 }
        );
    }
}