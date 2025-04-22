import { getJsonFromAkave } from '@/lib/akave';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const fileName = searchParams.get('file-name');
        const bucketName = searchParams.get('bucket-name');

        if (!fileName) {
            throw new Error('No file name provided');
        }

        if (!bucketName) {
            throw new Error('No bucket name provided');
        }

        const { data } = await getJsonFromAkave(fileName, bucketName);
        if (data) {
            return NextResponse.json(data);
        } else {
            throw new Error('No data found');
        }
    } catch (error) {
        return NextResponse.json({ error: error }, { status: 500 });
    }
}
