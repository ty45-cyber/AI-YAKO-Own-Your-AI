import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { DocumentChunk, LedgerAuditSummary, LedgerTransaction } from '@/types/yako';

const DB_PATH = path.resolve(process.cwd(), '.qvac-cache', 'yako-sovereign.sqlite');

class SovereignLedgerDB {
  private db: Database.Database;
  private initialized = false;

  constructor() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  private initSchema(): void {
    if (this.initialized) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ledger_transactions (
        tx_id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        counterparty TEXT NOT NULL,
        category TEXT NOT NULL,
        direction TEXT CHECK(direction IN ('INFLOW', 'OUTFLOW')) NOT NULL,
        currency TEXT CHECK(currency IN ('KES', 'USDT')) NOT NULL,
        amount REAL NOT NULL,
        fee REAL NOT NULL,
        reference_note TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        doc_title TEXT NOT NULL,
        text TEXT NOT NULL,
        vector_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    const countRow = this.db
      .prepare('SELECT COUNT(*) as cnt FROM ledger_transactions')
      .get() as { cnt: number };

    if (countRow.cnt === 0) {
      this.seedDefaultSampleData();
    }
    this.initialized = true;
  }

  public seedDefaultSampleData(): void {
    const candidates = [
      path.resolve(process.cwd(), 'sample-data', 'nairobi-sme-mpesa-ledger.csv'),
      path.resolve(process.cwd(), 'sample-data', 'nairobi-sme-mpesa.csv'),
    ];
    for (const csvPath of candidates) {
      if (fs.existsSync(csvPath)) {
        const rawCsv = fs.readFileSync(csvPath, 'utf-8');
        this.ingestCsv(rawCsv);
        break;
      }
    }
  }

  public addTransaction(tx: LedgerTransaction): LedgerTransaction {
    const cleanTx: LedgerTransaction = {
      tx_id: tx.tx_id?.trim() || `TXN-${Date.now().toString(36).toUpperCase()}`,
      timestamp: tx.timestamp?.trim() || new Date().toISOString(),
      counterparty: tx.counterparty.trim(),
      category: tx.category?.trim() || 'General',
      direction: tx.direction === 'INFLOW' ? 'INFLOW' : 'OUTFLOW',
      currency: tx.currency === 'USDT' ? 'USDT' : 'KES',
      amount: Number(tx.amount) || 0,
      fee: Number(tx.fee) || 0,
      reference_note: tx.reference_note?.trim() || '',
    };

    this.db
      .prepare(`
        INSERT OR REPLACE INTO ledger_transactions
        (tx_id, timestamp, counterparty, category, direction, currency, amount, fee, reference_note)
        VALUES (@tx_id, @timestamp, @counterparty, @category, @direction, @currency, @amount, @fee, @reference_note)
      `)
      .run(cleanTx);

    return cleanTx;
  }

  public deleteTransaction(txId: string): void {
    this.db.prepare('DELETE FROM ledger_transactions WHERE tx_id = ?').run(txId);
  }

  public deleteDocumentByTitle(docTitle: string): void {
    this.db.prepare('DELETE FROM document_chunks WHERE doc_title = ?').run(docTitle);
  }

  public clearAllData(): void {
    this.db.prepare('DELETE FROM ledger_transactions').run();
    this.db.prepare('DELETE FROM document_chunks').run();
  }

  public getDbFileSizeBytes(): number {
    try {
      if (fs.existsSync(DB_PATH)) {
        return fs.statSync(DB_PATH).size;
      }
    } catch {
      // Fallback
    }
    return 0;
  }

  public ingestMpesaSms(rawSmsBatch: string): LedgerTransaction[] {
    const blocks = rawSmsBatch
      .split(/\r?\n\s*\r?\n|\r?\n(?=Confirmed\b|[A-Z0-9]{8,12}\s+Confirmed)/i)
      .map((b) => b.trim())
      .filter((b) => b.length > 10);

    const parsedRows: LedgerTransaction[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const sms = blocks[i];

      // 1. Extract M-Pesa receipt code (e.g., SLK9042X12 Confirmed)
      const codeMatch = sms.match(/\b([A-Z0-9]{8,12})\s+Confirmed/i);
      const txId = codeMatch
        ? `MPESA-${codeMatch[1].toUpperCase()}`
        : `MPESA-${Date.now().toString(36).toUpperCase()}-${i + 1}`;

      // 2. Determine direction (received vs sent/paid)
      const isInflow = /you have received|received\s+(?:ksh|kes|usdt)/i.test(sms);
      const direction: 'INFLOW' | 'OUTFLOW' = isInflow ? 'INFLOW' : 'OUTFLOW';

      // 3. Extract Currency & Principal Amount (first Ksh/KES/USDT amount)
      const amtMatch = sms.match(/(?:Ksh|KES|USDT)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
      const rawCurrency = sms.match(/\bUSDT\b/i) ? 'USDT' : 'KES';
      const amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) || 0 : 0;

      // 4. Extract Transaction Cost / Fee
      const feeMatch = sms.match(/Transaction cost[,:\s]*(?:Ksh|KES|USDT)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
      const fee = feeMatch ? parseFloat(feeMatch[1].replace(/,/g, '')) || 0 : 0;

      // 5. Extract Counterparty Name
      let counterparty = 'M-Pesa Counterparty';
      if (isInflow) {
        const fromMatch = sms.match(/from\s+([A-Za-z0-9\s.&'-]+?)(?:\s+07\d+|\s+on\s+\d|$|\.)/i);
        if (fromMatch?.[1]) counterparty = fromMatch[1].trim();
      } else {
        const toMatch = sms.match(/(?:sent to|paid to)\s+([A-Za-z0-9\s.&'-]+?)(?:\s+for account|\s+on\s+\d|$|\.)/i);
        if (toMatch?.[1]) counterparty = toMatch[1].trim();
      }

      // Normalize title case if all uppercase
      if (counterparty === counterparty.toUpperCase() && counterparty.length > 3) {
        counterparty = counterparty
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }

      const category = isInflow
        ? 'M-Pesa Sales'
        : /logistic|transport|fuel|freight|cargo/i.test(counterparty + ' ' + sms)
        ? 'Transport'
        : 'Supplier_Mpesa';

      if (amount > 0) {
        const created = this.addTransaction({
          tx_id: txId,
          timestamp: new Date().toISOString(),
          counterparty,
          category,
          direction,
          currency: rawCurrency,
          amount,
          fee,
          reference_note: sms.replace(/\s+/g, ' ').slice(0, 140),
        });
        parsedRows.push(created);
      }
    }

    return parsedRows;
  }

  public ingestCsv(csvContent: string): number {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return 0;

    const firstCols = lines[0].split(',').map((c) => c.trim().toLowerCase());
    const hasHeader =
      firstCols.includes('tx_id') ||
      firstCols.includes('counterparty') ||
      firstCols.includes('amount') ||
      firstCols.includes('direction');

    const startIndex = hasHeader ? 1 : 0;
    if (lines.length <= startIndex) return 0;

    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO ledger_transactions
      (tx_id, timestamp, counterparty, category, direction, currency, amount, fee, reference_note)
      VALUES (@tx_id, @timestamp, @counterparty, @category, @direction, @currency, @amount, @fee, @reference_note)
    `);

    const txRows: LedgerTransaction[] = [];
    for (let i = startIndex; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 3) continue;

      if (cols.length >= 9) {
        txRows.push({
          tx_id: cols[0] || `TXN-${Date.now()}-${i}`,
          timestamp: cols[1] || new Date().toISOString(),
          counterparty: cols[2] || 'Unknown Counterparty',
          category: cols[3] || 'General',
          direction: cols[4].toUpperCase() === 'INFLOW' ? 'INFLOW' : 'OUTFLOW',
          currency: cols[5].toUpperCase() === 'USDT' ? 'USDT' : 'KES',
          amount: parseFloat(cols[6]) || 0,
          fee: parseFloat(cols[7]) || 0,
          reference_note: cols.slice(8).join(',').trim(),
        });
      } else {
        // Flexible shorthand CSV: counterparty, direction, currency, amount, [fee], [reference_note]
        txRows.push({
          tx_id: `TXN-${Date.now().toString(36).toUpperCase()}-${i}`,
          timestamp: new Date().toISOString(),
          counterparty: cols[0] || 'Unknown Counterparty',
          category: 'Custom Upload',
          direction: (cols[1] || '').toUpperCase() === 'INFLOW' ? 'INFLOW' : 'OUTFLOW',
          currency: (cols[2] || '').toUpperCase() === 'USDT' ? 'USDT' : 'KES',
          amount: parseFloat(cols[3]) || 0,
          fee: parseFloat(cols[4]) || 0,
          reference_note: cols.slice(5).join(',').trim() || 'Uploaded via CSV',
        });
      }
    }

    const insertMany = this.db.transaction((rows: LedgerTransaction[]) => {
      for (const r of rows) insertStmt.run(r);
    });

    insertMany(txRows);
    return txRows.length;
  }

  public getAuditSummary(): LedgerAuditSummary {
    const totals = this.db
      .prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN direction = 'INFLOW' AND currency = 'KES' THEN amount ELSE 0 END), 0) AS totalInflowKES,
          COALESCE(SUM(CASE WHEN direction = 'OUTFLOW' AND currency = 'KES' THEN amount ELSE 0 END), 0) AS totalOutflowKES,
          COALESCE(SUM(CASE WHEN direction = 'OUTFLOW' AND currency = 'USDT' THEN amount ELSE 0 END), 0) AS totalOutflowUSDT,
          COALESCE(SUM(CASE WHEN currency = 'KES' THEN fee ELSE 0 END), 0) AS totalFeesKES,
          COUNT(*) AS rowCount
        FROM ledger_transactions
      `)
      .get() as {
      totalInflowKES: number;
      totalOutflowKES: number;
      totalOutflowUSDT: number;
      totalFeesKES: number;
      rowCount: number;
    };

    const duplicateAnomalies = this.db
      .prepare(`
        SELECT
          counterparty,
          amount,
          currency,
          COUNT(*) as occurrences,
          GROUP_CONCAT(tx_id, ', ') as txIds
        FROM ledger_transactions
        WHERE direction = 'OUTFLOW'
        GROUP BY counterparty, amount, currency
        HAVING COUNT(*) > 1
      `)
      .all() as Array<{
      counterparty: string;
      amount: number;
      currency: string;
      occurrences: number;
      txIds: string;
    }>;

    return {
      totalInflowKES: totals.totalInflowKES,
      totalOutflowKES: totals.totalOutflowKES,
      netCashflowKES: totals.totalInflowKES - totals.totalOutflowKES - totals.totalFeesKES,
      totalOutflowUSDT: totals.totalOutflowUSDT,
      totalFeesKES: totals.totalFeesKES,
      duplicateAnomalies,
      rowCount: totals.rowCount,
    };
  }

  public getAllTransactions(): LedgerTransaction[] {
    return this.db
      .prepare('SELECT * FROM ledger_transactions ORDER BY timestamp DESC')
      .all() as LedgerTransaction[];
  }

  public saveDocumentChunk(chunk: DocumentChunk): void {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO document_chunks (id, doc_title, text, vector_json, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        chunk.id,
        chunk.docTitle,
        chunk.text,
        JSON.stringify(chunk.vector),
        chunk.createdAt
      );
  }

  public getAllDocumentChunks(): DocumentChunk[] {
    const rows = this.db
      .prepare('SELECT id, doc_title, text, vector_json, created_at FROM document_chunks ORDER BY created_at ASC')
      .all() as Array<{
      id: string;
      doc_title: string;
      text: string;
      vector_json: string;
      created_at: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      docTitle: r.doc_title,
      text: r.text,
      vector: JSON.parse(r.vector_json) as number[],
      createdAt: r.created_at,
    }));
  }

  public restoreState(transactions: LedgerTransaction[], chunks: DocumentChunk[]): void {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM ledger_transactions').run();
      this.db.prepare('DELETE FROM document_chunks').run();

      const insertTx = this.db.prepare(`
        INSERT INTO ledger_transactions
        (tx_id, timestamp, counterparty, category, direction, currency, amount, fee, reference_note)
        VALUES (@tx_id, @timestamp, @counterparty, @category, @direction, @currency, @amount, @fee, @reference_note)
      `);
      for (const row of transactions) {
        insertTx.run(row);
      }

      const insertChunk = this.db.prepare(`
        INSERT INTO document_chunks (id, doc_title, text, vector_json, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const chunk of chunks) {
        insertChunk.run(
          chunk.id,
          chunk.docTitle,
          chunk.text,
          JSON.stringify(chunk.vector),
          chunk.createdAt
        );
      }
    });

    tx();
  }
}

export const ledgerDB = new SovereignLedgerDB();