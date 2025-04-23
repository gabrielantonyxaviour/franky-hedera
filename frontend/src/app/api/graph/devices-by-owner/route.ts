// File: app/api/devices/by-owner/route.ts
import { graphClient } from '@/lib/graph';
import { gql } from '@apollo/client';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerAddress = searchParams.get('address');

    if (!ownerAddress) {
      return NextResponse.json(
        { error: 'Owner address is required' },
        { status: 400 }
      );
    }

    const DEVICES_BY_OWNER_QUERY = `
      query($id: ID!) {
        devices(where: { owner: $id }) {
          id
          deviceMetadata
          ngrokLink
          hostingFee
          agents {
            id
            subname
          }
          createdAt
          updatedAt
          owner {
            id
          }
        }
      }
    `;

    const { data } = await graphClient.query({
      query: gql(DEVICES_BY_OWNER_QUERY),
      variables: {
        id: ownerAddress.toLowerCase()
      }
    });

    return NextResponse.json(data.devices, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0'
      }
    });
  } catch (error) {
    console.error('Error fetching devices by owner:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices by owner' },
      { status: 500 }
    );
  }
}