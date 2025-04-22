import { uploadCharacterToAkave, uploadJsonToAkaveWithFileName } from '@/lib/akave';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        if (!body.character || !body.subname || !body.secrets) {
            throw new Error('Missing required fields: character, subname, or secrets');
        }
        const { character, subname, secrets } = body;

        const characterConfigUrl = await uploadCharacterToAkave(character, subname, secrets)

        if (characterConfigUrl) {
            return NextResponse.json({ characterConfigUrl });
        } else {
            throw new Error('No file name found');
        }
    } catch (error) {
        return NextResponse.json({ error: error }, { status: 500 });
    }
}
