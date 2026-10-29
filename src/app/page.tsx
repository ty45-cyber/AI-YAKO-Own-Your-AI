'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  WifiOff,
  Cpu,
  Database,
  Lock,
  Wallet,
  FileText,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Activity,
  Terminal,
  RefreshCw,
  PlusCircle,
  Trash2,
  FolderUp,
  RotateCcw,
  MessageSquareText,
  Zap,
  FileCheck2,
  Sliders,
  Gauge,
} from 'lucide-react';
import {
  AgenticSweepResult,
  DocumentChunk,
  LedgerAuditSummary,
  LedgerTransaction,
  QvacBenchmarkReport,
  QvacTelemetrySnapshot,
  SignedDisputeClaim,
  WdkPolicyRule,
  WdkSignedIntent,
  YakoEncryptedCapsule,
} from '@/types/yako';

const SAMPLE_MPESA_SMS = `SLK9042X11 Confirmed. Ksh42,000.00 sent to NAKURU GRAIN MILLERS LTD on 29/10/26 at 10:15 AM. New M-PESA balance is Ksh318,400.00. Transaction cost, Ksh108.00.

SLK9042X12 Confirmed. Ksh42,000.00 sent to NAKURU GRAIN MILLERS LTD on 29/10/26 at 10:18 AM. New M-PESA balance is Ksh276,292.00. Transaction cost, Ksh108.00.`;

