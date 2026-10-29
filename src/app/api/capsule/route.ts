import { NextRequest, NextResponse } from 'next/server';
import { exportYakoCapsule, importYakoCapsule } from '@/lib/yako-capsule';
import { YakoEncryptedCapsule } from '@/types/yako';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, passphrase, capsule } = body as {
      mode: 'export' | 'import';
      passphrase?: string;
      capsule?: YakoEncryptedCapsule;
    };

    if (mode === 'export') {
      const exported = exportYakoCapsule(passphrase || 'yako-nairobi-2026');
      return NextResponse.json({ ok: true, capsule: exported });
    }

    if (mode === 'import' && capsule) {
      const restored = importYakoCapsule(capsule, passphrase || 'yako-nairobi-2026');
      return NextResponse.json({ ok: true, restored });
    }

    return NextResponse.json({ ok: false, error: 'Invalid capsule operation mode' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Capsule crypto operation failed' },
      { status: 400 }
    );
  }
}