import Link from 'next/link';
import { listMedia } from '@/services/media.service';
import { storageDriver } from '@/lib/media/storage';
import { MediaUploadForm } from './_components/upload-form';

const fmtBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const type = sp.type === 'image' || sp.type === 'file' ? sp.type : undefined;
  const q = sp.q?.trim() || undefined;
  const media = await listMedia({ q, type });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">Media Library</h1>
          <p className="text-sm text-muted mt-2">
            {media.length} file{media.length === 1 ? '' : 's'} · storage: {storageDriver() === 'local' ? 'local uploads/' : 'Vercel Blob'}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <MediaUploadForm />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-black/10 bg-white p-1 text-sm">
          {[
            ['', 'All'],
            ['image', 'Images'],
            ['file', 'Files'],
          ].map(([v, label]) => (
            <Link
              key={label}
              href={v ? `/vorudealireza/media?type=${v}` : '/vorudealireza/media'}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                (type ?? '') === v ? 'bg-ink text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
        <form method="get" action="/vorudealireza/media" className="flex gap-2">
          {type && <input type="hidden" name="type" value={type} />}
          <input name="q" defaultValue={q} placeholder="Search files…" className="field !w-56 !py-2" />
          <button type="submit" className="btn-ghost !py-2">Search</button>
        </form>
      </div>

      {media.length === 0 ? (
        <p className="mt-10 text-sm text-muted">No files yet — upload one above.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((m) => (
            <li key={m.id}>
              <Link
                href={`/vorudealireza/media/${m.id}`}
                className="block rounded-2xl border border-black/[0.08] bg-white overflow-hidden hover:border-accent/40 transition-colors"
              >
                <div className="aspect-square bg-black/[0.03] grid place-items-center overflow-hidden">
                  {m.mimeType.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.storagePath} alt={m.altText ?? m.originalName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-mono text-muted">{m.mimeType}</span>
                  )}
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-sm font-medium truncate">{m.title ?? m.originalName}</p>
                  <p className="text-xs text-muted">{fmtBytes(m.sizeBytes)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
