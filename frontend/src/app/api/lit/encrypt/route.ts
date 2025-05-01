import { NextResponse } from 'next/server';
import { encryptEnv } from '@/utils/lit';

export async function POST(request: Request) {
    try {
        const { secrets } = await request.json();

        if (!secrets) {
            return NextResponse.json(
                { error: 'Secrets are required' },
                { status: 400 }
            );
        }

        // Convert secrets object to string
        const secretsString = JSON.stringify(secrets);

        const { ciphertext, dataToEncryptHash } = await encryptEnv(secretsString);

        return NextResponse.json({
            success: true,
            ciphertext,
            dataToEncryptHash
        });
    } catch (e: any) {
        console.error('Error encrypting secrets:', e);
        return NextResponse.json(
            { error: e.message || 'Internal server error' },
            { status: 500 }
        );
    }
} 