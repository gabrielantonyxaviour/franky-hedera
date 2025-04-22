// File: app/api/agents/key-hash/route.ts
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

        const AGENT_KEY_HASH_QUERY = `
      query($agentId: ID!) {
        agents(where: {id: $agentId}, first: 1) {
          id
          keyHash
        }
      }
    `;

        const { data } = await graphClient.query({
            query: gql(AGENT_KEY_HASH_QUERY),
            variables: {
                agentId: agentAddress
            }
        });

        return NextResponse.json({
            keyHash: data.agents[0]?.keyHash || null
        });
    } catch (error) {
        console.error('Error fetching agent key hash:', error);
        return NextResponse.json(
            { error: 'Failed to fetch agent key hash' },
            { status: 500 }
        );
    }
}