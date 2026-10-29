import { NextResponse } from 'next/server';
import { qvacEngine } from '@/lib/qvac-engine';
import { ledgerDB } from '@/lib/ledger-db';
import { wdkVault } from '@/lib/wdk-vault';

export async function GET() {
  const telemetry = await qvacEngine.getTelemetrySnapshot();
  const auditSummary = ledgerDB.getAuditSummary();
  const transactions = ledgerDB.getAllTransactions();
  const documentChunks = ledgerDB.getAllDocumentChunks();
  const wdkAccount = await wdkVault.deriveOfflineAccount();
  const wdkPolicy = wdkVault.getActivePolicy();

  return NextResponse.json({
    telemetry,
    auditSummary,
    transactions,
    documentChunks,
    wdkAccount,
    wdkPolicy,
  });
}
