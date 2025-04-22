import { uploadFormData } from '@/lib/akave';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const bucketName = request.nextUrl.searchParams.get('bucket-name');

        if (!bucketName) {
            throw new Error('No bucket name provided');
        }

        const { data } = await uploadFormData(formData, bucketName);

        if (data) {
            return NextResponse.json(data);
        }
        else {
            throw new Error('No data found');
        }
    } catch (error) {
        return NextResponse.json({ error: error }, { status: 500 });
    }
}
