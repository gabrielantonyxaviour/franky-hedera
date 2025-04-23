import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    // Extract the URL from query parameters
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    console.log("Received Url")
    console.log(url)
    if (!url) {
        return Response.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    try {
        // Fetch data from the provided URL
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch from URL: ${response.status}`);
        }

        const data = await response.json();

        // Return the fetched data as JSON
        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: `Error processing request: ${error instanceof Error ? error.message : String(error)}` },
            { status: 500 }
        );
    }
}
