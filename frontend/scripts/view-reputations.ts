#!/usr/bin/env ts-node
/**
 * Device Reputation Viewer
 * 
 * Views and analyzes device reputation data stored in Akave/Filecoin
 */

import fetch from 'node-fetch';
import { formatDistanceToNow } from 'date-fns';
import chalk from 'chalk';

const AKAVE_API_URL = 'http://3.88.107.110:8000';
const DEVICE_REPUTATION_BUCKET = 'device-reputation';

interface ReputationData {
  deviceAddress: string;
  ngrokLink: string;
  lastChecked: string;
  reputationScore: number;
  retrievalStats: {
    successRate: number;
    averageResponseTime: number;
    totalChecks: number;
  };
  retrievalResults: Array<{
    success: boolean;
    status: number;
    statusText: string;
    duration: number;
    characterVerified: boolean;
    timestamp: string;
  }>;
  _checkerMetadata: {
    subnet: string;
    version: string;
    timestamp: string;
    verificationMethod: string;
    storageProtocol: string;
    metrics: {
      successRate: { weight: number; description: string };
      responseTime: { weight: number; description: string };
      consistency: { weight: number; description: string };
    };
  };
}

async function getLatestReputations(): Promise<Map<string, ReputationData>> {
  try {
    // Get all files in the bucket
    const filesResponse = await fetch(`${AKAVE_API_URL}/buckets/${DEVICE_REPUTATION_BUCKET}/files`);
    if (!filesResponse.ok) {
      throw new Error(`Failed to fetch files: ${filesResponse.status}`);
    }

    const filesData = await filesResponse.json();
    if (!filesData.success || !Array.isArray(filesData.data)) {
      throw new Error('Invalid response format from Akave API');
    }

    // Group files by device address and get the latest for each
    const deviceFiles = new Map<string, { filename: string; timestamp: number }>();
    
    filesData.data.forEach((file: string) => {
      const match = file.match(/^(0x[a-fA-F0-9]+)-(\d+)\.json$/);
      if (match) {
        const [, address, timestamp] = match;
        const ts = parseInt(timestamp);
        
        if (!deviceFiles.has(address) || deviceFiles.get(address)!.timestamp < ts) {
          deviceFiles.set(address, { filename: file, timestamp: ts });
        }
      }
    });

    // Fetch the latest reputation data for each device
    const reputations = new Map<string, ReputationData>();
    
    await Promise.all(Array.from(deviceFiles.entries()).map(async ([address, { filename }]) => {
      try {
        const dataResponse = await fetch(`${AKAVE_API_URL}/buckets/${DEVICE_REPUTATION_BUCKET}/files/${filename}/download`);
        if (!dataResponse.ok) {
          console.error(`Failed to fetch data for ${address}: ${dataResponse.status}`);
          return;
        }
        
        const data = await dataResponse.json();
        reputations.set(address, data);
      } catch (error) {
        console.error(`Error fetching reputation for ${address}:`, error);
      }
    }));

    return reputations;
  } catch (error) {
    console.error('Error fetching reputations:', error);
    return new Map();
  }
}

function printReputationSummary(reputations: Map<string, ReputationData>) {
  if (reputations.size === 0) {
    console.log(chalk.yellow('\nNo reputation data found. The checker might not have run yet.'));
    return;
  }

  console.log(chalk.bold('\nDevice Reputation Summary'));
  console.log('='.repeat(100));

  // Sort devices by reputation score
  const sortedDevices = Array.from(reputations.entries())
    .sort((a, b) => b[1].reputationScore - a[1].reputationScore);

  sortedDevices.forEach(([address, data]) => {
    const score = data.reputationScore;
    let scoreColor;
    if (score >= 90) scoreColor = chalk.green;
    else if (score >= 70) scoreColor = chalk.cyan;
    else if (score >= 50) scoreColor = chalk.yellow;
    else scoreColor = chalk.red;

    console.log(`\nDevice: ${chalk.blue(address)}`);
    console.log(`Reputation Score: ${scoreColor(score.toFixed(2))}`);
    console.log(`Success Rate: ${(data.retrievalStats.successRate * 100).toFixed(1)}%`);
    console.log(`Avg Response Time: ${data.retrievalStats.averageResponseTime.toFixed(0)}ms`);
    console.log(`Total Checks: ${data.retrievalStats.totalChecks}`);
    console.log(`Last Checked: ${formatDistanceToNow(new Date(data.lastChecked))} ago`);
    console.log(`Ngrok URL: ${data.ngrokLink}`);
    
    // Show recent issues if any
    const recentFailures = data.retrievalResults
      .filter(r => !r.success)
      .slice(-3);
    
    if (recentFailures.length > 0) {
      console.log(chalk.yellow('\nRecent Issues:'));
      recentFailures.forEach(failure => {
        console.log(`  - ${failure.statusText} (Status: ${failure.status})`);
      });
    }
  });

  // Print network stats
  const scores = sortedDevices.map(([, data]) => data.reputationScore);
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  console.log('\n' + '='.repeat(100));
  console.log(chalk.bold('\nNetwork Statistics'));
  console.log(`Total Devices: ${reputations.size}`);
  console.log(`Average Score: ${avgScore.toFixed(2)}`);
  console.log(`Highest Score: ${maxScore.toFixed(2)}`);
  console.log(`Lowest Score: ${minScore.toFixed(2)}`);
}

// Run the viewer
async function main() {
  console.log(chalk.bold('Fetching device reputations...'));
  const reputations = await getLatestReputations();
  printReputationSummary(reputations);
}

main().catch(console.error); 