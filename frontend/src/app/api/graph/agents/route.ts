// File: app/api/agents/public/route.ts
import { graphClient } from '@/lib/graph';
import { gql } from '@apollo/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const PUBLIC_AGENTS_QUERY = `
      query {
        agents {
          id
          deviceAddress {
            id
          }
          owner {
            id
          }
          perApiCallFee
          characterConfig
          createdAt
          updatedAt
          isPublic
        }
      }
    `;

    const { data } = await graphClient.query({
      query: gql(PUBLIC_AGENTS_QUERY),
    });

    return NextResponse.json(data.agents, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0'
      }
    });
  } catch (error) {
    console.error('Error fetching public agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch public agents' },
      { status: 500 }
    );
  }
}