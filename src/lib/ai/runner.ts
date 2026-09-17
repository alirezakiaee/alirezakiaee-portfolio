import 'server-only';
import { Prisma, type AiSchedule } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getAiConfig } from './config';
import { generatePost } from './generate';
import { computeNextRunAt } from './scheduler';
import { slugify } from '@/lib/slug';

export type RunTrigger = 'cron' | 'manual';

async function uniquePostSlug(base: string): Promise<string> {
  let slug = base || 'ai-post';
  for (let i = 2; ; i++) {
    const exists = await prisma.post.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
    slug = `${base}-${i}`;
  }
}

// Executes one schedule: picks the next topic, calls the AI, creates a Post,
// advances the schedule, and records an AiGenerationLog row either way.
export async function runSchedule(schedule: AiSchedule, trigger: RunTrigger): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const started = Date.now();
  const config = await getAiConfig();
  const topic = schedule.topics.length ? schedule.topics[schedule.topicIndex % schedule.topics.length] : null;

  const log = (data: Omit<Prisma.AiGenerationLogUncheckedCreateInput, 'scheduleId'>) =>
    prisma.aiGenerationLog.create({ data: { ...data, scheduleId: schedule.id } });

  if (!config.configured) {
    await log({ status: 'SKIPPED', topic, trigger, error: 'No AI API key configured (Settings → AI or AI_API_KEY).', durationMs: Date.now() - started });
    return { ok: false, error: 'AI API key not configured.' };
  }

  try {
    const { post, model, promptTokens, completionTokens } = await generatePost({
      config,
      prompt: schedule.prompt,
      topic,
      model: schedule.model,
    });

    const publish = schedule.publishMode === 'PUBLISH';
    const slug = await uniquePostSlug(slugify(post.title));

    // Attach schedule tags + AI-suggested tags (upserted by name).
    const tagNames = [
      ...schedule.tagsCsv.split(',').map((t) => t.trim()).filter(Boolean),
      ...post.suggestedTags,
    ];
    const tagIds: string[] = [];
    for (const name of [...new Set(tagNames)].slice(0, 10)) {
      const tSlug = slugify(name) || `tag-${Date.now().toString(36)}`;
      const tag = await prisma.tag.upsert({
        where: { slug: tSlug },
        create: { name, slug: tSlug },
        update: {},
        select: { id: true },
      });
      tagIds.push(tag.id);
    }

    const created = await prisma.post.create({
      data: {
        title: post.title,
        slug,
        excerpt: post.excerpt || null,
        content: post.content,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        publishedAt: publish ? new Date() : null,
        seoTitle: post.seoTitle || null,
        seoDescription: post.seoDescription || null,
        ...(schedule.categoryId ? { categories: { create: [{ categoryId: schedule.categoryId }] } } : {}),
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    });

    const nextRunAt = computeNextRunAt(schedule.frequency, schedule.runHour, schedule.runWeekday, schedule.runMonthDay);
    await prisma.aiSchedule.update({
      where: { id: schedule.id },
      data: {
        nextRunAt,
        lastRunAt: new Date(),
        topicIndex: schedule.topics.length ? (schedule.topicIndex + 1) % schedule.topics.length : 0,
      },
    });

    await log({
      status: 'SUCCESS', postId: created.id, model, topic, trigger,
      promptTokens, completionTokens, durationMs: Date.now() - started,
    });
    return { ok: true, postId: created.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await log({ status: 'FAILED', topic, trigger, error: msg.slice(0, 1000), durationMs: Date.now() - started });
    return { ok: false, error: msg };
  }
}

// Runs every enabled schedule whose nextRunAt is due. Used by the cron route.
export async function runDueSchedules(trigger: RunTrigger = 'cron'): Promise<{ ran: number; results: { id: string; ok: boolean; error?: string }[] }> {
  const due = await prisma.aiSchedule.findMany({
    where: { enabled: true, nextRunAt: { lte: new Date() } },
    orderBy: { nextRunAt: 'asc' },
    take: 10, // bound per-invocation work for serverless limits
  });
  const results = [];
  for (const s of due) {
    const r = await runSchedule(s, trigger);
    results.push({ id: s.id, ...r });
  }
  return { ran: due.length, results };
}
