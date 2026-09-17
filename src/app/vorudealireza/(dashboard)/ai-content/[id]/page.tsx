import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ScheduleForm } from '../_components/schedule-form';
import { RunNowButton } from '../_components/run-now-button';
import { DeleteScheduleButton } from '../_components/delete-schedule-button';

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  SKIPPED: 'bg-amber-100 text-amber-800',
};

export default async function EditAiSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [schedule, categories, runs] = await Promise.all([
    prisma.aiSchedule.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.aiGenerationLog.findMany({
      where: { scheduleId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { post: { select: { id: true, title: true, status: true } } },
    }),
  ]);
  if (!schedule) notFound();

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">{schedule.name}</h1>
          <p className="text-sm text-muted mt-2">
            Next run {schedule.nextRunAt.toLocaleString('en-CA', { timeZone: 'UTC' })} UTC
            {schedule.lastRunAt && <> · last ran {schedule.lastRunAt.toLocaleString('en-CA', { timeZone: 'UTC' })} UTC</>}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <RunNowButton scheduleId={schedule.id} />
          <DeleteScheduleButton id={schedule.id} />
        </div>
      </div>

      <div className="mt-8">
        <ScheduleForm
          schedule={{
            id: schedule.id,
            name: schedule.name,
            prompt: schedule.prompt,
            topics: schedule.topics.join('\n'),
            frequency: schedule.frequency,
            runHour: schedule.runHour,
            runWeekday: schedule.runWeekday,
            runMonthDay: schedule.runMonthDay,
            model: schedule.model,
            publishMode: schedule.publishMode,
            categoryId: schedule.categoryId,
            tagsCsv: schedule.tagsCsv,
            enabled: schedule.enabled,
          }}
          categories={categories}
        />
      </div>

      <h2 className="font-display font-bold text-lg mt-10 mb-3">Recent runs</h2>
      <div className="space-y-2">
        {runs.length === 0 && <p className="text-sm text-muted">No runs yet.</p>}
        {runs.map((r) => (
          <div key={r.id} className="rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-sm flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[r.status] ?? 'bg-black/5'}`}>{r.status}</span>
            <span className="text-muted shrink-0">{r.createdAt.toLocaleString('en-CA', { timeZone: 'UTC' })}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-black/5 text-muted shrink-0">{r.trigger}</span>
            {r.post ? (
              <Link href={`/vorudealireza/posts/${r.post.id}`} className="truncate hover:underline">{r.post.title}</Link>
            ) : (
              <span className="truncate text-muted">{r.error ?? r.topic ?? '—'}</span>
            )}
            {r.model && <span className="ml-auto text-xs text-muted shrink-0">{r.model}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
