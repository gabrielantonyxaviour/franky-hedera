// File: app/api/agents/details/route.ts
import { graphClient } from '@/lib/graph';
import { gql } from '@apollo/client';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const agentAddress = searchParams.get('address');

        if (!agentAddress) {
            return NextResponse.json(
                { error: 'Agent address is required' },
                { status: 400 }
            );
        }

        const AGENT_DETAILS_QUERY = `
      query($agentId: ID!) {
        agents(where: {id: $agentId}, first: 1) {
          id
          deviceAddress {
            id
            ngrokLink
            deviceMetadata
            hostingFee
          }
          owner {
            id
            serverWalletAddress
          }
          avatar
          subname
          perApiCallFee
          characterConfig
          isPublic
          keyHash
          createdAt
          updatedAt
        }
      }
    `;

        const { data } = await graphClient.query({
            query: gql(AGENT_DETAILS_QUERY),
            variables: {
                agentId: agentAddress
            }
        });

        return NextResponse.json(data.agents[0] || null);
    } catch (error) {
        console.error('Error fetching agent details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch agent details' },
            { status: 500 }
        );
    }
}