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
      query($ownerId: ID!) {
        devices(where: {owner: $ownerId}) {
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
        }
      }
    `;

        const { data } = await graphClient.query({
            query: gql(DEVICES_BY_OWNER_QUERY),
            variables: {
                ownerId: ownerAddress
            }
        });

        return NextResponse.json(data.devices);
    } catch (error) {
        console.error('Error fetching devices by owner:', error);
        return NextResponse.json(
            { error: 'Failed to fetch devices by owner' },
            { status: 500 }
        );
    }
}