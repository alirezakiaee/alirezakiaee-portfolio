import Link from 'next/link';
import type { ContentStatus } from '@prisma/client';
import { listProjects } from '@/services/projects.service';

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

export default async function ProjectsPage({
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
  const projects = await listProjects({ status, q });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">Projects</h1>
          <p className="text-sm text-muted mt-2">{projects.length} project{projects.length === 1 ? '' : 's'}</p>
        </div>
        <Link href="/vorudealireza/projects/new" className="btn">
          + New project
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-black/10 bg-white p-1 text-sm">
          {STATUSES.map((s) => {
            const active = (sp.status ?? 'ALL') === s || (!sp.status && s === 'ALL');
            const href = s === 'ALL' ? '/vorudealireza/projects' : `/vorudealireza/projects?status=${s}`;
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
        <form method="get" action="/vorudealireza/projects" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search title or slug…" className="field !w-56 !py-2" />
          <button type="submit" className="btn-ghost !py-2">Search</button>
        </form>
      </div>

      {projects.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          No projects yet. <Link href="/vorudealireza/projects/new" className="text-accent hover:underline">Create the first one.</Link>
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/vorudealireza/projects/${p.id}`}
                className="block rounded-2xl border border-black/[0.08] bg-white px-5 py-4 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-display font-bold">{p.title}</span>
                  {p.featured && <span className="badge bg-blue-100 text-blue-700">featured</span>}
                  <StatusBadge status={p.status} />
                  <span className="ml-auto text-xs text-muted">
                    updated {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted flex-wrap">
                  <code className="bg-black/5 rounded px-1.5 py-0.5">/{p.slug}</code>
                  {p.technologies.length > 0 && (
                    <span>{p.technologies.map((t) => t.technology.name).join(' · ')}</span>
                  )}
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
