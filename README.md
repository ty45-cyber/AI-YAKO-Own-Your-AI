# AI Yako Studio (Kumbukumbu Engine)
**100% Offline Sovereign AI Workspace & Self-Custodial WDK Finance Node**  
*Built for AI Yako: Own Your AI | Tether QVAC Hackathon at Node NBO, Nairobi*

---

## 1. Overview & Problem Statement
Small and medium enterprises (SMEs), SACCOs, and field operators in Kenya and across emerging markets face three structural barriers with centralized cloud AI:
1. **Connectivity Fragility:** Cloud AI assistants fail completely when fiber or mobile data drops.
2. **Data Sovereignty & Compliance Risk:** Uploading customer M-Pesa statements, supplier contracts, and financial ledgers to foreign cloud LLM providers exposes sensitive business records.
3. **Recurring USD Token Bills & Zero Memory Ownership:** Users pay per token while the cloud vendor locks in their context history.

**AI Yako Studio (`Kumbukumbu Engine`)** solves this by moving the entire AI and financial verification stack onto hardware the user controls using **Tether's `@qvac/sdk`** and **`@tetherto/wdk`**:
* **Own Your Weights:** Local LLM completion (`LLAMA_3_2_1B_INST_Q4_0`) and local semantic embeddings (`EMBEDDINGGEMMA_300M_Q4_0`) via `@qvac/sdk`.
* **Own Your Accuracy:** Hybrid deterministic SQLite math + QVAC TurboVec (`createVectorIndex` / `loadVectorIndex`) so financial audits never hallucinate numbers.
* **Own Your Memory (`.yako` Capsule):** One-click export of your entire vector index and SQLite ledger into an **AES-256-GCM encrypted `.yako` file**.
* **Own Your Keys (`@tetherto/wdk`):** Self-custodial EVM/USDt account derivation and a local policy engine that automatically blocks settlements to counterparties with unresolved duplicate billing anomalies in the offline ledger.

---

## 2. QVAC & WDK Integration Manifest (Judge Verification)

| Component | Package & Version | Model / Primitive Used | Source File |
| :--- | :--- | :--- | :--- |
| **Local LLM & Embeddings** | `@qvac/sdk` (`^0.19.0`) | `loadModel`, `completion`, `embed`, `LLAMA_3_2_1B_INST_Q4_0`, `EMBEDDINGGEMMA_300M_Q4_0` | `src/lib/qvac-engine.ts` |
| **On-Device Vector Search** | `@qvac/sdk` (`^0.19.0`) | `createVectorIndex`, `loadVectorIndex` (`.qvi` snapshot) | `src/lib/qvac-engine.ts` |
| **Hardware & Profiler HUD** | `@qvac/sdk` (`^0.19.0`) | `getSystemResources({ sample: true })`, `profiler.enable` | `src/lib/qvac-engine.ts`, `src/app/api/telemetry/route.ts` |
| **Self-Custodial Finance** | `@tetherto/wdk` (`^1.0.0-beta.24`), `@tetherto/wdk-wallet-evm` | `WDK`, `WalletAccountEvm`, Local Policy Engine (`ALLOW`/`DENY`) | `src/lib/wdk-vault.ts` |
| **Encrypted Memory Capsule** | Node `crypto` + `better-sqlite3` | `AES-256-GCM`, `PBKDF2-SHA256`, `SHA-256` | `src/lib/yako-capsule.ts`, `src/lib/ledger-db.ts` |

---

## 3. Hardware Requirements & Model Licenses
* **Target Device & OS:** macOS (Apple Silicon M1/M2/M3/M4), Linux (Ubuntu 22.04+ x86_64/ARM64), or Windows 11.
* **Memory Needs:** Minimum 4 GB free RAM (approx. ~1.15 GB combined footprint for `LLAMA_3_2_1B_INST_Q4_0` + `EMBEDDINGGEMMA_300M_Q4_0` + TurboVec index).
* **Model Licenses:** Llama 3.2 1B Instruct (Llama 3.2 Community License), EmbeddingGemma 300M (Gemma Terms of Use), Codebase (Apache-2.0).
* **Network Boundary Disclosure:** All core AI features (ingestion, embeddings, TurboVec search, SQLite audit, LLM completion, `.yako` encryption, and WDK policy evaluation + message signing) operate **100% offline with Wi-Fi disabled**. Broadcasting a signed WDK transaction to a live blockchain RPC is strictly isolated behind an air-gapped boundary and is not required for the offline demo.

---

## 4. Reproducible Offline Setup Instructions

### Step 1: Install Dependencies (While Online)
```bash
npm install
Step 2: Prefetch & Cache QVAC Models to Disk (Before Turning Off Internet)
Bash
npm run prefetch-models
This downloads EMBEDDINGGEMMA_300M_Q4_0 and LLAMA_3_2_1B_INST_Q4_0 into ./.qvac-cache.

Step 3: Disconnect Wi-Fi (Airplane Mode) & Launch
Switch off Wi-Fi/Ethernet on your laptop, then run:

Bash
npm run dev
Open http://localhost:3000 to run the entire offline demonstration.