#!/usr/bin/env ts-node
/**
 * Device Reputation Viewer
 * 
 * Views and analyzes device reputation data stored in Akave/Filecoin
 */

import fetch from 'node-fetch';
import { formatDistanceToNow } from 'date-fns';
import chalk from 'chalk';
import type { StandardizedReputation } from '../types/checker-network';

const AKAVE_API_URL = 'http://3.88.107.110:8000';
const DEVICE_REPUTATION_BUCKET = 'device-reputation';

async function getLatestReputations(): Promise<Map<string, StandardizedReputation>> {
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
    const reputations = new Map<string, StandardizedReputation>();
    
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

function printReputationSummary(reputations: Map<string, StandardizedReputation>) {
  if (reputations.size === 0) {
    console.log(chalk.yellow('\nNo reputation data found. The checker might not have run yet.'));
    return;
  }

  console.log(chalk.bold('\nDevice Reputation Summary'));
  console.log('='.repeat(100));

  // Sort devices by reputation score
  const sortedDevices = Array.from(reputations.entries())
    .sort((a, b) => (b[1].round.finalScore || 0) - (a[1].round.finalScore || 0));

  sortedDevices.forEach(([address, data]) => {
    const score = data.round.finalScore || 0;
    let scoreColor;
    if (score >= 90) scoreColor = chalk.green;
    else if (score >= 70) scoreColor = chalk.cyan;
    else if (score >= 50) scoreColor = chalk.yellow;
    else scoreColor = chalk.red;

    console.log(`\nDevice: ${chalk.blue(address)}`);
    console.log(`Reputation Score: ${scoreColor(score.toFixed(2))}`);
    console.log(`Consensus Status: ${chalk.magenta(data.round.status)}`);
    console.log(`Number of Checkers: ${data.round.participants.length}`);
    
    // Availability metrics
    console.log('\nAvailability:');
    console.log(`  Uptime: ${data.metrics.availability.uptime.toFixed(1)}%`);
    console.log(`  Response Time: ${data.metrics.availability.responseTime.toFixed(0)}ms`);
    console.log(`  Consistency: ${data.metrics.availability.consistency.toFixed(2)}`);
    console.log(`  Last Seen: ${formatDistanceToNow(new Date(data.metrics.availability.lastSeen))} ago`);
    
    // Performance metrics
    console.log('\nPerformance:');
    console.log(`  Throughput: ${data.metrics.performance.throughput.toFixed(2)} req/s`);
    console.log(`  Error Rate: ${(data.metrics.performance.errorRate * 100).toFixed(1)}%`);
    console.log(`  Latency (p50/p95/p99): ${data.metrics.performance.latency.p50}/${data.metrics.performance.latency.p95}/${data.metrics.performance.latency.p99}ms`);
    
    // Security metrics
    console.log('\nSecurity:');
    console.log(`  TLS Version: ${data.metrics.security.tlsVersion}`);
    console.log(`  Certificate Valid: ${data.metrics.security.certificateValid ? chalk.green('✓') : chalk.red('✗')}`);
    
    // Verification details
    console.log('\nVerification:');
    console.log(`  Checker ID: ${data.proof.checkerId}`);
    console.log(`  Block Height: ${data.proof.blockHeight}`);
    console.log(`  Timestamp: ${formatDistanceToNow(new Date(data.proof.timestamp))} ago`);
    
    // Storage details
    console.log('\nStorage:');
    console.log(`  Protocol: ${data.storageProtocol}`);
    console.log(`  Location: ${data.storageDetails.bucket}/${data.storageDetails.path}`);
    if (data.storageDetails.cid) {
      console.log(`  CID: ${data.storageDetails.cid}`);
    }
    
    // Show recent issues if any
    const recentFailures = data.checks
      .filter(check => !check.success)
      .slice(-3);
    
    if (recentFailures.length > 0) {
      console.log(chalk.yellow('\nRecent Issues:'));
      recentFailures.forEach(failure => {
        console.log(`  - ${failure.error || 'Unknown error'} (Status: ${failure.statusCode})`);
      });
    }
    
    console.log('-'.repeat(100));
  });

  // Print network stats
  const scores = sortedDevices.map(([, data]) => data.round.finalScore || 0);
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  console.log('\n' + '='.repeat(100));
  console.log(chalk.bold('\nNetwork Statistics'));
  console.log(`Total Devices: ${reputations.size}`);
  console.log(`Average Score: ${avgScore.toFixed(2)}`);
  console.log(`Highest Score: ${maxScore.toFixed(2)}`);
  console.log(`Lowest Score: ${minScore.toFixed(2)}`);
  
  // Consensus statistics
  const consensusStats = {
    complete: 0,
    pending: 0,
    failed: 0
  };
  
  sortedDevices.forEach(([, data]) => {
    consensusStats[data.round.status as keyof typeof consensusStats]++;
  });
  
  console.log('\nConsensus Status:');
  console.log(`  Complete: ${consensusStats.complete}`);
  console.log(`  Pending: ${consensusStats.pending}`);
  console.log(`  Failed: ${consensusStats.failed}`);
}

// Run the viewer
async function main() {
  console.log(chalk.bold('Fetching device reputations...'));
  const reputations = await getLatestReputations();
  printReputationSummary(reputations);
}

main().catch(console.error); 