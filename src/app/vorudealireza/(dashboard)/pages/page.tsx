import Link from 'next/link';
import type { ContentStatus } from '@prisma/client';
import { listPages } from '@/services/pages.service';

const STATUSES: (ContentStatus | 'ALL')[] = ['ALL', 'DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'];

function StatusBadge({ status }: { status: ContentStatus }) {
  const cls =
    status === 'PUBLISHED'
      ? 'badge-published'
      : status === 'SCHEDULED'
        ? 'badge-scheduled'
        : status === 'ARCHIVED'
          ? 'badge-archived'
          : 'badge-draft';
  return <span className={`badge ${cls}`}>{status.toLowerCase()}</span>;
}

export default async function PagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const raw = (sp.status ?? 'ALL').toUpperCase();
  const status = (['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'] as const).includes(raw as ContentStatus)
    ? (raw as ContentStatus)
    : undefined;
  const q = sp.q?.trim() || undefined;
  const pages = await listPages({ status, q });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">Pages</h1>
          <p className="text-sm text-muted mt-2">{pages.length} page{pages.length === 1 ? '' : 's'}</p>
        </div>
        <Link href="/vorudealireza/pages/new" className="btn">
          + New page
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-black/10 bg-white p-1 text-sm">
          {STATUSES.map((s) => {
            const active = (sp.status ?? 'ALL') === s || (!sp.status && s === 'ALL');
            const href = s === 'ALL' ? '/vorudealireza/pages' : `/vorudealireza/pages?status=${s}`;
            return (
              <Link
                key={s}
                href={q ? `${href}${s === 'ALL' ? '?' : '&'}q=${encodeURIComponent(q)}` : href}
                className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                  active ? 'bg-ink text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </Link>
            );
          })}
        </div>
        <form method="get" action="/vorudealireza/pages" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search title or slug…" className="field !w-56 !py-2" />
          <button type="submit" className="btn-ghost !py-2">Search</button>
        </form>
      </div>

      {pages.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          No pages yet. <Link href="/vorudealireza/pages/new" className="text-accent hover:underline">Create the first one.</Link>
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {pages.map((p) => (
            <li key={p.id}>
              <Link
                href={`/vorudealireza/pages/${p.id}`}
                className="block rounded-2xl border border-black/[0.08] bg-white px-5 py-4 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-display font-bold">{p.title}</span>
                  <StatusBadge status={p.status} />
                  <span className="ml-auto text-xs text-muted">
                    updated {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted flex-wrap">
                  <code className="bg-black/5 rounded px-1.5 py-0.5">/{p.slug}</code>
                  <span>{p._count.blocks} block{p._count.blocks === 1 ? '' : 's'}</span>
                  {p.parent && <span>under /{p.parent.slug}</span>}
                  {p.template !== 'default' && <span>template: {p.template}</span>}
                  {p.status === 'SCHEDULED' && p.scheduledAt && (
                    <span>publishes {new Date(p.scheduledAt).toLocaleString()}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
