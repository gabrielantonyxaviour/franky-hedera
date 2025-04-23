// File: app/api/devices/available/route.ts
import { graphClient } from '@/lib/graph';
import { gql } from '@apollo/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const AVAILABLE_DEVICES_QUERY = `
      query {
        devices {
          id
          owner {
            id
          }
          deviceMetadata
          ngrokLink
          hostingFee
          createdAt
          updatedAt
          agents {
            id
            characterConfig
          }
        }
      }
    `;

    const { data } = await graphClient.query({
      query: gql(AVAILABLE_DEVICES_QUERY),
    });
    console.log('Available devices:', data.devices);
    return NextResponse.json(data.devices, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0'
      }
    });
  } catch (error) {
    console.error('Error fetching available devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available devices' },
      { status: 500 }
    );
  }
}