import { NextRequest, NextResponse } from 'next/server';
import { wdkVault } from '@/lib/wdk-vault';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      toCounterparty,
      toAddress,
      amountUSDT,
      invoiceRef,
      maxSingleTransferUSDT,
      blockDuplicateCounterparty,
      requireContractClauseMatch,
    } = body as {
      action?: 'sign_intent' | 'update_policy' | 'autonomous_sweep' | 'generate_claim';
      toCounterparty?: string;
      toAddress?: string;
      amountUSDT?: number;
      invoiceRef?: string;
      maxSingleTransferUSDT?: number;
      blockDuplicateCounterparty?: boolean;
      requireContractClauseMatch?: boolean;
    };

    if (action === 'update_policy') {
      const updated = wdkVault.updatePolicy({
        ...(typeof maxSingleTransferUSDT === 'number' ? { maxSingleTransferUSDT } : {}),
        ...(typeof blockDuplicateCounterparty === 'boolean' ? { blockDuplicateCounterparty } : {}),
        ...(typeof requireContractClauseMatch === 'boolean' ? { requireContractClauseMatch } : {}),
      });
      return NextResponse.json({ ok: true, wdkPolicy: updated });
    }

    if (action === 'autonomous_sweep') {
      const sweep = await wdkVault.runAutonomousTreasurySweep();
      return NextResponse.json({ ok: true, sweep });
    }

    if (action === 'generate_claim') {
      const claim = await wdkVault.generateSignedDisputeClaim(toCounterparty);
      return NextResponse.json({ ok: true, claim });
    }

    const signedIntent = await wdkVault.evaluateAndSignSettlementIntent({
      toCounterparty: toCounterparty || 'Mombasa Packaging Suppliers',
      toAddress: toAddress || '0x71C9858EfFD232B4033E47d90003D41EC34Eca94',
      amountUSDT: Number(amountUSDT) || 850,
      invoiceRef: invoiceRef || 'INV-MSA-2026-44',
    });

    return NextResponse.json({ ok: true, signedIntent });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'WDK offline policy error' },
      { status: 500 }
    );
  }
}
