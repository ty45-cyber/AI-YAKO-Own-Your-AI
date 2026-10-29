declare module '@qvac/sdk' {
  export const LLAMA_3_2_1B_INST_Q4_0: string;
  export const EMBEDDINGGEMMA_300M_Q4_0: string;
  export const GTE_LARGE_FP16: string;

  export interface LoadModelProgress {
    percentage?: number;
    loadedBytes?: number;
    totalBytes?: number;
  }

  export interface LoadModelOptions {
    modelSrc: string;
    modelType?: 'llm' | 'embeddings' | 'tts' | 'asr';
    modelConfig?: Record<string, unknown>;
    onProgress?: (progress: LoadModelProgress) => void;
  }

  export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }

  export interface CompletionOptions {
    modelId: string;
    history: ChatMessage[];
    stream?: boolean;
    temperature?: number;
    maxTokens?: number;
  }

  export interface EmbedOptions {
    modelId: string;
    text: string | string[];
  }

  export interface EmbedResult {
    embedding: number[] | number[][];
  }

  export interface VectorSearchHit {
    id: string;
    score: number;
  }

  export interface TurboVecIndex {
    add(params: { id: string; vector: number[] }): Promise<void>;
    search(params: { query: number[]; k: number }): Promise<VectorSearchHit[]>;
    write(params: { path: string }): Promise<{ path: string }>;
    dispose(): Promise<void>;
  }

  export interface SystemResourcesSample {
    capabilities: {
      cpu?: { model?: string; cores?: number; arch?: string };
      memory?: { totalBytes?: number; availableBytes?: number; usedBytes?: number };
      gpu?: Array<{ name?: string; driver?: string; api?: string; vramBytes?: number }>;
    };
    sample?: {
      cpuUsagePercent?: number;
      rssBytes?: number;
      sampledAt?: number;
    };
  }

  export function loadModel(options: LoadModelOptions): Promise<string>;
  export function unloadModel(options: { modelId: string }): Promise<void>;
  export function completion(
    options: CompletionOptions
  ): AsyncIterable<string | { token?: string; text?: string }> | Promise<{ text: string }>;
  export function embed(options: EmbedOptions): Promise<EmbedResult>;
  export function createVectorIndex(options: { dim: number }): Promise<TurboVecIndex>;
  export function loadVectorIndex(options: { path: string }): Promise<TurboVecIndex>;
  export function getSystemResources(options?: { sample?: boolean }): Promise<SystemResourcesSample>;

  export const profiler: {
    enable(options: { mode: 'basic' | 'verbose'; includeResourceGauges?: boolean }): void;
    exportJSON(): {
      recentEvents?: Array<{
        op?: string;
        durationMs?: number;
        ts?: number;
        backend?: { device?: string; api?: string };
        resources?: Record<string, unknown>;
      }>;
    };
  };
}

declare module '@tetherto/wdk' {
  export default class WDK {
    constructor(seedPhrase: string);
    registerWallet(chain: string, managerClass: unknown, config?: Record<string, unknown>): this;
    getAccount(chain: string, index: number): Promise<{
      getAddress(): Promise<string>;
      signMessage?(message: string): Promise<string>;
    }>;
    dispose(): void;
  }
}

declare module '@tetherto/wdk-wallet-evm' {
  export class WalletAccountEvm {
    constructor(seedOrSigner: string, config?: Record<string, unknown>);
    getAddress(): Promise<string>;
    signMessage(message: string): Promise<string>;
  }
  const WalletManagerEvm: unknown;
  export default WalletManagerEvm;
}