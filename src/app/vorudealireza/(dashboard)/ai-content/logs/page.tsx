import Link from 'next/link';
import { prisma } from '@/lib/db';

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  SKIPPED: 'bg-amber-100 text-amber-800',
};

export default async function AiLogsPage() {
  const runs = await prisma.aiGenerationLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      schedule: { select: { id: true, name: true } },
      post: { select: { id: true, title: true, status: true } },
    },
  });

  return (
    <div className="max-w-5xl">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">Generation logs</h1>
      <p className="text-sm text-muted mt-2">Last 100 AI generation runs across all schedules.</p>

      <div className="mt-8 space-y-2">
        {runs.length === 0 && (
          <p className="text-sm text-muted rounded-2xl border border-black/[0.08] bg-white p-6">No runs recorded yet.</p>
        )}
        {runs.map((r) => (
          <div key={r.id} className="rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-sm flex items-center gap-3 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[r.status] ?? 'bg-black/5'}`}>{r.status}</span>
            <span className="text-muted shrink-0">{r.createdAt.toLocaleString('en-CA', { timeZone: 'UTC' })}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-black/5 text-muted shrink-0">{r.trigger}</span>
            {r.schedule && (
              <Link href={`/vorudealireza/ai-content/${r.schedule.id}`} className="text-muted hover:text-ink shrink-0">
                {r.schedule.name}
              </Link>
            )}
            {r.post ? (
              <Link href={`/vorudealireza/posts/${r.post.id}`} className="truncate hover:underline">
                {r.post.title} <span className="text-xs text-muted">({r.post.status})</span>
              </Link>
            ) : (
              <span className="truncate text-muted">{r.error ?? '—'}</span>
            )}
            <span className="ml-auto text-xs text-muted shrink-0">
              {[r.model, r.durationMs != null ? `${Math.round(r.durationMs / 1000)}s` : null, r.promptTokens != null ? `${r.promptTokens}+${r.completionTokens ?? 0} tok` : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
