import { createHash } from 'crypto';
import { ethers } from 'ethers';
import type {
  ConsensusRound,
  ConsensusVote,
  CheckerMetrics,
  StandardizedReputation,
  VerificationProof
} from '../types/checker-network';

/**
 * Consensus Manager for the Checker Network
 * Implements a Byzantine fault-tolerant consensus mechanism for device checks
 */
export class ConsensusManager {
  private currentRound: ConsensusRound | null = null;
  private readonly checkerId: string;
  private readonly privateKey: string;
  private readonly consensusThreshold: number;
  private readonly minCheckers: number;

  constructor(checkerId: string, privateKey: string, consensusThreshold = 0.67, minCheckers = 3) {
    this.checkerId = checkerId;
    this.privateKey = privateKey;
    this.consensusThreshold = consensusThreshold;
    this.minCheckers = minCheckers;
  }

  /**
   * Start a new consensus round
   */
  public startRound(deviceId: string): ConsensusRound {
    const roundId = this.generateRoundId(deviceId);
    
    this.currentRound = {
      roundId,
      startTime: new Date().toISOString(),
      endTime: '', // Will be set when round completes
      participants: [this.checkerId],
      votes: [],
      status: 'active'
    };

    return this.currentRound;
  }

  /**
   * Submit a vote for the current round
   */
  public async submitVote(metrics: CheckerMetrics, deviceId: string): Promise<ConsensusVote> {
    if (!this.currentRound) {
      throw new Error('No active consensus round');
    }

    const vote: ConsensusVote = {
      checkerId: this.checkerId,
      deviceId,
      timestamp: new Date().toISOString(),
      metrics,
      signature: await this.signVote(metrics, deviceId)
    };

    this.currentRound.votes.push(vote);
    return vote;
  }

  /**
   * Calculate consensus from all submitted votes
   */
  public calculateConsensus(): number | null {
    if (!this.currentRound || this.currentRound.votes.length < this.minCheckers) {
      return null;
    }

    // Group metrics by checker
    const metricsByChecker = new Map<string, CheckerMetrics>();
    this.currentRound.votes.forEach(vote => {
      if (this.verifyVote(vote)) {
        metricsByChecker.set(vote.checkerId, vote.metrics);
      }
    });

    if (metricsByChecker.size < this.minCheckers) {
      return null;
    }

    // Calculate median values for each metric
    const consensusMetrics = this.calculateMedianMetrics(Array.from(metricsByChecker.values()));
    
    // Calculate final score based on weighted metrics
    return this.calculateFinalScore(consensusMetrics);
  }

  /**
   * Generate verification proof for the consensus round
   */
  public async generateProof(blockHeight: number): Promise<VerificationProof> {
    if (!this.currentRound) {
      throw new Error('No active consensus round');
    }

    const nonce = ethers.randomBytes(32);
    const timestamp = new Date().toISOString();

    const proof: VerificationProof = {
      checkerId: this.checkerId,
      timestamp,
      nonce: ethers.hexlify(nonce),
      blockHeight,
      previousProofHash: await this.calculatePreviousProofHash(),
      signature: '' // Will be set below
    };

    // Sign the proof
    const message = this.serializeProof(proof);
    proof.signature = await this.signMessage(message);

    return proof;
  }

  /**
   * Complete the current consensus round
   */
  public async completeRound(finalScore: number, proof: VerificationProof): Promise<StandardizedReputation> {
    if (!this.currentRound) {
      throw new Error('No active consensus round');
    }

    this.currentRound.endTime = new Date().toISOString();
    this.currentRound.finalScore = finalScore;
    this.currentRound.status = 'complete';

    // Convert consensus data to standardized reputation format
    const reputation: StandardizedReputation = {
      version: '1.0.0',
      networkId: 'checker-network-mainnet',
      subnetId: 'franky-device-checker',
      deviceId: this.currentRound.votes[0].deviceId,
      round: this.currentRound,
      quorum: this.minCheckers,
      consensusThreshold: this.consensusThreshold,
      proof,
      metrics: this.calculateMedianMetrics(this.currentRound.votes.map(v => v.metrics)),
      checks: this.currentRound.votes.map(v => ({
        success: true,
        timestamp: v.timestamp,
        duration: v.metrics.availability.responseTime,
        statusCode: 200,
        metrics: v.metrics
      })),
      previousReputationHash: proof.previousProofHash,
      createdAt: this.currentRound.startTime,
      updatedAt: this.currentRound.endTime,
      storageProtocol: 'filecoin',
      storageDetails: {
        bucket: 'device-reputation',
        path: `${this.currentRound.votes[0].deviceId}/${this.currentRound.roundId}.json`
      }
    };

    // Reset current round
    this.currentRound = null;

    return reputation;
  }

