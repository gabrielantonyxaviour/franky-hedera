import { uploadJsonToAkaveWithFileName } from '@/lib/akave';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { jsonData, bucketName, userAddress } = body;

        if (!jsonData) {
            throw new Error('No JSON data provided');
        }

        if (!bucketName) {
            throw new Error('No bucket name provided');
        }

        if (!userAddress) {
            throw new Error('No user address provided');
        }

        const { fileName } = await uploadJsonToAkaveWithFileName(jsonData, userAddress as `0x${string}`, bucketName)

        if (fileName) {
            return NextResponse.json({ fileName });
        } else {
            throw new Error('No file name found');
        }
    } catch (error) {
        return NextResponse.json({ error: error }, { status: 500 });
    }
}
