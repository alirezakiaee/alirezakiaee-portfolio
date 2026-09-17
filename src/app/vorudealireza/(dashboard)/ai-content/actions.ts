'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { AiFrequency } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { assertCan } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit';
import { computeNextRunAt } from '@/lib/ai/scheduler';
import { runSchedule } from '@/lib/ai/runner';

export type AiScheduleFormState = { error: string | null };

const Schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Name is required').max(120),
  prompt: z.string().trim().min(10, 'Describe what the AI should write about').max(4000),
  topics: z.string().max(8000).optional(), // newline-separated
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('WEEKLY'),
  runHour: z.string().trim().optional(),
  runWeekday: z.string().trim().optional(),
  runMonthDay: z.string().trim().optional(),
  model: z.string().trim().max(120).optional(),
  publishMode: z.enum(['DRAFT', 'PUBLISH']).default('DRAFT'),
  categoryId: z.string().trim().optional(),
  tagsCsv: z.string().trim().max(500).optional(),
});

const intIn = (v: string | undefined, min: number, max: number, fallback: number) => {
  const n = parseInt(v ?? '', 10);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

export async function saveAiSchedule(_prev: AiScheduleFormState, formData: FormData): Promise<AiScheduleFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.write');
  } catch {
    return { error: 'You do not have permission.' };
  }

  const raw: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === 'string') raw[k] = v;
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  const d = parsed.data;

  const topics = (d.topics ?? '').split('\n').map((t) => t.trim()).filter(Boolean).slice(0, 100);
  const runHour = intIn(d.runHour, 0, 23, 9);
  const runWeekday = intIn(d.runWeekday, 0, 6, 1);
  const runMonthDay = intIn(d.runMonthDay, 1, 28, 1);
  const enabled = formData.get('enabled') === 'on';

  if (d.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: d.categoryId }, select: { id: true } });
    if (!cat) return { error: 'Category not found.' };
  }

  const nextRunAt = computeNextRunAt(d.frequency as AiFrequency, runHour, runWeekday, runMonthDay);

  const data = {
    name: d.name,
    prompt: d.prompt,
    topics,
    frequency: d.frequency as AiFrequency,
    runHour,
    runWeekday,
    runMonthDay,
    model: d.model || null,
    publishMode: d.publishMode,
    categoryId: d.categoryId || null,
    tagsCsv: d.tagsCsv ?? '',
    enabled,
    nextRunAt,
  } as const;

  const existing = d.id ? await prisma.aiSchedule.findUnique({ where: { id: d.id } }) : null;
  if (d.id && !existing) return { error: 'Schedule not found.' };

  let id: string;
  if (existing) {
    await prisma.aiSchedule.update({ where: { id: existing.id }, data });
    id = existing.id;
  } else {
    id = (await prisma.aiSchedule.create({ data })).id;
  }

  await logAudit({
    userId: user.id,
    action: existing ? 'ai_schedule.update' : 'ai_schedule.create',
    resource: 'ai_schedule',
    resourceId: id,
    metadata: { name: d.name, frequency: d.frequency, enabled },
  });
  revalidatePath('/vorudealireza/ai-content');
  redirect(`/vorudealireza/ai-content/${id}?saved=1`);
}

export async function deleteAiSchedule(_prev: AiScheduleFormState, formData: FormData): Promise<AiScheduleFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.delete');
  } catch {
    return { error: 'You do not have permission.' };
  }
  const id = String(formData.get('id') ?? '');
  const sched = await prisma.aiSchedule.findUnique({ where: { id } });
  if (!sched) return { error: 'Schedule not found.' };
  await prisma.aiSchedule.delete({ where: { id } }); // logs keep scheduleId via SetNull
  await logAudit({ userId: user.id, action: 'ai_schedule.delete', resource: 'ai_schedule', resourceId: id, metadata: { name: sched.name } });
  revalidatePath('/vorudealireza/ai-content');
  redirect('/vorudealireza/ai-content');
}

// Manual "Run now" — generates a post immediately regardless of schedule timing.
export async function runAiScheduleNow(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.write');
  } catch {
    return { ok: false, error: 'You do not have permission.' };
  }
  const sched = await prisma.aiSchedule.findUnique({ where: { id } });
  if (!sched) return { ok: false, error: 'Schedule not found.' };
  const r = await runSchedule(sched, 'manual');
  revalidatePath('/vorudealireza/ai-content');
  revalidatePath(`/vorudealireza/ai-content/${id}`);
  return r;
}