  /**
   * Calculate median values for metrics across all checkers
   */
  private calculateMedianMetrics(allMetrics: CheckerMetrics[]): CheckerMetrics {
    const median = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
    };

    return {
      availability: {
        uptime: median(allMetrics.map(m => m.availability.uptime)),
        responseTime: median(allMetrics.map(m => m.availability.responseTime)),
        consistency: median(allMetrics.map(m => m.availability.consistency)),
        lastSeen: new Date().toISOString()
      },
      performance: {
        throughput: median(allMetrics.map(m => m.performance.throughput)),
        errorRate: median(allMetrics.map(m => m.performance.errorRate)),
        latency: {
          p50: median(allMetrics.map(m => m.performance.latency.p50)),
          p95: median(allMetrics.map(m => m.performance.latency.p95)),
          p99: median(allMetrics.map(m => m.performance.latency.p99))
        }
      },
      security: {
        tlsVersion: allMetrics[0].security.tlsVersion,
        certificateValid: allMetrics.every(m => m.security.certificateValid),
        lastUpdated: new Date().toISOString()
      }
    };
  }

  /**
   * Calculate final score based on weighted metrics
   */
  private calculateFinalScore(metrics: CheckerMetrics): number {
    const weights = {
      availability: 0.5,
      performance: 0.3,
      security: 0.2
    };

    const availabilityScore = (
      (metrics.availability.uptime / 100) * 0.6 +
      (1 - Math.min(metrics.availability.responseTime / 5000, 1)) * 0.4
    ) * weights.availability;

    const performanceScore = (
      (1 - metrics.performance.errorRate) * 0.4 +
      (metrics.performance.throughput / 100) * 0.3 +
      (1 - Math.min(metrics.performance.latency.p95 / 1000, 1)) * 0.3
    ) * weights.performance;

    const securityScore = (
      (metrics.security.certificateValid ? 1 : 0) * weights.security
    );

    return (availabilityScore + performanceScore + securityScore) * 100;
  }

  /**
   * Verify a vote's signature
   */
  private verifyVote(vote: ConsensusVote): boolean {
    try {
      const message = this.serializeVote(vote);
      const recoveredAddress = ethers.verifyMessage(message, vote.signature);
      return ethers.getAddress(recoveredAddress) === ethers.getAddress(vote.checkerId);
    } catch {
      return false;
    }
  }

  /**
   * Sign a vote with the checker's private key
   */
  private async signVote(metrics: CheckerMetrics, deviceId: string): Promise<string> {
    const message = this.serializeVote({
      checkerId: this.checkerId,
      deviceId,
      timestamp: new Date().toISOString(),
      metrics,
      signature: ''
    });
    return this.signMessage(message);
  }

  /**
   * Sign a message with the checker's private key
   */
  private async signMessage(message: string): Promise<string> {
    const wallet = new ethers.Wallet(this.privateKey);
    return wallet.signMessage(message);
  }

  /**
   * Generate a unique round ID
   */
  private generateRoundId(deviceId: string): string {
    const timestamp = Date.now().toString();
    const input = `${deviceId}-${timestamp}-${this.checkerId}`;
    return createHash('sha256').update(input).digest('hex');
  }

  /**
   * Calculate hash of previous proof for verification chain
   */
  private async calculatePreviousProofHash(): Promise<string> {
    // In a real implementation, this would fetch the last proof from storage
    // For now, we'll return a dummy hash
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  /**
   * Serialize a vote for signing
   */
  private serializeVote(vote: ConsensusVote): string {
    return JSON.stringify({
      checkerId: vote.checkerId,
      deviceId: vote.deviceId,
      timestamp: vote.timestamp,
      metrics: vote.metrics
    });
  }

  /**
   * Serialize a proof for signing
   */
  private serializeProof(proof: Omit<VerificationProof, 'signature'>): string {
    return JSON.stringify(proof);
  }
} 