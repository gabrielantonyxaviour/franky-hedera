// Checker Network Types

/**
 * Standard format for a verification proof from a checker node
 */
export interface VerificationProof {
  checkerId: string;                // Unique identifier of the checker node
  timestamp: string;               // ISO timestamp of the check
  signature: string;              // Checker node's signature of the verification
  nonce: string;                 // Random nonce for proof uniqueness
  blockHeight: number;          // Block height at time of check
  previousProofHash: string;   // Hash of previous proof (for verification chain)
}

/**
 * Standardized metrics for device checks
 */
export interface CheckerMetrics {
  availability: {
    uptime: number;           // Percentage of successful responses
    responseTime: number;     // Average response time in ms
    consistency: number;      // Standard deviation of response times
    lastSeen: string;        // ISO timestamp of last successful check
  };
  performance: {
    throughput: number;      // Requests handled per second
    errorRate: number;       // Percentage of failed requests
    latency: {
      p50: number;          // 50th percentile latency
      p95: number;          // 95th percentile latency
      p99: number;          // 99th percentile latency
    };
  };
  security: {
    tlsVersion: string;     // TLS version in use
    certificateValid: boolean; // SSL/TLS certificate validity
    lastUpdated: string;    // ISO timestamp of last security check
  };
}

/**
 * Standardized format for a single check result
 */
export interface CheckResult {
  success: boolean;
  timestamp: string;
  duration: number;
  error?: string;
  statusCode: number;
  metrics: Partial<CheckerMetrics>;
}

/**
 * Consensus mechanism types
 */
export interface ConsensusVote {
  checkerId: string;
  deviceId: string;
  timestamp: string;
  metrics: CheckerMetrics;
  signature: string;
}

export interface ConsensusRound {
  roundId: string;
  startTime: string;
  endTime: string;
  participants: string[];    // Array of checker IDs
  votes: ConsensusVote[];
  finalScore?: number;
  status: 'pending' | 'active' | 'complete' | 'failed';
}

/**
 * Standardized reputation data format for the Checker Network
 */
export interface StandardizedReputation {
  // Identification
  version: string;
  networkId: string;         // Checker Network ID
  subnetId: string;         // Subnet identifier
  deviceId: string;         // Device being checked
  
  // Consensus Data
  round: ConsensusRound;
  quorum: number;           // Number of checkers required for consensus
  consensusThreshold: number; // Required agreement percentage
  
  // Verification
  proof: VerificationProof;
  metrics: CheckerMetrics;
  
  // Historical Data
  checks: CheckResult[];
  previousReputationHash: string; // Hash of previous reputation data
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  storageProtocol: 'filecoin';
  storageDetails: {
    bucket: string;
    path: string;
    cid?: string;
  };
}

/**
 * Configuration for the checker subnet
 */
export interface CheckerSubnetConfig {
  subnetId: string;
  version: string;
  minCheckers: number;
  consensusThreshold: number;
  checkInterval: number;     // In milliseconds
  metricsWeight: {
    availability: number;
    performance: number;
    security: number;
  };
  storageConfig: {
    protocol: 'filecoin';
    bucket: string;
    baseUrl: string;
  };
} 