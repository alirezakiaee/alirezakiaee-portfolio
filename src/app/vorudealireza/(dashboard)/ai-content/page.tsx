import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getAiConfig } from '@/lib/ai/config';
import { describeSchedule } from '@/lib/ai/scheduler';
import { RunNowButton } from './_components/run-now-button';

export default async function AiContentPage() {
  const [schedules, config] = await Promise.all([
    prisma.aiSchedule.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        category: { select: { name: true } },
        _count: { select: { runs: true } },
      },
    }),
    getAiConfig(),
  ]);

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">AI Content</h1>
          <p className="text-sm text-muted mt-2">
            Schedules that automatically generate blog posts with an AI model on a recurring basis.
          </p>
        </div>
        <Link href="/vorudealireza/ai-content/new" className="btn shrink-0">+ New schedule</Link>
      </div>

      {!config.configured && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No AI API key configured. Add one in{' '}
          <Link href="/vorudealireza/settings" className="underline font-medium">Settings → AI content generation</Link>{' '}
          or set the <code>AI_API_KEY</code> env var. Schedules will log a SKIPPED run until then.
        </div>
      )}

      <div className="mt-8 space-y-3">
        {schedules.length === 0 && (
          <p className="text-sm text-muted rounded-2xl border border-black/[0.08] bg-white p-6">
            No schedules yet. Create one to start generating posts automatically.
          </p>
        )}
        {schedules.map((s) => (
          <div key={s.id} className="rounded-2xl border border-black/[0.08] bg-white p-5 flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link href={`/vorudealireza/ai-content/${s.id}`} className="font-display font-bold text-lg hover:underline truncate">
                  {s.name}
                </Link>
                {!s.enabled && <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 text-muted">disabled</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.publishMode === 'PUBLISH' ? 'bg-green-100 text-green-800' : 'bg-black/5 text-muted'}`}>
                  {s.publishMode === 'PUBLISH' ? 'auto-publish' : 'draft'}
                </span>
              </div>
              <p className="text-sm text-muted mt-1">
                {describeSchedule(s.frequency, s.runHour, s.runWeekday, s.runMonthDay)}
                {s.category && <> · {s.category.name}</>}
                {s.topics.length > 0 && <> · {s.topics.length} topics</>}
                {' · '}next run {s.nextRunAt.toLocaleString('en-CA', { timeZone: 'UTC' })} UTC
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <RunNowButton scheduleId={s.id} />
              <Link href={`/vorudealireza/ai-content/${s.id}`} className="text-sm text-muted hover:text-ink">Edit</Link>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted">
        Runs are triggered hourly by the <code>/api/cron/ai-generate</code> endpoint (Vercel Cron).
        See <Link href="/vorudealireza/ai-content/logs" className="underline">generation logs</Link> for history.
      </p>
    </div>
  );
}
