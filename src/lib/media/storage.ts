import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Storage abstraction: Vercel Blob when BLOB_READ_WRITE_TOKEN is configured
// (production), local public/uploads otherwise (dev). storagePath is always a
// public URL — either the blob URL or a site-relative /uploads/… path.
const LOCAL_DIR = path.join(process.cwd(), 'public', 'uploads');

export function storageDriver(): 'vercel-blob' | 'local' {
  return process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'local';
}

function safeName(original: string): string {
  const base = original.split(/[\\/]/).pop() ?? 'file';
  const cleaned = base.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 80) || 'file';
}

export async function storeFile(file: File): Promise<{ storagePath: string; filename: string }> {
  const filename = `${randomUUID()}-${safeName(file.name)}`;

  if (storageDriver() === 'vercel-blob') {
    const { put } = await import('@vercel/blob');
    const blob = await put(filename, file, { access: 'public', addRandomSuffix: false });
    return { storagePath: blob.url, filename };
  }

  await mkdir(LOCAL_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(LOCAL_DIR, filename), buf);
  return { storagePath: `/uploads/${filename}`, filename };
}

export async function removeFile(storagePath: string): Promise<void> {
  if (storagePath.startsWith('/uploads/')) {
    await unlink(path.join(LOCAL_DIR, path.basename(storagePath))).catch(() => {});
    return;
  }
  if (storageDriver() === 'vercel-blob') {
    const { del } = await import('@vercel/blob');
    await del(storagePath).catch(() => {});
  }
}
