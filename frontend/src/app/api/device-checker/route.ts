// import { NextResponse } from 'next/server';
// import { publicClient } from '@/lib/utils';
// import { FRANKY_ABI, FRANKY_ADDRESS } from '@/lib/constants';

// // Checker Subnet Configuration
// const CHECKER_SUBNET_NAME = 'franky-device-checker';
// const CHECKER_SUBNET_VERSION = '1.0.0';
// const AKAVE_API_URL = 'http://3.88.107.110:8000';
// const DEVICE_REPUTATION_BUCKET = 'device-reputation';

// // API Endpoints
// const DEVICES_API_ENDPOINT = 'https://www.frankyagent.xyz/api/graph/devices';
// const CHARACTER_API_ENDPOINT = 'https://www.frankyagent.xyz/api/graph/character';

// // Function to fetch registered devices
// async function fetchDevices(limit: number) {
//   try {
//     const response = await fetch(DEVICES_API_ENDPOINT);
//     if (!response.ok) {
//       throw new Error(`Failed to fetch devices: ${response.status}`);
//     }
//     const devices = await response.json();
//     return devices.slice(0, limit); // Respect the limit parameter
//   } catch (error) {
//     console.error('Error fetching devices:', error);
//     throw error;
//   }
// }


// // Function to calculate reputation score with weights
// function calculateReputationScore(retrievalResults: any[]) {
//   if (!retrievalResults.length) return 0;

//   // Weights for different metrics
//   const WEIGHTS = {
//     SUCCESS_RATE: 0.6,    // 60% weight for success rate
//     RESPONSE_TIME: 0.25,  // 25% weight for response time
//     CONSISTENCY: 0.15     // 15% weight for consistency
//   };

//   const successfulRetrievals = retrievalResults.filter(r => r.success).length;
//   const successRate = successfulRetrievals / retrievalResults.length;

//   const successfulDurations = retrievalResults
//     .filter(r => r.success)
//     .map(r => r.duration);

//   let responseTimeScore = 0;
//   let avgResponseTime = 0;

//   if (successfulDurations.length > 0) {
//     avgResponseTime = successfulDurations.reduce((sum, duration) => sum + duration, 0) / successfulDurations.length;

//     // Response time scoring based on latency thresholds
//     if (avgResponseTime < 500) responseTimeScore = 1.0;      // Excellent: < 500ms
//     else if (avgResponseTime < 1000) responseTimeScore = 0.9; // Very Good: < 1s
//     else if (avgResponseTime < 2000) responseTimeScore = 0.8; // Good: < 2s
//     else if (avgResponseTime < 5000) responseTimeScore = 0.6; // Fair: < 5s
//     else responseTimeScore = 0.4;                            // Poor: >= 5s
//   }

//   // Calculate consistency score using standard deviation
//   let consistencyScore = 1.0;
//   if (successfulDurations.length > 1) {
//     const mean = avgResponseTime;
//     const squaredDiffs = successfulDurations.map(d => Math.pow(d - mean, 2));
//     const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / successfulDurations.length;
//     const stdDev = Math.sqrt(variance);
//     const normalizedStdDev = Math.min(stdDev / mean, 1);
//     consistencyScore = 1 - normalizedStdDev;
//   }

//   // Calculate final weighted score
//   const finalScore = (
//     (successRate * WEIGHTS.SUCCESS_RATE) +
//     (responseTimeScore * WEIGHTS.RESPONSE_TIME) +
//     (consistencyScore * WEIGHTS.CONSISTENCY)
//   ) * 100;

//   return Math.round(finalScore * 100) / 100;
// }

// // Function to ensure bucket exists
// async function ensureBucket() {
//   try {
//     // Check if bucket exists
//     const checkResponse = await fetch(`${AKAVE_API_URL}/buckets/${DEVICE_REPUTATION_BUCKET}`);
//     const checkData = await checkResponse.json();

//     if (!checkResponse.ok || !checkData.success) {
//       // Create bucket if it doesn't exist
//       const createResponse = await fetch(`${AKAVE_API_URL}/buckets`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ bucketName: DEVICE_REPUTATION_BUCKET })
//       });

//       const createData = await createResponse.json();
//       if (!createResponse.ok || !createData.success) {
//         throw new Error(`Failed to create bucket: ${createData.error || createResponse.status}`);
//       }

//       console.log(`Created new bucket: ${DEVICE_REPUTATION_BUCKET}`);
//     }
//   } catch (error: any) {
//     console.error('Error ensuring bucket exists:', error);
//     throw error;
//   }
// }

