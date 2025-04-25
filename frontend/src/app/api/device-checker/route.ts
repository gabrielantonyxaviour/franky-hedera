import { NextResponse } from 'next/server';
import { hcsService } from '@/lib/services/hcs-service';

// Fetch devices from the graph API
async function fetchDevices(limit: number) {
    try {
        const response = await fetch('https://www.frankyagent.xyz/api/graph/devices');
        if (!response.ok) {
            throw new Error(`Failed to fetch devices: ${response.status}`);
        }
        const devices = await response.json();
        return devices.slice(0, limit); // Respect the limit parameter
    } catch (error) {
        console.error('Error fetching devices:', error);
        throw error;
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const deviceAddress = searchParams.get('deviceAddress');
        const numRetrievals = parseInt(searchParams.get('numRetrievals') || '5', 10);

        if (deviceAddress && !/^0x[a-fA-F0-9]{40}$/.test(deviceAddress)) {
            return NextResponse.json(
                { error: 'Invalid device address format' },
                { status: 400 }
            );
        }

        // Make sure HCS topics are initialized
        await hcsService.initializeTopics();

        // Fetch devices using the graph API
        const allDevices = await fetchDevices(deviceAddress ? 1 : 10);

        // Filter by device address if provided
        const devices = deviceAddress
            ? allDevices.filter((d: any) => d.id.toLowerCase() === deviceAddress.toLowerCase())
            : allDevices;

        if (!devices || devices.length === 0) {
            return NextResponse.json(
                { error: 'No devices found' },
                { status: 404 }
            );
        }

        // Get reputation data for each device from HCS
        const results = await Promise.all(devices.map(async (device: any) => {
            try {
                // If the device has no agents, skip it
                if (!device.agents || device.agents.length === 0) {
                    return {
                        deviceAddress: device.id,
                        ngrokLink: device.ngrokLink,
                        status: 'skipped',
                        reason: 'No agents found for this device',
                        reputationScore: 0,
                        checked: new Date().toISOString()
                    };
                }

                // Get device reputation from HCS
                const reputationData = await hcsService.getDeviceReputation(device.id, numRetrievals);

                if (reputationData.status === 'error' || reputationData.status === 'unknown') {
                    return {
                        deviceAddress: device.id,
                        ngrokLink: device.ngrokLink,
                        status: reputationData.status,
                        reason: reputationData.message,
                        reputationScore: 0,
                        checked: new Date().toISOString()
                    };
                }

                // Format the result
                return {
                    deviceAddress: device.id,
                    ngrokLink: device.ngrokLink,
                    status: 'checked',
                    reputationScore: reputationData.reputationScore.score, 
                    retrievalStats: {
                        successRate: reputationData.reputationScore.successRate || 0,
                        averageResponseTime: reputationData.reputationScore.responseTime || 0,
                        consistency: 0, // Derived from HCS data
                        totalChecks: reputationData.checkCount || 0,
                        lastSeen: reputationData.lastChecked
                    },
                    consensusDetails: {
                        checkerCount: reputationData.reputationScore.checkerCount,
                        consensusMethod: reputationData.reputationScore.consensus,
                        topicId: await hcsService.getDeviceTopicMapping(device.id)
                    },
                    checked: reputationData.lastChecked
                };
            } catch (error: any) {
                console.error(`Error processing device ${device.id}:`, error);
                return {
                    deviceAddress: device.id,
                    ngrokLink: device.ngrokLink || 'unknown',
                    status: 'error',
                    error: error.message || 'Unknown error',
                    reputationScore: 0,
                    checked: new Date().toISOString()
                };
            }
        }));

        return NextResponse.json({
            system: 'Hedera Consensus Service',
            timestamp: new Date().toISOString(),
            results
        });

    } catch (error: any) {
        console.error('Error in device-checker API:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
} 