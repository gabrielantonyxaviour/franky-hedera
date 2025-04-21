// File: app/api/agents/character/route.ts
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

        const AGENT_CHARACTER_QUERY = `
      query($agentId: ID!) {
        agents(where: {id: $agentId}, first: 1) {
          id
          characterConfig
        }
      }
    `;

        const { data } = await graphClient.query({
            query: gql(AGENT_CHARACTER_QUERY),
            variables: {
                agentId: agentAddress
            }
        });

        return NextResponse.json({
            characterConfig: data.agents[0]?.characterConfig || null
        });
    } catch (error) {
        console.error('Error fetching agent character:', error);
        return NextResponse.json(
            { error: 'Failed to fetch agent character' },
            { status: 500 }
        );
    }
}