// // Function to calculate latency percentiles
// function calculateLatencyPercentiles(durations: number[]) {
//   if (!durations.length) return { p50: 0, p95: 0, p99: 0 };
//   const sorted = [...durations].sort((a, b) => a - b);
//   return {
//     p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
//     p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
//     p99: sorted[Math.floor(sorted.length * 0.99)] || 0
//   };
// }

// // Function to store reputation data in Akave (which stores on Filecoin)
// async function storeReputationData(deviceAddress: string, reputationData: any) {
//   const MAX_RETRIES = 3;
//   const INITIAL_DELAY = 1000; // 1 second

//   for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
//     try {
//       // Ensure bucket exists before uploading
//       await ensureBucket();

//       // Add checker subnet metadata
//       const dataWithMetadata = {
//         ...reputationData,
//         _checkerMetadata: {
//           subnet: CHECKER_SUBNET_NAME,
//           version: CHECKER_SUBNET_VERSION,
//           timestamp: new Date().toISOString(),
//           verificationMethod: 'character-retrieval',
//           storageProtocol: 'filecoin',
//           metrics: {
//             successRate: { weight: 0.6, description: 'Rate of successful character data retrievals' },
//             responseTime: { weight: 0.25, description: 'Average response time for successful retrievals' },
//             consistency: { weight: 0.15, description: 'Consistency of response times' }
//           }
//         }
//       };

//       // Create a clean copy of the data
//       const cleanData = JSON.parse(JSON.stringify(dataWithMetadata));
//       const jsonData = JSON.stringify(cleanData, null, 2);
//       const filename = `${deviceAddress.toLowerCase()}-${Date.now()}.json`;

//       // Create form data with proper buffering and content type
//       const formData = new FormData();
//       const blob = new Blob([jsonData], { type: 'application/json' });
//       formData.append('file', blob, filename);

//       // Upload file to bucket with increased timeout
//       const uploadResponse = await fetch(`${AKAVE_API_URL}/buckets/${DEVICE_REPUTATION_BUCKET}/files`, {
//         method: 'POST',
//         body: formData,
//         headers: {
//           'Accept': 'application/json'
//         },
//         // Increase timeout for Filecoin transactions
//         signal: AbortSignal.timeout(30000) // 30 seconds timeout
//       });

//       const uploadData = await uploadResponse.json();
//       if (!uploadResponse.ok || !uploadData.success) {
//         const error = uploadData.error || uploadResponse.status;
//         if (error.includes('replacement transaction underpriced') && attempt < MAX_RETRIES - 1) {
//           // Wait with exponential backoff before retrying
//           const delay = INITIAL_DELAY * Math.pow(2, attempt);
//           console.log(`Retry attempt ${attempt + 1}/${MAX_RETRIES} after ${delay}ms delay...`);
//           await new Promise(resolve => setTimeout(resolve, delay));
//           continue;
//         }
//         throw new Error(`Failed to upload reputation data: ${error}`);
//       }

//       // Return download URL for the file
//       const downloadUrl = `${AKAVE_API_URL}/buckets/${DEVICE_REPUTATION_BUCKET}/files/${filename}/download`;
//       return { success: true, url: downloadUrl };

//     } catch (error: any) {
//       if (attempt === MAX_RETRIES - 1) {
//         console.error('Error storing reputation data:', error);
//         return { success: false, error: error.message };
//       }

//       // Wait before retrying on unexpected errors
//       const delay = INITIAL_DELAY * Math.pow(2, attempt);
//       console.log(`Unexpected error, retry attempt ${attempt + 1}/${MAX_RETRIES} after ${delay}ms delay...`);
//       await new Promise(resolve => setTimeout(resolve, delay));
//     }
//   }

//   return { success: false, error: 'Max retries exceeded' };
// }

// // Function to check device availability and character data
// async function checkDeviceAvailability(characterUrl: string) {
//   try {
//     const startTime = Date.now();
//     const response = await fetch(characterUrl, {
//       method: 'GET',
//       headers: { 'Accept': 'application/json' }
//     });

//     const endTime = Date.now();
//     const duration = endTime - startTime;

//     let success = false;
//     let data = null;

//     if (response.ok) {
//       try {
//         data = await response.json();
//         success = true;
//       } catch (e) {
//         success = false;
//       }
//     }

//     return {
//       success,
//       status: response.status,
//       statusText: success ? 'OK' : response.statusText,
//       duration,
//       data,
//       timestamp: new Date().toISOString()
//     };
//   } catch (error: any) {
//     return {
//       success: false,
//       status: 0,
//       statusText: error.message || 'Unknown error',
//       duration: 0,
//       data: null,
//       timestamp: new Date().toISOString()
//     };
//   }
// }

