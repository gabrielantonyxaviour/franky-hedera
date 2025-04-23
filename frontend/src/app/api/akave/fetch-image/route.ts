import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    // Extract the URL from query parameters
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return new Response('URL parameter is required', { status: 400 });
    }

    try {
        // Fetch the image from the provided URL
        const response = await fetch(imageUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }

        // Get the image data and content type
        const imageData = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Return the image with the appropriate content type
        return new Response(imageData, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400'
            }
        });
    } catch (error) {
        return new Response(
            `Error processing image: ${error instanceof Error ? error.message : String(error)}`,
            { status: 500 }
        );
    }
}