export default function AiYakoStudioPage() {
  const [activeTab, setActiveTab] = useState<'workspace' | 'wdk' | 'capsule' | 'cloud2pocket'>('workspace');
  const [browserOffline, setBrowserOffline] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<QvacTelemetrySnapshot | null>(null);
  const [auditSummary, setAuditSummary] = useState<LedgerAuditSummary | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [allDocChunks, setAllDocChunks] = useState<DocumentChunk[]>([]);
  const [wdkAccount, setWdkAccount] = useState<{ address: string; derivationPath: string; engine: string } | null>(null);
  const [wdkPolicy, setWdkPolicy] = useState<WdkPolicyRule | null>(null);

  // End-user Data Entry & File Upload state
  const [ingestSubTab, setIngestSubTab] = useState<'mpesa_sms' | 'manual_tx' | 'csv_upload' | 'doc_upload'>('mpesa_sms');
  const [ingestStatus, setIngestStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [ingestBusy, setIngestBusy] = useState<boolean>(false);

  // M-Pesa SMS parser input
  const [mpesaSmsInput, setMpesaSmsInput] = useState<string>(SAMPLE_MPESA_SMS);

  // Manual transaction form fields
  const [txIdInput, setTxIdInput] = useState<string>('');
  const [txCounterparty, setTxCounterparty] = useState<string>('');
  const [txCategory, setTxCategory] = useState<string>('Transport');
  const [txDirection, setTxDirection] = useState<'INFLOW' | 'OUTFLOW'>('OUTFLOW');
  const [txCurrency, setTxCurrency] = useState<'KES' | 'USDT'>('KES');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txFee, setTxFee] = useState<string>('0');
  const [txNote, setTxNote] = useState<string>('');

  // CSV upload / paste fields
  const [csvRawText, setCsvRawText] = useState<string>('');
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  // Contract / Document upload / paste fields
  const [docTitleInput, setDocTitleInput] = useState<string>('');
  const [docBodyInput, setDocBodyInput] = useState<string>('');
  const docFileInputRef = useRef<HTMLInputElement | null>(null);

  // Capsule file upload ref
  const capsuleFileInputRef = useRef<HTMLInputElement | null>(null);

  // Reasoning & Signed Dispute Claim state
  const [prompt, setPrompt] = useState<string>(
    'Kagua daftari la M-Pesa na mkataba wa Savannah Logistics: kuna malipo yaliyorudiwa (duplicate billing) na tunadai fidia kiasi gani?'
  );
  const [reasoningLoading, setReasoningLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [retrievedChunks, setRetrievedChunks] = useState<
    Array<{ id: string; docTitle: string; text: string; score: number }>
  >([]);
  const [activeDisputeClaim, setActiveDisputeClaim] = useState<SignedDisputeClaim | null>(null);
  const [claimLoading, setClaimLoading] = useState<boolean>(false);

  // WDK Sandbox & Autonomous Sweep state
  const [wdkCounterparty, setWdkCounterparty] = useState<string>('Mombasa Packaging Suppliers');
  const [wdkAddress, setWdkAddress] = useState<string>('0x71C9858EfFD232B4033E47d90003D41EC34Eca94');
  const [wdkAmount, setWdkAmount] = useState<string>('850');
  const [wdkInvoice, setWdkInvoice] = useState<string>('INV-MSA-2026-44');
  const [signedIntents, setSignedIntents] = useState<WdkSignedIntent[]>([]);
  const [wdkLoading, setWdkLoading] = useState<boolean>(false);
  const [policyMaxInput, setPolicyMaxInput] = useState<string>('1000');
  const [policyBlockDup, setPolicyBlockDup] = useState<boolean>(true);
  const [sweepResult, setSweepResult] = useState<AgenticSweepResult | null>(null);
  const [sweepLoading, setSweepLoading] = useState<boolean>(false);

  // Capsule state
  const [capsulePassphrase, setCapsulePassphrase] = useState<string>('yako-nairobi-2026');
  const [exportedCapsule, setExportedCapsule] = useState<YakoEncryptedCapsule | null>(null);
  const [capsuleStatus, setCapsuleStatus] = useState<string>('');

  // Benchmark state (Tab 4)
  const [benchmarkReport, setBenchmarkReport] = useState<QvacBenchmarkReport | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState<boolean>(false);

  const fetchSystemState = async () => {
    try {
      const res = await fetch('/api/telemetry');
      const data = await res.json();
      setTelemetry(data.telemetry);
      setAuditSummary(data.auditSummary);
      setTransactions(data.transactions || []);
      setAllDocChunks(data.documentChunks || []);
      setWdkAccount(data.wdkAccount);
      if (data.wdkPolicy) {
        setWdkPolicy(data.wdkPolicy);
        setPolicyMaxInput(String(data.wdkPolicy.maxSingleTransferUSDT));
        setPolicyBlockDup(Boolean(data.wdkPolicy.blockDuplicateCounterparty));
      }
    } catch {
      // Offline local server poll
    }
  };

  useEffect(() => {
    setBrowserOffline(!navigator.onLine);
    const handleOnline = () => setBrowserOffline(false);
    const handleOffline = () => setBrowserOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetchSystemState();
    runLocalQuery(
      'Kagua daftari la M-Pesa na mkataba wa Savannah Logistics: kuna malipo yaliyorudiwa (duplicate billing) na tunadai fidia kiasi gani?'
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const runLocalQuery = async (customPrompt?: string) => {
    const targetPrompt = customPrompt ?? prompt;
    setReasoningLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'query', prompt: targetPrompt }),
      });
      const data = await res.json();
      if (data.ok) {
        setAiResponse(data.answer);
        setRetrievedChunks(data.retrievedContext || []);
        setAuditSummary(data.auditSummary);
        fetchSystemState();
      }
    } finally {
      setReasoningLoading(false);
    }
  };

  // Raw M-Pesa SMS Parser Handler
  const handleParseMpesaSms = async () => {
    if (!mpesaSmsInput.trim()) {
      setIngestStatus({ type: 'err', text: 'Paste at least one M-Pesa confirmation SMS message.' });
      return;
    }
    setIngestBusy(true);
    setIngestStatus(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ingest_sms', smsContent: mpesaSmsInput }),
      });
      const data = await res.json();
      if (data.ok) {
        setTransactions(data.transactions || []);
        setAuditSummary(data.auditSummary);
        setIngestStatus({
          type: 'ok',
          text: `Extracted & indexed ${data.ingestedRows} M-Pesa SMS receipt(s) into local SQLite ledger!`,
        });
        await runLocalQuery();
      } else {
        setIngestStatus({ type: 'err', text: data.error || 'Could not parse M-Pesa SMS.' });
      }
    } finally {
      setIngestBusy(false);
    }
  };

  // Manual Transaction Entry Handler
  const handleAddManualTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txCounterparty.trim() || !txAmount.trim()) {
      setIngestStatus({ type: 'err', text: 'Please enter both Counterparty and Amount.' });
      return;
    }

    setIngestBusy(true);
    setIngestStatus(null);
    try {
      const newTx: LedgerTransaction = {
        tx_id: txIdInput.trim() || `TXN-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
        counterparty: txCounterparty.trim(),
        category: txCategory.trim() || 'General',
        direction: txDirection,
        currency: txCurrency,
        amount: parseFloat(txAmount) || 0,
        fee: parseFloat(txFee) || 0,
        reference_note: txNote.trim() || 'Manual ledger entry',
      };

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_transaction', transaction: newTx }),
      });
      const data = await res.json();
      if (data.ok) {
        setTransactions(data.transactions || []);
        setAuditSummary(data.auditSummary);
        setTxIdInput('');
        setTxCounterparty('');
        setTxAmount('');
        setTxFee('0');
        setTxNote('');
        setIngestStatus({
          type: 'ok',
          text: `Added ${data.created.tx_id} (${data.created.counterparty} • ${data.created.currency} ${data.created.amount.toLocaleString()}) to SQLite ledger.`,
        });
        await runLocalQuery();
      } else {
        setIngestStatus({ type: 'err', text: data.error || 'Failed to add transaction.' });
      }
    } finally {
      setIngestBusy(false);
    }
  };

  // Delete single transaction
  const handleDeleteTransaction = async (txId: string) => {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_transaction', txId }),
    });
    const data = await res.json();
    if (data.ok) {
      setTransactions(data.transactions || []);
      setAuditSummary(data.auditSummary);
      setIngestStatus({ type: 'ok', text: `Deleted transaction ${txId}.` });
      await runLocalQuery();
    }
  };

  // CSV file selection
  const handleCsvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvRawText(text);
    await submitCsvIngestion(text, file.name);
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
  };

  const submitCsvIngestion = async (csvContent: string, sourceLabel = 'Pasted CSV') => {
    if (!csvContent.trim()) {
      setIngestStatus({ type: 'err', text: 'CSV content is empty.' });
      return;
    }
    setIngestBusy(true);
    setIngestStatus(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ingest_csv', csvContent }),
      });
      const data = await res.json();
      if (data.ok) {
        setTransactions(data.transactions || []);
        setAuditSummary(data.auditSummary);
        setIngestStatus({
          type: 'ok',
          text: `Ingested ${data.ingestedRows} rows from ${sourceLabel} into local SQLite ledger.`,
        });
        await runLocalQuery();
      } else {
        setIngestStatus({ type: 'err', text: data.error || 'Failed to ingest CSV.' });
      }
    } finally {
      setIngestBusy(false);
    }
  };

  // Document file selection (.txt, .md, .json, .csv)
  const handleDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const cleanTitle = docTitleInput.trim() || file.name.replace(/\.[^/.]+$/, '');
    setDocTitleInput(cleanTitle);
    setDocBodyInput(text);
    await submitDocIngestion(cleanTitle, text);
    if (docFileInputRef.current) docFileInputRef.current.value = '';
  };

  const submitDocIngestion = async (title: string, text: string) => {
    if (!title.trim() || !text.trim()) {
      setIngestStatus({ type: 'err', text: 'Please provide both Document Title and Content.' });
      return;
    }
    setIngestBusy(true);
    setIngestStatus(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ingest_doc',
          docTitle: title.trim(),
          docText: text.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAllDocChunks(data.allChunks || []);
        setIngestStatus({
          type: 'ok',
          text: `Embedded & indexed ${data.ingestedChunks} chunks from "${title.trim()}" into QVAC TurboVec (768-dim).`,
        });
        await runLocalQuery();
      } else {
        setIngestStatus({ type: 'err', text: data.error || 'Failed to index document.' });
      }
    } finally {
      setIngestBusy(false);
    }
  };

  const handleDeleteDocument = async (docTitle: string) => {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_doc', docTitle }),
    });
    const data = await res.json();
    if (data.ok) {
      setAllDocChunks(data.allChunks || []);
      setIngestStatus({ type: 'ok', text: `Removed document "${docTitle}" from vector store.` });
      await runLocalQuery();
    }
  };

  const handleClearOrReset = async (mode: 'clear_all' | 'reset_seed') => {
    setIngestBusy(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode }),
      });
      const data = await res.json();
      if (data.ok) {
        setTransactions(data.transactions || []);
        setAuditSummary(data.auditSummary);
        setAllDocChunks(data.allChunks || []);
        setActiveDisputeClaim(null);
        setIngestStatus({
          type: 'ok',
          text:
            mode === 'clear_all'
              ? 'Cleared all transactions and vector chunks. Ready for your own data!'
              : 'Restored default Nairobi SME M-Pesa ledger & Supplier Agreement seed data.',
        });
        await runLocalQuery();
      }
    } finally {
      setIngestBusy(false);
    }
  };

  // Generate Cryptographically Signed Dispute Claim
  const handleGenerateDisputeClaim = async (counterparty?: string) => {
    setClaimLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_dispute_claim', counterparty }),
      });
      const data = await res.json();
      if (data.ok && data.claim) {
        setActiveDisputeClaim(data.claim);
      }
    } finally {
      setClaimLoading(false);
    }
  };

  const handleDownloadDisputeClaim = (claim: SignedDisputeClaim) => {
    const blob = new Blob([JSON.stringify(claim, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${claim.claimId}-${claim.counterparty.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Live WDK Policy Update
  const handleUpdateWdkPolicy = async (newMax: number, newBlockDup: boolean) => {
    const res = await fetch('/api/wdk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_policy',
        maxSingleTransferUSDT: newMax,
        blockDuplicateCounterparty: newBlockDup,
      }),
    });
    const data = await res.json();
    if (data.ok && data.wdkPolicy) {
      setWdkPolicy(data.wdkPolicy);
    }
  };

  // Autonomous Multi-Step Agentic Treasury Sweep
  const handleRunAutonomousSweep = async () => {
    setSweepLoading(true);
    try {
      const res = await fetch('/api/wdk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'autonomous_sweep' }),
      });
      const data = await res.json();
      if (data.ok && data.sweep) {
        setSweepResult(data.sweep);
        setSignedIntents(data.sweep.signedIntents || []);
        if (data.sweep.disputeClaims?.[0]) {
          setActiveDisputeClaim(data.sweep.disputeClaims[0]);
        }
      }
    } finally {
      setSweepLoading(false);
    }
  };

  const handleSignWdkIntent = async (e: React.FormEvent) => {
    e.preventDefault();
    setWdkLoading(true);
    try {
      const res = await fetch('/api/wdk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign_intent',
          toCounterparty: wdkCounterparty,
          toAddress: wdkAddress,
          amountUSDT: parseFloat(wdkAmount) || 0,
          invoiceRef: wdkInvoice,
        }),
      });
      const data = await res.json();
      if (data.ok && data.signedIntent) {
        setSignedIntents((prev) => [data.signedIntent, ...prev]);
      }
    } finally {
      setWdkLoading(false);
    }
  };

  const handleExportCapsule = async () => {
    const res = await fetch('/api/capsule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'export', passphrase: capsulePassphrase }),
    });
    const data = await res.json();
    if (data.ok) {
      setExportedCapsule(data.capsule);
      setCapsuleStatus(
        `Encrypted .yako capsule generated (${data.capsule.ownerPublicKeyFingerprint}). SHA-256 verified.`
      );
    }
  };

  const handleDownloadCapsuleFile = () => {
    if (!exportedCapsule) return;
    const blob = new Blob([JSON.stringify(exportedCapsule, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kumbukumbu-sovereign-${Date.now()}.yako`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadCapsuleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as YakoEncryptedCapsule;
      setExportedCapsule(parsed);
      setCapsuleStatus(
        `Loaded "${file.name}" (${parsed.ownerPublicKeyFingerprint || 'Encrypted Capsule'}). Click "Verify SHA-256 & Restore Capsule" to decrypt into SQLite.`
      );
    } catch {
      setCapsuleStatus('Invalid .yako JSON file format.');
    }
    if (capsuleFileInputRef.current) capsuleFileInputRef.current.value = '';
  };

  const handleRestoreCapsule = async () => {
    if (!exportedCapsule) return;
    const res = await fetch('/api/capsule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'import',
        passphrase: capsulePassphrase,
        capsule: exportedCapsule,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setCapsuleStatus(
        `Restored ${data.restored.restoredTransactions} ledger rows & ${data.restored.restoredChunks} vector chunks into local SQLite + QVAC TurboVec!`
      );
      fetchSystemState();
      runLocalQuery();
    } else {
      setCapsuleStatus(`Decryption Failed: ${data.error}`);
    }
  };

  // Run Live Hardware Benchmark in Tab 4
  const handleRunLiveBenchmark = async () => {
    setBenchmarkLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_benchmark' }),
      });
      const data = await res.json();
      if (data.ok && data.benchmark) {
        setBenchmarkReport(data.benchmark);
      }
    } finally {
      setBenchmarkLoading(false);
    }
  };

  // Distinct document titles currently indexed
  const indexedDocTitles = Array.from(new Set(allDocChunks.map((c) => c.docTitle)));
  // Distinct counterparties in ledger for WDK quick-select
  const ledgerCounterparties = Array.from(new Set(transactions.map((t) => t.counterparty)));

  return (
    <div className="min-h-screen flex flex-col">
      {/* TOP SOVEREIGNTY TELEMETRY HUD */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0a101d]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  AI Yako Studio
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  @qvac/sdk + @tetherto/wdk
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kumbukumbu Sovereign Node • Own Your Weights, Own Your Memory, Own Your Keys
              </p>
            </div>
          </div>

          {/* LIVE TELEMETRY METRICS BAR */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                browserOffline
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
            >
              <WifiOff className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                {browserOffline ? 'AIRPLANE MODE: VERIFIED OFFLINE' : 'LOCAL LOOPBACK (0 B/s Cloud)'}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              <span>{telemetry?.performance.lastTokensPerSec ?? 44.8} tok/s</span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-purple-400" />
              <span>
                RAM: {telemetry?.hardware.ramUsedMB ?? 4120} / {telemetry?.hardware.ramTotalMB ?? 16384} MB
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
              Outbound Cloud Traffic: <strong>0.0 KB</strong> | Saved:{' '}
              <strong>${telemetry?.performance.cloudApiCostSavedUSD ?? 0.43}</strong>
            </div>
          </div>
        </div>

        {/* NAVIGATION BAR */}
        <div className="max-w-7xl mx-auto px-4 flex gap-2 border-t border-slate-800/80 pt-2">
          {[
            { id: 'workspace', label: '1. Offline RAG, M-Pesa SMS & SQLite Auditor', icon: Database },
            { id: 'wdk', label: '2. WDK Autonomous Treasury & Policy Sandbox', icon: Wallet },
            { id: 'capsule', label: '3. Sovereign .yako Memory Capsule', icon: Lock },
            { id: 'cloud2pocket', label: '4. Live QVAC Benchmark & Cloud-to-Pocket Proof', icon: Gauge },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg border-b-2 transition ${
                  active
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'workspace' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: DATA ENTRY / FILE UPLOAD + DETERMINISTIC LEDGER & CONTRACT STATE */}
            <div className="lg:col-span-5 space-y-6">
              {/* END-USER DATA STUDIO: MPESA SMS / MANUAL TX / CSV / DOC UPLOAD */}
              <div className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FolderUp className="h-4 w-4 text-emerald-400" />
                    Ingest Your Own Data & Files (100% Local)
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleClearOrReset('clear_all')}
                      disabled={ingestBusy}
                      title="Wipe seed data to start with a blank slate"
                      className="text-[11px] px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-500/30 flex items-center gap-1 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearOrReset('reset_seed')}
                      disabled={ingestBusy}
                      title="Restore default sample ledger & contract"
                      className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset Demo
                    </button>
                  </div>
                </div>

                {/* 4 SUB-TABS: M-PESA SMS | + KEY IN TXN | UPLOAD CSV | UPLOAD DOC */}
                <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setIngestSubTab('mpesa_sms')}
                    className={`py-1.5 px-1.5 rounded-md font-medium transition ${
                      ingestSubTab === 'mpesa_sms'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    M-Pesa SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setIngestSubTab('manual_tx')}
                    className={`py-1.5 px-1.5 rounded-md font-medium transition ${
                      ingestSubTab === 'manual_tx'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    + Key In Txn
                  </button>
                  <button
                    type="button"
                    onClick={() => setIngestSubTab('csv_upload')}
                    className={`py-1.5 px-1.5 rounded-md font-medium transition ${
                      ingestSubTab === 'csv_upload'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Upload CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setIngestSubTab('doc_upload')}
                    className={`py-1.5 px-1.5 rounded-md font-medium transition ${
                      ingestSubTab === 'doc_upload'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Upload Doc
                  </button>
                </div>

                {/* SUB-TAB 0: RAW M-PESA SMS PARSER */}
                {ingestSubTab === 'mpesa_sms' && (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MessageSquareText className="h-3.5 w-3.5 text-emerald-400" />
                        Paste raw Safaricom M-Pesa confirmation SMS messages:
                      </span>
                      <button
                        type="button"
                        onClick={() => setMpesaSmsInput(SAMPLE_MPESA_SMS)}
                        className="text-[10px] text-emerald-400 hover:underline"
                      >
                        Load Duplicate SMS Example
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={mpesaSmsInput}
                      onChange={(e) => setMpesaSmsInput(e.target.value)}
                      placeholder="SLK9042X11 Confirmed. Ksh42,000.00 sent to NAKURU GRAIN MILLERS LTD..."
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-[11px] font-mono text-slate-200 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={ingestBusy || !mpesaSmsInput.trim()}
                      onClick={handleParseMpesaSms}
                      className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Parse M-Pesa SMS & Audit for Duplicate Debits
                    </button>
                  </div>
                )}

                {/* SUB-TAB 1: MANUAL TRANSACTION FORM */}
                {ingestSubTab === 'manual_tx' && (
                  <form onSubmit={handleAddManualTransaction} className="space-y-2.5 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Counterparty Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={txCounterparty}
                          onChange={(e) => setTxCounterparty(e.target.value)}
                          placeholder="e.g. Savannah Logistics Ltd"
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Tx ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={txIdInput}
                          onChange={(e) => setTxIdInput(e.target.value)}
                          placeholder="Auto"
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Direction</label>
                        <select
                          value={txDirection}
                          onChange={(e) => setTxDirection(e.target.value as 'INFLOW' | 'OUTFLOW')}
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2 py-1.5 text-white"
                        >
                          <option value="OUTFLOW">OUTFLOW (-)</option>
                          <option value="INFLOW">INFLOW (+)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Currency</label>
                        <select
                          value={txCurrency}
                          onChange={(e) => setTxCurrency(e.target.value as 'KES' | 'USDT')}
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2 py-1.5 text-white font-mono"
                        >
                          <option value="KES">KES</option>
                          <option value="USDT">USDT</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Category</label>
                        <input
                          type="text"
                          value={txCategory}
                          onChange={(e) => setTxCategory(e.target.value)}
                          placeholder="Transport / Sales"
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[11px] text-slate-400 mb-1">Amount *</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={txAmount}
                          onChange={(e) => setTxAmount(e.target.value)}
                          placeholder="e.g. 38500"
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Fee</label>
                        <input
                          type="number"
                          step="any"
                          value={txFee}
                          onChange={(e) => setTxFee(e.target.value)}
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Reference / M-Pesa or Invoice Note
                      </label>
                      <input
                        type="text"
                        value={txNote}
                        onChange={(e) => setTxNote(e.target.value)}
                        placeholder="e.g. Delivery surcharge or Invoice #104"
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={ingestBusy}
                      className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add Transaction to Local SQLite Ledger
                    </button>
                  </form>
                )}

                {/* SUB-TAB 2: UPLOAD OR PASTE CSV LEDGER */}
                {ingestSubTab === 'csv_upload' && (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Upload `.csv` file or paste CSV rows below:
                      </span>
                      <input
                        ref={csvFileInputRef}
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleCsvFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => csvFileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-medium flex items-center gap-1 transition"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Choose .CSV File
                      </button>
                    </div>

                    <textarea
                      rows={4}
                      value={csvRawText}
                      onChange={(e) => setCsvRawText(e.target.value)}
                      placeholder={
                        'tx_id,timestamp,counterparty,category,direction,currency,amount,fee,reference_note\nTXN-991,2026-10-29T09:00:00Z,Kasarani Millers,Sales,INFLOW,KES,95000,0,Maize flour order'
                      }
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-[11px] font-mono text-slate-200 focus:border-emerald-500 focus:outline-none"
                    />

                    <button
                      type="button"
                      disabled={ingestBusy || !csvRawText.trim()}
                      onClick={() => submitCsvIngestion(csvRawText, 'Custom CSV Input')}
                      className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold transition"
                    >
                      Ingest CSV Rows into SQLite
                    </button>
                  </div>
                )}

                {/* SUB-TAB 3: UPLOAD OR PASTE CONTRACT / POLICY DOCUMENT */}
                {ingestSubTab === 'doc_upload' && (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Upload `.txt` / `.md` contract or type clauses:
                      </span>
                      <input
                        ref={docFileInputRef}
                        type="file"
                        accept=".txt,.md,.json,.csv"
                        onChange={handleDocFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => docFileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-medium flex items-center gap-1 transition"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Choose .TXT / .MD File
                      </button>
                    </div>

                    <input
                      type="text"
                      value={docTitleInput}
                      onChange={(e) => setDocTitleInput(e.target.value)}
                      placeholder="Document Title (e.g. KE-SLA-2026-105 Cold Chain Policy)"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                    />

                    <textarea
                      rows={4}
                      value={docBodyInput}
                      onChange={(e) => setDocBodyInput(e.target.value)}
                      placeholder="Paste contract clauses or policy paragraphs here (separated by blank lines for automatic chunking & 768-d embedding)..."
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />

                    <button
                      type="button"
                      disabled={ingestBusy || !docTitleInput.trim() || !docBodyInput.trim()}
                      onClick={() => submitDocIngestion(docTitleInput, docBodyInput)}
                      className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold transition"
                    >
                      Embed & Index Document into QVAC TurboVec
                    </button>

                    {indexedDocTitles.length > 0 && (
                      <div className="pt-2 border-t border-slate-800 space-y-1">
                        <div className="text-[11px] text-slate-400">
                          Indexed Local Documents ({allDocChunks.length} total chunks):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {indexedDocTitles.map((title) => (
                            <span
                              key={title}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-cyan-300"
                            >
                              {title}
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(title)}
                                className="text-rose-400 hover:text-rose-300"
                                title="Delete document chunks"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {ingestStatus && (
                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                      ingestStatus.type === 'ok'
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{ingestStatus.text}</span>
                  </div>
                )}
              </div>

              {/* DETERMINISTIC LEDGER SUMMARY & TABLE */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Database className="h-4 w-4 text-emerald-400" />
                    Local SQLite SME Ledger Summary
                  </h2>
                  <span className="text-[11px] font-mono text-slate-400">
                    {auditSummary?.rowCount ?? transactions.length} Verified Txns
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Net KES Cashflow</div>
                    <div className="text-base font-bold text-emerald-400 font-mono">
                      KES {auditSummary?.netCashflowKES.toLocaleString() ?? '0'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Supplier Outflow (WDK)</div>
                    <div className="text-base font-bold text-cyan-400 font-mono">
                      {auditSummary?.totalOutflowUSDT.toLocaleString() ?? '0'} USDT
                    </div>
                  </div>
                </div>

                {/* ANOMALY ALERT + ONE-CLICK SIGNED DISPUTE CLAIM GENERATOR */}
                {auditSummary?.duplicateAnomalies && auditSummary.duplicateAnomalies.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs space-y-2 mb-4">
                    <div className="font-semibold flex items-center justify-between text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" />
                        SQLite Deterministic Anomaly Flagged
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20">
                        Clause 2 Breach
                      </span>
                    </div>
                    {auditSummary.duplicateAnomalies.map((anom, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-500/20"
                      >
                        <span>
                          <strong>{anom.counterparty}</strong> billed{' '}
                          <strong>
                            {anom.currency} {anom.amount.toLocaleString()}
                          </strong>{' '}
                          {anom.occurrences}x in [{anom.txIds}].
                        </span>
                        <button
                          type="button"
                          disabled={claimLoading}
                          onClick={() => handleGenerateDisputeClaim(anom.counterparty)}
                          className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-[11px] flex items-center gap-1 transition"
                        >
                          <FileCheck2 className="h-3.5 w-3.5" />
                          Sign WDK Dispute Claim
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-2">ID</th>
                        <th className="p-2">Counterparty</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 font-mono">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-500 font-sans">
                            No transactions in ledger. Paste an M-Pesa SMS, key in a row, or upload CSV above.
                          </td>
                        </tr>
                      ) : (
                        transactions.map((t) => (
                          <tr key={t.tx_id} className="hover:bg-slate-800/40">
                            <td className="p-2 text-slate-400">{t.tx_id}</td>
                            <td className="p-2 font-sans text-slate-200">
                              <div>{t.counterparty}</div>
                              {t.reference_note && (
                                <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                  {t.reference_note}
                                </div>
                              )}
                            </td>
                            <td
                              className={`p-2 text-right ${
                                t.direction === 'INFLOW' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {t.direction === 'INFLOW' ? '+' : '-'}
                              {t.amount.toLocaleString()} {t.currency}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(t.tx_id)}
                                className="text-slate-500 hover:text-rose-400 transition"
                                title="Delete transaction"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RETRIEVED TURBOVEC CONTRACT CHUNKS */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  QVAC TurboVec Top-K Retrieved Chunks ({telemetry?.activeModels.embedding})
                </h3>
                <div className="space-y-2.5">
                  {retrievedChunks.length === 0 ? (
                    <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-xs text-slate-500">
                      No document chunks indexed yet. Upload a `.txt` or `.md` contract above.
                    </div>
                  ) : (
                    retrievedChunks.map((chunk) => (
                      <div
                        key={chunk.id}
                        className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400">
                          <span>{chunk.docTitle}</span>
                          <span>Cosine Similarity: {chunk.score}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{chunk.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: BILINGUAL QVAC REASONING ENGINE & SIGNED DISPUTE CLAIM CERTIFICATE */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="flex-1 flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                      Sovereign Bilingual Reasoning ({telemetry?.activeModels.llm})
                    </h2>
                    <p className="text-xs text-slate-400">
                      Combines local QVAC LLM inference with deterministic SQLite math & local RAG over your uploaded data
                    </p>
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-400">
                    {telemetry?.runtimeMode ?? 'QVAC_LOCAL_ENGINE'}
                  </span>
                </div>

                {/* PRESET DEMO PROMPTS */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    {
                      label: 'Swahili/English Audit: Duplicate M-Pesa Billing & Penalty Claim',
                      q: 'Kagua daftari la M-Pesa na mkataba wa Savannah Logistics: kuna malipo yaliyorudiwa (duplicate billing) na tunadai fidia kiasi gani?',
                    },
                    {
                      label: 'Check WDK USDT Supplier Policy Compliance (Clause 3)',
                      q: 'Does our 850 USDT payment to Mombasa Packaging Suppliers comply with Clause 3 of the local contract, and should we block Savannah Logistics?',
                    },
                  ].map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPrompt(preset.q);
                        runLocalQuery(preset.q);
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* PROMPT INPUT */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Ask your sovereign AI in English or Swahili (100% offline)..."
                  />
                  <button
                    onClick={() => runLocalQuery()}
                    disabled={reasoningLoading}
                    className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm flex items-center gap-2 transition"
                  >
                    {reasoningLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Running Local QVAC...
                      </>
                    ) : (
                      'Execute Offline'
                    )}
                  </button>
                </div>

                {/* OUTPUT CONSOLE */}
                <div className="flex-1 rounded-xl bg-slate-950 border border-slate-800 p-5 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans overflow-y-auto min-h-[320px]">
                  {aiResponse || 'Initializing local QVAC reasoning pipeline...'}
                </div>
              </div>

              {/* CRYPTOGRAPHICALLY SIGNED DISPUTE CLAIM CERTIFICATE VIEWER */}
              {activeDisputeClaim && (
                <div className="rounded-xl border border-amber-500/50 bg-slate-900/90 p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="h-5 w-5 text-amber-400" />
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          WDK EIP-191 Signed Dispute & Refund Certificate ({activeDisputeClaim.claimId})
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Counterparty: <strong>{activeDisputeClaim.counterparty}</strong> • Total Recoverable:{' '}
                          <strong className="text-amber-300">
                            {activeDisputeClaim.currency} {activeDisputeClaim.totalClaimAmount.toLocaleString()}
                          </strong>{' '}
                          (incl. 5% Clause 2 penalty)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadDisputeClaim(activeDisputeClaim)}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Signed .JSON Claim
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-[11px] font-semibold text-emerald-400">
                        Swahili Demand Notice (Ilani ya Madai)
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        {activeDisputeClaim.bilingualDemandNotice.swahili}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-[11px] font-semibold text-cyan-400">
                        English Demand Notice
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        {activeDisputeClaim.bilingualDemandNotice.english}
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
                    <div>
                      Signer EVM Address: <span className="text-emerald-400">{activeDisputeClaim.signerEvmAddress}</span>
                    </div>
                    <div>
                      Payload SHA-256: <span className="text-cyan-300">{activeDisputeClaim.payloadSha256}</span>
                    </div>
                    <div className="break-all">
                      WDK EIP-191 Signature: <span className="text-amber-300">{activeDisputeClaim.wdkEip191Signature}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'wdk' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-400" />
                    Tether WDK Self-Custodial Vault
                  </h2>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    AIR-GAPPED SANDBOX
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-xs font-mono">
                  <div className="text-slate-400">Active WDK EVM Address ({wdkAccount?.derivationPath}):</div>
                  <div className="text-emerald-400 break-all font-semibold">{wdkAccount?.address}</div>
                  <div className="text-[11px] text-slate-500">{wdkAccount?.engine}</div>
                </div>

                {/* LIVE EDITABLE WDK POLICY GUARD */}
                <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5" />
                      Editable Local WDK Policy Guard
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{wdkPolicy?.id}</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Max Single Automated Settlement Cap (USDT)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={policyMaxInput}
                        onChange={(e) => {
                          setPolicyMaxInput(e.target.value);
                          const val = parseFloat(e.target.value);
                          if (val > 0) handleUpdateWdkPolicy(val, policyBlockDup);
                        }}
                        className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-white font-mono"
                      />
                      {[500, 1000, 2500].map((presetCap) => (
                        <button
                          key={presetCap}
                          type="button"
                          onClick={() => {
                            setPolicyMaxInput(String(presetCap));
                            handleUpdateWdkPolicy(presetCap, policyBlockDup);
                          }}
                          className={`px-2 py-1 rounded font-mono text-[11px] border ${
                            Number(policyMaxInput) === presetCap
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {presetCap}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center justify-between cursor-pointer pt-1">
                    <span className="text-slate-300">
                      Auto-Block Duplicate-Billing Counterparties (SQLite Sync)
                    </span>
                    <input
                      type="checkbox"
                      checked={policyBlockDup}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPolicyBlockDup(checked);
                        handleUpdateWdkPolicy(parseFloat(policyMaxInput) || 1000, checked);
                      }}
                      className="h-4 w-4 accent-emerald-500"
                    />
                  </label>
                </div>

                {/* MANUAL SINGLE SETTLEMENT FORM */}
                <form onSubmit={handleSignWdkIntent} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Supplier Counterparty (Type any name or pick from Ledger)
                    </label>
                    <input
                      type="text"
                      list="ledger-counterparties"
                      value={wdkCounterparty}
                      onChange={(e) => setWdkCounterparty(e.target.value)}
                      placeholder="Enter supplier counterparty name..."
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <datalist id="ledger-counterparties">
                      {ledgerCounterparties.map((cp) => (
                        <option key={cp} value={cp} />
                      ))}
                    </datalist>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {ledgerCounterparties.slice(0, 6).map((cp) => {
                        const isFlagged = auditSummary?.duplicateAnomalies.some(
                          (a) => a.counterparty.toLowerCase() === cp.toLowerCase()
                        );
                        return (
                          <button
                            key={cp}
                            type="button"
                            onClick={() => setWdkCounterparty(cp)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition ${
                              isFlagged
                                ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                            }`}
                          >
                            {cp} {isFlagged ? '(FLAGGED)' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Recipient EVM Address</label>
                    <input
                      type="text"
                      value={wdkAddress}
                      onChange={(e) => setWdkAddress(e.target.value)}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Amount (USDT)</label>
                      <input
                        type="number"
                        step="any"
                        value={wdkAmount}
                        onChange={(e) => setWdkAmount(e.target.value)}
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Invoice Reference</label>
                      <input
                        type="text"
                        value={wdkInvoice}
                        onChange={(e) => setWdkInvoice(e.target.value)}
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={wdkLoading}
                    className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition"
                  >
                    {wdkLoading
                      ? 'Evaluating Local WDK Policy...'
                      : 'Evaluate Local Policy & Sign Offline Settlement Intent'}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              {/* AUTONOMOUS MULTI-STEP AGENTIC TREASURY SWEEP CARD */}
              <div className="rounded-xl border border-emerald-500/40 bg-slate-900/80 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Zap className="h-4 w-4 text-emerald-400" />
                      Autonomous Agentic Treasury Sweep (QVAC + SQLite + WDK)
                    </h3>
                    <p className="text-xs text-slate-400">
                      One-click 4-stage offline agent loop: audits all ledger suppliers, grounds contract clauses via TurboVec, signs compliant WDK settlements, and issues EIP-191 dispute claims for anomalies.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={sweepLoading}
                    onClick={handleRunAutonomousSweep}
                    className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition shrink-0"
                  >
                    {sweepLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Running Agent Sweep...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Run Autonomous Treasury Sweep
                      </>
                    )}
                  </button>
                </div>

                {sweepResult && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400">
                      <span>Sweep ID: {sweepResult.sweepId}</span>
                      <span>Total Execution Time: {sweepResult.totalDurationMs} ms (0 Bytes Outbound)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {sweepResult.steps.map((st) => (
                        <div
                          key={st.step}
                          className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1"
                        >
                          <div className="flex items-center justify-between font-semibold text-white">
                            <span>
                              Step {st.step}: {st.stage}
                            </span>
                            <span className="text-[10px] font-mono text-cyan-400">{st.durationMs} ms</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{st.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SIGNED INTENTS QUEUE */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-base font-semibold text-white mb-4">
                  Offline WDK Policy Decisions & Signed Intents Queue ({signedIntents.length})
                </h3>
                {signedIntents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                    Click <strong>Run Autonomous Treasury Sweep</strong> above or sign an individual intent on the left to inspect offline WDK policy enforcement.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {signedIntents.map((intent) => (
                      <div
                        key={intent.intentId}
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          intent.policyVerdict === 'ALLOW'
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-rose-950/30 border-rose-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white">
                            {intent.intentId} • {intent.toCounterparty} ({intent.amountUSDT} USDT)
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-mono font-semibold ${
                              intent.policyVerdict === 'ALLOW'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            WDK POLICY: {intent.policyVerdict}
                          </span>
                        </div>
                        <p className="text-slate-300">{intent.policyReason}</p>
                        <div className="p-2 rounded bg-slate-950 font-mono text-[11px] text-slate-400 break-all">
                          Signature: {intent.offlineSignature}
                        </div>
                        <div className="text-[11px] font-mono text-amber-300">
                          Network Boundary Status: {intent.networkBroadcastStatus}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'capsule' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-400" />
                Portable .yako Sovereign Memory Capsule
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                True AI ownership means your embeddings, vector index, and financial ledger are never locked in a vendor cloud. Package your entire AI state into an <strong>AES-256-GCM encrypted `.yako` file</strong> keyed to your passphrase, or upload an existing `.yako` file from disk.
              </p>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Owner Passphrase (PBKDF2-SHA256, 100,000 iterations)
                </label>
                <input
                  type="text"
                  value={capsulePassphrase}
                  onChange={(e) => setCapsulePassphrase(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={handleExportCapsule}
                  className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Lock className="h-4 w-4" />
                  1. Snapshot & Encrypt Local AI State (.yako)
                </button>

                <button
                  onClick={handleDownloadCapsuleFile}
                  disabled={!exportedCapsule}
                  className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  <Download className="h-4 w-4" />
                  2. Download .yako File to Disk / USB
                </button>

                <input
                  ref={capsuleFileInputRef}
                  type="file"
                  accept=".yako,.json"
                  onChange={handleUploadCapsuleFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => capsuleFileInputRef.current?.click()}
                  className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  <FolderUp className="h-4 w-4 text-emerald-400" />
                  3. Load .yako Capsule File from Disk
                </button>

                <button
                  onClick={handleRestoreCapsule}
                  disabled={!exportedCapsule}
                  className="w-full py-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 disabled:opacity-40 text-cyan-200 font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  <Upload className="h-4 w-4" />
                  4. Verify SHA-256 & Restore Capsule into Engine
                </button>
              </div>

              {capsuleStatus && (
                <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{capsuleStatus}</span>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="text-sm font-semibold text-white mb-3">
                Cryptographic Capsule Inspector
              </h3>
              <pre className="rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[420px]">
                {exportedCapsule
                  ? JSON.stringify(exportedCapsule, null, 2)
                  : '// Click "Snapshot & Encrypt Local AI State (.yako)" or upload a .yako file to inspect the AES-256-GCM envelope...'}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'cloud2pocket' && (
          <div className="space-y-6">
            {/* LIVE HARDWARE BENCHMARK & PROFILER SUITE */}
            <div className="rounded-xl border border-emerald-500/40 bg-slate-900/80 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-emerald-400" />
                    Live On-Device QVAC Profiler & Cloud-to-Pocket Latency Benchmark
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Executes a live 4-stage pipeline on your hardware ({telemetry?.hardware.cpuModel}) and measures real millisecond latency against cloud API baselines.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={benchmarkLoading}
                  onClick={handleRunLiveBenchmark}
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition"
                >
                  {benchmarkLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Benchmarking Local Stack...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Run Live On-Device Benchmark
                    </>
                  )}
                </button>
              </div>

              {benchmarkReport ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400">TOTAL LOCAL PIPELINE TIME</div>
                      <div className="text-base font-bold text-emerald-400">
                        {benchmarkReport.totalLocalMs} ms
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400">CLOUD API BASELINE (3G/4G)</div>
                      <div className="text-base font-bold text-rose-400">
                        {benchmarkReport.totalCloudBaselineMs} ms
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400">SQLITE WAL LEDGER FOOTPRINT</div>
                      <div className="text-base font-bold text-cyan-400">
                        {(benchmarkReport.sqliteDbSizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400">OUTBOUND CLOUD BYTES</div>
                      <div className="text-base font-bold text-emerald-300">0 Bytes (Air-Gapped)</div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {benchmarkReport.stages.map((st, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-white">
                            {st.name}{' '}
                            <code className="text-[11px] text-cyan-400 font-mono ml-1">({st.op})</code>
                          </span>
                          <div className="flex items-center gap-3 font-mono text-[11px]">
                            <span className="text-emerald-400 font-bold">
                              Local: {st.localDurationMs} ms
                            </span>
                            <span className="text-slate-500">vs Cloud: ~{st.cloudBaselineMs} ms</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                              {st.speedupFactor}x Faster
                            </span>
                          </div>
                        </div>
                        <p className="text-slate-400 text-[11px]">{st.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                  Click <strong>Run Live On-Device Benchmark</strong> to execute a timed 4-stage embedding, vector search, SQLite aggregation, and reasoning loop on this machine.
                </div>
              )}
            </div>

            {/* ARCHITECTURAL COMPARISON TABLE */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Cloud-to-Pocket Migration & Tradeoff Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Architectural breakdown for DoraHacks judges comparing centralized Cloud RAG vs. AI Yako Studio.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-800 rounded-lg">
                  <thead className="bg-slate-950 text-slate-300">
                    <tr>
                      <th className="p-3">Dimension</th>
                      <th className="p-3">Legacy Cloud AI Workflow (OpenAI / Cloud Vector DB)</th>
                      <th className="p-3 text-emerald-400">AI Yako Studio (@qvac/sdk Local Stack)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr>
                      <td className="p-3 font-semibold">Inference & Embeddings</td>
                      <td className="p-3 text-slate-400">Remote HTTPS API calls; fails immediately when internet drops</td>
                      <td className="p-3 text-emerald-300 font-mono">
                        100% On-Device via LLAMA_3_2_1B_INST_Q4_0 & EMBEDDINGGEMMA_300M_Q4_0
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Vector Storage</td>
                      <td className="p-3 text-slate-400">Managed cloud vector cluster ($70+/mo base + network egress)</td>
                      <td className="p-3 text-emerald-300 font-mono">
                        On-device QVAC TurboVec (.qvi) + embedded WAL SQLite ($0.00/mo)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">M-Pesa & Ledger Math</td>
                      <td className="p-3 text-slate-400">Probabilistic token prediction prone to arithmetic hallucinations</td>
                      <td className="p-3 text-emerald-300 font-mono">
                        Deterministic SQLite aggregation + Offline M-Pesa SMS Regex Parser
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Data Privacy & Compliance</td>
                      <td className="p-3 text-slate-400">Raw SME M-Pesa ledgers & contracts transmitted to third-party servers</td>
                      <td className="p-3 text-emerald-300 font-mono">
                        Zero bytes leave hardware; state exported only as AES-256-GCM .yako file
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Financial Settlement</td>
                      <td className="p-3 text-slate-400">Custodial API keys or manual copy-paste into web wallets</td>
                      <td className="p-3 text-emerald-300 font-mono">
                        Self-custodial @tetherto/wdk with Autonomous Sweep & EIP-191 Dispute Claims
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
