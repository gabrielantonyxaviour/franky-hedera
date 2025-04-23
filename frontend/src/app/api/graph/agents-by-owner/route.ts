// File: app/api/agents/by-owner/route.ts
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

    const AGENTS_BY_OWNER_QUERY = `
      query($ownerId: ID!) {
        agents(where: { owner: $ownerId }) {
          id
          deviceAddress {
            id
            ngrokLink
          }
          avatar
          subname
          perApiCallFee
          characterConfig
          isPublic
          createdAt
          updatedAt
          owner {
            id
          }
        }
      }
    `;

    const { data } = await graphClient.query({
      query: gql(AGENTS_BY_OWNER_QUERY),
      variables: {
        ownerId: ownerAddress.toLowerCase()
      }
    });

    return NextResponse.json(data.agents, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0'
      }
    });
  } catch (error) {
    console.error('Error fetching agents by owner:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents by owner' },
      { status: 500 }
    );
  }
}