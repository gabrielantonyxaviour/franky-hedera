import { NextResponse } from 'next/server';
import { hcsService } from '@/lib/services/hcs-service';

// Interface for device metadata (from Pinata URL)
interface DeviceMetadata {
  deviceModel: string;
  ram: string;
  storage: string;
  cpu: string;
  owner: string;
  deviceAddress: string;
  ngrokUrl: string;
  [key: string]: any;
}

/**
 * Fetch and parse device metadata from Pinata URL
 * @param metadataUrl The Pinata URL to fetch metadata from
 * @returns Parsed metadata object
 */
async function fetchDeviceMetadata(metadataUrl: string): Promise<DeviceMetadata | null> {
  try {
    console.log(`Fetching device metadata from ${metadataUrl}`);
    const response = await fetch(metadataUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch metadata: ${response.status}`);
      return null;
    }
    
    const metadata = await response.json();
    console.log('Fetched device metadata:', metadata);
    return metadata;
  } catch (error) {
    console.error('Error fetching device metadata:', error);
    return null;
  }
}

// Fetch devices from Supabase
async function fetchDevices(limit: number) {
    try {
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/db/devices`);
        if (!response.ok) {
            throw new Error(`Failed to fetch devices: ${response.status}`);
        }
        const devices = await response.json();
        
        // Transform Supabase response to match existing format
        const transformedDevices = devices.map((device: any) => ({
            id: device.walletAddress,
            deviceMetadata: device.metadata_url,
            ngrokLink: device.ngrokUrl,
            agents: [], // This will be populated if needed
            // Add any other fields needed by the device checker
        }));
        
        return transformedDevices.slice(0, limit); // Respect the limit parameter
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

        // Fetch devices using Supabase
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
                // Fetch metadata if available
                let metadata = null;
                let ngrokUrl = device.ngrokLink;
                
                if (device.deviceMetadata) {
                    metadata = await fetchDeviceMetadata(device.deviceMetadata);
                    if (metadata && metadata.ngrokUrl) {
                        ngrokUrl = metadata.ngrokUrl;
                    }
                }
                
                // Get device reputation from HCS
                const reputationData = await hcsService.getDeviceReputation(device.id, numRetrievals);

                if (reputationData.status === 'error' || reputationData.status === 'unknown') {
                    return {
                        deviceAddress: device.id,
                        ngrokLink: ngrokUrl,
                        deviceMetadata: device.deviceMetadata,
                        metadata: metadata,
                        status: reputationData.status,
                        reason: reputationData.message,
                        reputationScore: 0,
                        checked: new Date().toISOString()
                    };
                }

                // Format the result
                return {
                    deviceAddress: device.id,
                    ngrokLink: ngrokUrl,
                    deviceMetadata: device.deviceMetadata,
                    metadata: metadata,
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
                        topicId: reputationData.topicId
                    },
                    checked: reputationData.lastChecked
                };
            } catch (error: any) {
                console.error(`Error processing device ${device.id}:`, error);
                return {
                    deviceAddress: device.id,
                    ngrokLink: device.ngrokLink || 'unknown',
                    deviceMetadata: device.deviceMetadata,
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