// export async function GET(request: Request) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const deviceAddress = searchParams.get('deviceAddress');
//     const numRetrievals = parseInt(searchParams.get('numRetrievals') || '5', 10);

//     if (deviceAddress && !/^0x[a-fA-F0-9]{40}$/.test(deviceAddress)) {
//       return NextResponse.json(
//         { error: 'Invalid device address format' },
//         { status: 400 }
//       );
//     }

//     // Fetch devices using our new function
//     const allDevices = await fetchDevices(deviceAddress ? 1 : 10);

//     // Filter by device address if provided
//     const devices = deviceAddress
//       ? allDevices.filter((d: any) => d.id.toLowerCase() === deviceAddress.toLowerCase())
//       : allDevices;

//     if (!devices || devices.length === 0) {
//       return NextResponse.json(
//         { error: 'No devices found' },
//         { status: 404 }
//       );
//     }

//     const results = await Promise.all(devices.map(async (device: any) => {
//       try {
//         if (!device.agents || device.agents.length === 0) {
//           return {
//             deviceAddress: device.id,
//             ngrokLink: device.ngrokLink,
//             status: 'skipped',
//             reason: 'No agents found for this device',
//             reputationScore: 0,
//             checked: new Date().toISOString()
//           };
//         }

//         const agent = device.agents[0];
//         const retrievalResults = [];

//         for (let i = 0; i < numRetrievals; i++) {
//           const result = await checkDeviceAvailability(agent.characterConfig);
//           retrievalResults.push(result);
//           if (i < numRetrievals - 1) await new Promise(r => setTimeout(r, 1000));
//         }

//         const reputationScore = calculateReputationScore(retrievalResults);

//         const successfulResults = retrievalResults.filter(r => r.success);
//         const startTime = new Date(retrievalResults[0].timestamp).getTime();
//         const endTime = new Date(retrievalResults[retrievalResults.length - 1].timestamp).getTime();
//         const durations = successfulResults.map(r => r.duration);
//         const avgTime = durations.length ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

//         // Calculate consistency score
//         const variance = durations.length > 1
//           ? durations.reduce((sum, d) => sum + Math.pow(d - avgTime, 2), 0) / durations.length
//           : 0;
//         const consistency = Math.sqrt(variance);

//         const reputationData = {
//           deviceAddress: device.id,
//           ngrokLink: device.ngrokLink,
//           lastChecked: new Date().toISOString(),
//           reputationScore,
//           retrievalStats: {
//             successRate: successfulResults.length / retrievalResults.length,
//             averageResponseTime: avgTime,
//             consistency,
//             lastSeen: new Date().toISOString()
//           },
//           performance: {
//             throughput: successfulResults.length / ((endTime - startTime) / 1000) || 0,
//             errorRate: (retrievalResults.length - successfulResults.length) / retrievalResults.length,
//             latency: calculateLatencyPercentiles(durations)
//           },
//           security: {
//             tlsVersion: 'TLS 1.3',
//             certificateValid: true,
//             lastUpdated: new Date().toISOString()
//           },
//           // Keep the detailed results for debugging/auditing
//           _debug: {
//             retrievalResults: retrievalResults.map(r => ({
//               success: r.success,
//               status: r.status,
//               statusText: r.statusText,
//               duration: r.duration,
//               timestamp: r.timestamp
//             }))
//           }
//         };

//         const storageResult = await storeReputationData(device.id, reputationData);

//         return {
//           deviceAddress: device.id,
//           ngrokLink: device.ngrokLink,
//           status: 'checked',
//           reputationScore,
//           retrievalStats: reputationData.retrievalStats,
//           reputationDataUrl: storageResult.success ? storageResult.url : null,
//           checked: new Date().toISOString()
//         };

//       } catch (error: any) {
//         console.error(`Error processing device ${device.id}:`, error);
//         return {
//           deviceAddress: device.id,
//           ngrokLink: device.ngrokLink || 'unknown',
//           status: 'error',
//           error: error.message || 'Unknown error',
//           reputationScore: 0,
//           retrievalStats: {
//             successRate: 0,
//             averageResponseTime: 0,
//             totalChecks: 0,
//             consistency: 0,
//             lastSeen: new Date().toISOString()
//           },
//           checked: new Date().toISOString()
//         };
//       }
//     }));

//     return NextResponse.json({
//       subnet: CHECKER_SUBNET_NAME,
//       version: CHECKER_SUBNET_VERSION,
//       timestamp: new Date().toISOString(),
//       results
//     });

//   } catch (error: any) {
//     console.error('Error in device-checker API:', error);
//     return NextResponse.json(
//       { error: error.message || 'Internal server error' },
//       { status: 500 }
//     );
//   }
// } 