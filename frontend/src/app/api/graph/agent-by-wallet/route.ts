// File: app/api/agents/by-owner/route.ts
import { graphClient } from '@/lib/graph';
import { gql } from '@apollo/client';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const walletAddress = searchParams.get('address');

        if (!walletAddress) {
            return new Response('{"status":"error"', {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const AGENTS_BY_DEVICE_QUERY = `
      query($deviceId: ID!) {
        agents(where: {deviceAddress: $deviceId}) {
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
          keyHash
          createdAt
          updatedAt
          owner {
            id
            serverWalletAddress
          }

        }
      }
    `;

        const { data } = await graphClient.query({
            query: gql(AGENTS_BY_DEVICE_QUERY),
            variables: {
                deviceId: walletAddress.toLowerCase()
            }
        });

        if (data.agents.length === 0) {
            return new Response('{"status":"error"', {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return NextResponse.json(data.agents[0]);
    } catch (error) {
        console.error('Error fetching agents by owner:', error);
        return NextResponse.json(
            { error: 'Failed to fetch agents by owner' },
            { status: 500 }
        );
    }
}