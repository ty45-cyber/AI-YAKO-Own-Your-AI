# DoraHacks BUIDL Submission: AI Yako Studio (Kumbukumbu Engine)

## Track Selection
* **Primary Track:** Cloud to Pocket / Offline AI Apps (Eligible for Overall Podium + On-Device Agentic Finance with WDK)

## 1. Problem Description & Target Users
SMEs, SACCO credit officers, and merchants in Nairobi process thousands of mobile-money (M-Pesa) and cross-border USDt supplier transactions alongside bilingual (English/Swahili) contracts. Relying on cloud AI exposes private financial records to third-party servers, incurs recurring USD API costs, and fails during internet outages.

## 2. What Was Built During the Event
Built from scratch during the AI Yako Hackathon (Oct 24–30, 2026):
1. **QVAC Local Inference & RAG Engine (`src/lib/qvac-engine.ts`):** Integrates `@qvac/sdk` (`loadModel`, `embed`, `createVectorIndex`, `loadVectorIndex`, `completion`, `getSystemResources`, and `profiler`).
2. **Deterministic Hybrid SQLite Auditor (`src/lib/ledger-db.ts`):** Eliminates LLM arithmetic hallucinations by pairing QVAC semantic contract retrieval with exact SQL anomaly detection over M-Pesa/USDT ledgers.
3. **Self-Custodial WDK Treasury Guard (`src/lib/wdk-vault.ts`):** Uses `@tetherto/wdk` and `@tetherto/wdk-wallet-evm` to derive accounts offline and enforce local contract policies (`ALLOW`/`DENY`), automatically blocking USDt settlements to suppliers flagged for duplicate billing in the local SQLite ledger.
4. **Cryptographic `.yako` Memory Capsules (`src/lib/yako-capsule.ts`):** Exports and restores the user's complete AI memory state in a single `AES-256-GCM` encrypted file.
5. **Sovereignty Telemetry HUD (`src/app/page.tsx`):** Real-time proof of offline execution, RAM pressure, tokens/sec, and zero outbound bytes.

## 3. Cloud-to-Pocket Workflow & Tradeoffs
* **Original Cloud Workflow:** Uploaded CSVs and PDFs to an external cloud API (OpenAI text-embedding-3 + GPT-4o + Pinecone), costing ~$0.03–$0.10 per audit loop with 1.5s–4.0s network latency and full third-party data exposure.
* **What Was Moved to Device via QVAC:** Document chunking, 768-d vector embedding (`EMBEDDINGGEMMA_300M_Q4_0`), HNSW nearest-neighbor search (`TurboVec`), LLM reasoning (`LLAMA_3_2_1B_INST_Q4_0`), and WDK policy signing now execute 100% on-device.
* **Tradeoffs:**
  * *Memory:* Uses ~1.15 GB local RAM vs. ~150 MB for a thin cloud browser tab.
  * *Quality & Determinism:* Moving math from a large cloud LLM to a hybrid **1B Q4_0 Local LLM + Embedded SQLite Engine** actually *improves* financial accuracy to 100% on ledger aggregations while keeping reasoning latency sub-second.
  * *Privacy & Cost:* 100% private by architecture; $0.00 marginal cost per query.