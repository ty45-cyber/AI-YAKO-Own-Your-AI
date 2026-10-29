export interface LedgerTransaction {
  tx_id: string;
  timestamp: string;
  counterparty: string;
  category: string;
  direction: 'INFLOW' | 'OUTFLOW';
  currency: 'KES' | 'USDT';
  amount: number;
  fee: number;
  reference_note: string;
}

export interface LedgerAuditSummary {
  totalInflowKES: number;
  totalOutflowKES: number;
  netCashflowKES: number;
  totalOutflowUSDT: number;
  totalFeesKES: number;
  duplicateAnomalies: Array<{
    counterparty: string;
    amount: number;
    currency: string;
    occurrences: number;
    txIds: string;
  }>;
  rowCount: number;
}

export interface DocumentChunk {
  id: string;
  docTitle: string;
  text: string;
  vector: number[];
  createdAt: string;
}

export interface QvacTelemetrySnapshot {
  runtimeMode: 'QVAC_NATIVE_WORKER' | 'QVAC_LOCAL_FALLBACK';
  offlineVerified: boolean;
  outboundBytesTotal: number;
  activeModels: {
    llm: string;
    embedding: string;
  };
  hardware: {
    cpuModel: string;
    cpuCores: number;
    ramUsedMB: number;
    ramTotalMB: number;
    gpuAccelerator: string;
  };
  performance: {
    lastTokensPerSec: number;
    lastEmbeddingLatencyMs: number;
    vectorIndexDim: number;
    indexedChunksCount: number;
    cloudApiCostSavedUSD: number;
  };
  recentProfilerEvents: Array<{
    op: string;
    durationMs: number;
    backendDevice: string;
  }>;
}

export interface WdkPolicyRule {
  id: string;
  name: string;
  maxSingleTransferUSDT: number;
  allowedCurrencies: Array<'USDT' | 'KES'>;
  requireContractClauseMatch: boolean;
  blockDuplicateCounterparty: boolean;
}

export interface WdkSignedIntent {
  intentId: string;
  chain: 'evm-erc20-usdt';
  fromAddress: string;
  toCounterparty: string;
  toAddress: string;
  amountUSDT: number;
  invoiceRef: string;
  policyVerdict: 'ALLOW' | 'DENY';
  policyReason: string;
  offlineSignature: string;
  networkBroadcastStatus: 'AIRGAPPED_OFFLINE_ONLY';
  signedAt: string;
}

export interface SignedDisputeClaim {
  claimId: string;
  issuedAt: string;
  claimantEntity: string;
  signerEvmAddress: string;
  counterparty: string;
  duplicateTxIds: string;
  currency: string;
  principalAmount: number;
  penaltyRatePercent: number;
  penaltyCreditAmount: number;
  totalClaimAmount: number;
  citedContractClause: string;
  bilingualDemandNotice: {
    english: string;
    swahili: string;
  };
  payloadSha256: string;
  wdkEip191Signature: string;
}

export interface AgenticSweepResult {
  sweepId: string;
  executedAt: string;
  totalDurationMs: number;
  steps: Array<{
    step: number;
    stage: string;
    detail: string;
    durationMs: number;
  }>;
  signedIntents: WdkSignedIntent[];
  disputeClaims: SignedDisputeClaim[];
}

export interface QvacBenchmarkReport {
  benchmarkId: string;
  executedAt: string;
  hardware: {
    cpuModel: string;
    cpuCores: number;
    ramUsedMB: number;
    ramTotalMB: number;
    gpuAccelerator: string;
  };
  stages: Array<{
    name: string;
    op: string;
    localDurationMs: number;
    cloudBaselineMs: number;
    speedupFactor: number;
    detail: string;
  }>;
  totalLocalMs: number;
  totalCloudBaselineMs: number;
  sqliteDbSizeBytes: number;
  vectorSnapshotExists: boolean;
}

export interface YakoEncryptedCapsule {
  magicHeader: 'YAKO_SOVEREIGN_CAPSULE_V1';
  createdAt: string;
  ownerPublicKeyFingerprint: string;
  qvacModelManifest: {
    llmModel: string;
    embeddingModel: string;
    vectorDimension: number;
  };
  encryption: {
    algorithm: 'AES-256-GCM';
    kdf: 'PBKDF2-SHA256';
    ivHex: string;
    saltHex: string;
    authTagHex: string;
    plaintextSha256: string;
  };
  ciphertextBase64: string;
}
