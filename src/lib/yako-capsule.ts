import crypto from 'node:crypto';
import { ledgerDB } from '@/lib/ledger-db';
import { DocumentChunk, LedgerTransaction, YakoEncryptedCapsule } from '@/types/yako';

interface CapsulePlaintextPayload {
  version: number;
  exportedAt: string;
  transactions: LedgerTransaction[];
  documentChunks: DocumentChunk[];
}

export function exportYakoCapsule(passphrase: string): YakoEncryptedCapsule {
  const cleanSecret = passphrase.trim() || 'ai-yako-sovereign-default-key';
  const transactions = ledgerDB.getAllTransactions();
  const documentChunks = ledgerDB.getAllDocumentChunks();

  const payload: CapsulePlaintextPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    documentChunks,
  };

  const plaintextBuffer = Buffer.from(JSON.stringify(payload), 'utf-8');
  const plaintextSha256 = crypto.createHash('sha256').update(plaintextBuffer).digest('hex');

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(cleanSecret, salt, 100_000, 32, 'sha256');

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encryptedBuffer = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const ownerFingerprint = crypto
    .createHash('sha256')
    .update(`yako-owner:${cleanSecret}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();

  return {
    magicHeader: 'YAKO_SOVEREIGN_CAPSULE_V1',
    createdAt: payload.exportedAt,
    ownerPublicKeyFingerprint: `YAKO-ID-${ownerFingerprint}`,
    qvacModelManifest: {
      llmModel: 'LLAMA_3_2_1B_INST_Q4_0',
      embeddingModel: 'EMBEDDINGGEMMA_300M_Q4_0',
      vectorDimension: documentChunks[0]?.vector.length || 768,
    },
    encryption: {
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA256',
      ivHex: iv.toString('hex'),
      saltHex: salt.toString('hex'),
      authTagHex: authTag.toString('hex'),
      plaintextSha256,
    },
    ciphertextBase64: encryptedBuffer.toString('base64'),
  };
}

export function importYakoCapsule(
  capsule: YakoEncryptedCapsule,
  passphrase: string
): { restoredTransactions: number; restoredChunks: number; ownerFingerprint: string } {
  if (capsule.magicHeader !== 'YAKO_SOVEREIGN_CAPSULE_V1') {
    throw new Error('Invalid .yako capsule magic header.');
  }

  const cleanSecret = passphrase.trim() || 'ai-yako-sovereign-default-key';
  const salt = Buffer.from(capsule.encryption.saltHex, 'hex');
  const iv = Buffer.from(capsule.encryption.ivHex, 'hex');
  const authTag = Buffer.from(capsule.encryption.authTagHex, 'hex');
  const ciphertext = Buffer.from(capsule.ciphertextBase64, 'base64');

  const key = crypto.pbkdf2Sync(cleanSecret, salt, 100_000, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decryptedBuffer = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const computedSha256 = crypto.createHash('sha256').update(decryptedBuffer).digest('hex');

  if (computedSha256 !== capsule.encryption.plaintextSha256) {
    throw new Error('Cryptographic SHA-256 integrity check failed on .yako capsule.');
  }

  const payload = JSON.parse(decryptedBuffer.toString('utf-8')) as CapsulePlaintextPayload;
  ledgerDB.restoreState(payload.transactions || [], payload.documentChunks || []);

  return {
    restoredTransactions: (payload.transactions || []).length,
    restoredChunks: (payload.documentChunks || []).length,
    ownerFingerprint: capsule.ownerPublicKeyFingerprint,
  };
}