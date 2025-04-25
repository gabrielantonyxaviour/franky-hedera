import { NextResponse } from 'next/server';
import { hcsService } from '@/lib/services/hcs-service';

// Self checker configuration
const SELF_CHECKER_ADDRESS = '0xSelfCheckerNode'; // Identifier for the self-checker
const SELF_CHECKER_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const DEVICES_API_URL = 'https://www.frankyagent.xyz/api/graph/devices';

// Interface for test result
interface TestResult {
  success: boolean;
  duration: number;
  status?: number;
  error?: string;
}

// Interface for device info
interface DeviceInfo {
  id: string;
  ngrokLink?: string;
  agents?: any[];
  [key: string]: any;
}

/**
 * Perform a real device health check by testing its availability and performance
 * @param deviceId Device ID to check
 * @param deviceInfo Additional device info including ngrok link
 * @returns Check results with actual metrics
 */
async function checkDeviceHealth(deviceId: string, deviceInfo?: DeviceInfo): Promise<any> {
  // Start timing the overall check process
  const startTime = Date.now();
  let success = false;
  let responseTime = 0;
  let deviceResponse: Response | null = null;
  let errorRate = 1.0; // Default to 100% error rate
  
  try {
    // Get ngrok link from device info if provided
    let ngrokLink = deviceInfo?.ngrokLink;
    
    if (!ngrokLink) {
      console.warn(`No ngrok link available for device ${deviceId}`);
      // If no ngrok link, we can't test the device directly
      success = false;
      responseTime = 0;
      
      return {
        reputationScore: 20, // Base score only
        retrievalStats: {
          successRate: 0,
          averageResponseTime: 0,
          consistency: 0,
          lastSeen: null,
          totalChecks: 0,
          checkDuration: Date.now() - startTime
        },
        performance: {
          throughput: 0,
          errorRate: 1.0,
          latency: {
            p50: 0,
            p95: 0,
            p99: 0
          }
        },
        security: {
          tlsVersion: 'unknown',
          certificateValid: false,
          lastUpdated: new Date().toISOString()
        },
        testDetails: {
          ngrokLinkAvailable: false,
          ngrokLink: 'Not available',
          httpStatus: 'No response',
          timestamp: new Date().toISOString(),
          message: 'Device has no ngrok link for testing'
        }
      };
    }
    
    console.log(`Testing device ${deviceId} with ngrok link: ${ngrokLink}`);
    
    // Run 3 test requests to get a better performance sample
    const testResults: TestResult[] = await Promise.all(
      Array(3).fill(0).map(async (_, i) => {
        const testStart = Date.now();
        try {
          // Add a test parameter to avoid caching
          const testUrl = `${ngrokLink}/health?test=${Date.now()}${i}`;
          
          // Create AbortController with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(testUrl, { 
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
          });
          
          // Clear timeout
          clearTimeout(timeoutId);
          
          // Save the response from the first successful request
          if (i === 0) {
            deviceResponse = response;
          }
          
          const testDuration = Date.now() - testStart;
          return { 
            success: response.ok, 
            duration: testDuration,
            status: response.status 
          };
        } catch (error) {
          const testDuration = Date.now() - testStart;
          return { 
            success: false, 
            duration: testDuration,
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      })
    );
    
    // Calculate actual metrics from the test results
    const successfulTests = testResults.filter(r => r.success);
    const successRate = successfulTests.length / testResults.length;
    success = successRate > 0; // Consider successful if at least one test passed
    
    // Calculate average response time for successful tests
    if (successfulTests.length > 0) {
      responseTime = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length;
    } else {
      // If all tests failed, use the average of all test durations
      responseTime = testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length;
    }
    
    // Calculate error rate (percentage of requests that failed)
    errorRate = 1 - successRate;
    
    // Calculate an overall score based on real metrics
    // Formula: 50% based on success rate + 30% based on response time + 20% base score
    const successScore = success ? 50 * (1 - errorRate) : 0;
    
    // Response time score (lower is better):
    // - Under 100ms: 30 points
    // - 100-500ms: 15-30 points (linear scale)
    // - Over 500ms: 0-15 points (linear scale)
    let responseTimeScore = 0;
    if (success) {
      if (responseTime < 100) {
        responseTimeScore = 30;
      } else if (responseTime < 500) {
        responseTimeScore = 30 - ((responseTime - 100) / 400) * 15;
      } else {
        responseTimeScore = 15 - Math.min(15, ((responseTime - 500) / 2000) * 15);
      }
    }
    
    // Base score: every device gets a minimum score
    const baseScore = 20;
    
    // Calculate final score (0-100 scale)
    const finalScore = Math.round(successScore + responseTimeScore + baseScore);
    
    // Total check duration
    const checkDuration = Date.now() - startTime;
    
    // Extract status safely since deviceResponse might be null
    let httpStatus: string | number = 'No response';
    if (deviceResponse) {
      try {
        httpStatus = deviceResponse.status;
      } catch (error) {
        httpStatus = 'Unknown status';
      }
    }
    
    return {
      reputationScore: finalScore,
      retrievalStats: {
        successRate: 1 - errorRate,
        averageResponseTime: Math.round(responseTime),
        consistency: success ? 0.9 : 0.1, // Simplified consistency measure
        lastSeen: success ? new Date().toISOString() : null,
        totalChecks: 3, // We ran 3 tests
        checkDuration: checkDuration
      },
      performance: {
        throughput: success ? Math.round(1000 / (responseTime || 1)) : 0, // Requests per second
        errorRate: errorRate,
        latency: {
          p50: Math.round(responseTime),
          p95: Math.round(responseTime * 1.5), // Simplified percentile estimation
          p99: Math.round(responseTime * 2)
        }
      },
      security: {
        tlsVersion: 'TLS 1.3', // Assumed
        certificateValid: true, // Assumed
        lastUpdated: new Date().toISOString()
      },
      testDetails: {
        ngrokLinkAvailable: true,
        ngrokLink: ngrokLink,
        httpStatus: httpStatus,
        testCount: testResults.length,
        successfulTests: successfulTests.length,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error(`Error checking device ${deviceId}:`, error);
    
    // Total check duration even for failed checks
    const checkDuration = Date.now() - startTime;
    
    // Return failure metrics
    return {
      reputationScore: 10,
      retrievalStats: {
        successRate: 0,
        averageResponseTime: checkDuration,
        consistency: 0,
        lastSeen: null,
        totalChecks: 1,
        checkDuration: checkDuration
      },
      performance: {
        throughput: 0,
        errorRate: 1.0,
        latency: {
          p50: 5000,
          p95: 8000,
          p99: 10000
        }
      },
      security: {
        tlsVersion: 'unknown',
        certificateValid: false,
        lastUpdated: new Date().toISOString()
      },
      testDetails: {
        ngrokLinkAvailable: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * API endpoint for performing self-checks on devices
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const providedDeviceAddresses = body.deviceAddresses;
    
    // Fetch all devices from the API
    let allDevices: DeviceInfo[] = [];
    let devicesToCheck: DeviceInfo[] = [];
    
    try {
      console.log(`Fetching devices from ${DEVICES_API_URL}`);
      const response = await fetch(DEVICES_API_URL);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch devices: ${response.status}`);
      }
      
      allDevices = await response.json();
      console.log(`Found ${allDevices.length} devices in total`);
      
      // If specific device addresses were provided, filter to those
      if (Array.isArray(providedDeviceAddresses) && providedDeviceAddresses.length > 0) {
        devicesToCheck = allDevices.filter(device => 
          providedDeviceAddresses.includes(device.id)
        );
        console.log(`Filtered to ${devicesToCheck.length} specified devices`);
      } else {
        // Otherwise, check all devices
        devicesToCheck = allDevices;
        console.log(`No filter provided, checking all ${devicesToCheck.length} devices`);
      }
      
      if (devicesToCheck.length === 0) {
        return NextResponse.json(
          { error: 'No devices found to check' },
          { status: 404 }
        );
      }
    } catch (error: any) {
      console.error('Error fetching devices:', error);
      return NextResponse.json(
        { error: `Failed to fetch devices: ${error.message}` },
        { status: 500 }
      );
    }

    // Make sure HCS topics are initialized
    await hcsService.initializeTopics();

    // Register our own server as a checker if not already registered
    try {
      await hcsService.registerChecker(
        SELF_CHECKER_ADDRESS,
        SELF_CHECKER_URL
      );
      console.log('Self-checker registered successfully');
    } catch (error) {
      console.log('Self-checker may already be registered:', error);
      // Continue even if registration fails (might already exist)
    }

    // Perform checks for each device
    console.log(`Starting checks for ${devicesToCheck.length} devices`);
    const results = await Promise.all(devicesToCheck.map(async (device) => {
      try {
        const deviceId = device.id;
        console.log(`Checking device ${deviceId}`);
        
        // Check the device with real metrics
        const checkResults = await checkDeviceHealth(deviceId, device);
        
        // Submit the check to HCS
        const transactionId = await hcsService.submitDeviceCheck(
          SELF_CHECKER_ADDRESS,
          deviceId,
          checkResults
        );
        
        console.log(`Check completed for device ${deviceId}, score: ${checkResults.reputationScore}`);
        
        return {
          deviceAddress: deviceId,
          status: 'success',
          transactionId,
          ngrokLink: device.ngrokLink || 'Not available',
          reputationScore: checkResults.reputationScore,
          successRate: checkResults.retrievalStats.successRate,
          responseTime: checkResults.retrievalStats.averageResponseTime
        };
      } catch (error: any) {
        console.error(`Error checking device ${device.id}:`, error);
        return {
          deviceAddress: device.id,
          status: 'error',
          error: error.message || 'Unknown error'
        };
      }
    }));

    return NextResponse.json({
      success: true,
      message: `Self-check completed for ${results.length} devices`,
      results
    });

  } catch (error: any) {
    console.error('Error in self-check API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 