import { NextRequest, NextResponse } from 'next/server';
import { qvacEngine } from '@/lib/qvac-engine';
import { ledgerDB } from '@/lib/ledger-db';
import { wdkVault } from '@/lib/wdk-vault';
import { LedgerTransaction } from '@/types/yako';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      prompt,
      csvContent,
      smsContent,
      docTitle,
      docText,
      transaction,
      txId,
      counterparty,
    } = body as {
      action?:
        | 'query'
        | 'ingest_csv'
        | 'ingest_sms'
        | 'ingest_doc'
        | 'add_transaction'
        | 'delete_transaction'
        | 'delete_doc'
        | 'clear_all'
        | 'reset_seed'
        | 'generate_dispute_claim'
        | 'run_benchmark';
      prompt?: string;
      csvContent?: string;
      smsContent?: string;
      docTitle?: string;
      docText?: string;
      transaction?: LedgerTransaction;
      txId?: string;
      counterparty?: string;
    };

    if (action === 'add_transaction' && transaction) {
      const created = ledgerDB.addTransaction(transaction);
      return NextResponse.json({
        ok: true,
        created,
        auditSummary: ledgerDB.getAuditSummary(),
        transactions: ledgerDB.getAllTransactions(),
      });
    }

    if (action === 'delete_transaction' && txId) {
      ledgerDB.deleteTransaction(txId);
      return NextResponse.json({
        ok: true,
        auditSummary: ledgerDB.getAuditSummary(),
        transactions: ledgerDB.getAllTransactions(),
      });
    }

    if (action === 'ingest_csv' && csvContent) {
      const count = ledgerDB.ingestCsv(csvContent);
      const auditSummary = ledgerDB.getAuditSummary();
      return NextResponse.json({
        ok: true,
        ingestedRows: count,
        auditSummary,
        transactions: ledgerDB.getAllTransactions(),
      });
    }

    if (action === 'ingest_sms' && smsContent) {
      const parsed = ledgerDB.ingestMpesaSms(smsContent);
      const auditSummary = ledgerDB.getAuditSummary();
      return NextResponse.json({
        ok: true,
        ingestedRows: parsed.length,
        parsedTransactions: parsed,
        auditSummary,
        transactions: ledgerDB.getAllTransactions(),
      });
    }

    if (action === 'ingest_doc' && docTitle && docText) {
      const chunks = await qvacEngine.ingestDocument(docTitle, docText);
      return NextResponse.json({
        ok: true,
        ingestedChunks: chunks.length,
        allChunks: ledgerDB.getAllDocumentChunks(),
      });
    }

    if (action === 'delete_doc' && docTitle) {
      ledgerDB.deleteDocumentByTitle(docTitle);
      return NextResponse.json({
        ok: true,
        allChunks: ledgerDB.getAllDocumentChunks(),
      });
    }

    if (action === 'clear_all') {
      ledgerDB.clearAllData();
      return NextResponse.json({
        ok: true,
        auditSummary: ledgerDB.getAuditSummary(),
        transactions: ledgerDB.getAllTransactions(),
        allChunks: ledgerDB.getAllDocumentChunks(),
      });
    }

    if (action === 'reset_seed') {
      await qvacEngine.resetAndReseedDefaultData();
      return NextResponse.json({
        ok: true,
        auditSummary: ledgerDB.getAuditSummary(),
        transactions: ledgerDB.getAllTransactions(),
        allChunks: ledgerDB.getAllDocumentChunks(),
      });
    }

    if (action === 'generate_dispute_claim') {
      const claim = await wdkVault.generateSignedDisputeClaim(counterparty);
      return NextResponse.json({
        ok: true,
        claim,
      });
    }

    if (action === 'run_benchmark') {
      const benchmark = await qvacEngine.runLiveHardwareBenchmark();
      return NextResponse.json({
        ok: true,
        benchmark,
      });
    }

    const queryText =
      prompt?.trim() ||
      'Kagua daftari la M-Pesa na mkataba wa Savannah Logistics: kuna malipo yaliyorudiwa (duplicate billing) au faini gani?';

    const result = await qvacEngine.runSovereignReasoning(queryText);
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Local inference error' },
      { status: 500 }
    );
  }
}
