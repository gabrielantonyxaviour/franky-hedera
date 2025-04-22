// File: app/api/devices/details/route.ts
import { graphClient } from '@/lib/graph';
import { gql } from '@apollo/client';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const deviceAddress = searchParams.get('address');

        if (!deviceAddress) {
            return NextResponse.json(
                { error: 'Device address is required' },
                { status: 400 }
            );
        }

        const DEVICE_DETAILS_QUERY = `
      query($deviceId: ID!) {
        devices(where: {id: $deviceId}, first: 1) {
          id
          owner {
            id
            serverWalletAddress
          }
          deviceMetadata
          ngrokLink
          hostingFee
          agents {
            id
            subname
            avatar
            isPublic
            perApiCallFee
          }
          createdAt
          updatedAt
        }
      }
    `;

        const { data } = await graphClient.query({
            query: gql(DEVICE_DETAILS_QUERY),
            variables: {
                deviceId: deviceAddress
            }
        });

        return NextResponse.json(data.devices[0] || null);
    } catch (error) {
        console.error('Error fetching device details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch device details' },
            { status: 500 }
        );
    }
}