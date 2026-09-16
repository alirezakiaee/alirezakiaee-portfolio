'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Prisma, type ContentStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { assertCan } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit';
import { isPostgresUniqueViolation, isValidSlug, slugify } from '@/lib/slug';

export type ProjectFormState = { error: string | null };

const optionalText = z.string().trim().max(20000).optional();
const optionalShort = z.string().trim().max(200).optional();
const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => !v || /^https?:\/\//i.test(v), 'Links must start with http:// or https://')
  .optional();
const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .optional()
  .or(z.literal(''));

const MetricsSchema = z.array(
  z.object({ label: z.string().min(1).max(100), value: z.string().min(1).max(100) })
);

const ProjectFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, 'Title is required').max(200),
  slug: z.string().trim().max(80).optional(),
  shortDescription: z.string().trim().min(1, 'Short description is required').max(500),
  overview: optionalText,
  problem: optionalText,
  goals: optionalText,
  architecture: optionalText,
  implementation: optionalText,
  challenges: optionalText,
  solution: optionalText,
  results: optionalText,
  client: z.string().trim().max(120).optional(),
  industry: z.string().trim().max(120).optional(),
  projectType: z.string().trim().max(120).optional(),
  projectDate: optionalDate,
  completionDate: optionalDate,
  githubUrl: optionalUrl,
  liveUrl: optionalUrl,
  videoUrl: optionalUrl,
  metricsJson: z.string().trim().max(10000).optional(),
  technologyNames: z.string().trim().max(2000).optional(),
  sortOrder: z.string().trim().optional(),
  seoTitle: optionalShort,
  seoDescription: z.string().trim().max(300).optional(),
  canonicalUrl: optionalUrl,
  ogTitle: optionalShort,
  ogDescription: z.string().trim().max(300).optional(),
  scheduledAt: z.string().trim().optional(),
  intent: z.enum(['save', 'publish', 'schedule', 'unpublish', 'archive']).default('save'),
});

const RevisionSchema = z.object({ projectId: z.string().min(1), revisionId: z.string().min(1) });

function formRecord(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string') out[k] = v;
  return out;
}

const empty = (v: string | undefined) => !v;
const orNull = (v: string | undefined) => (v ? v : null);
const parseDate = (v: string | undefined) => (v ? new Date(`${v}T00:00:00Z`) : null);

async function syncTechnologies(projectId: string, names: string) {
  const wanted = [...new Set(names.split(',').map((n) => n.trim()).filter(Boolean))].slice(0, 40);
  const ids: string[] = [];
  for (const name of wanted) {
    const slug = slugify(name) || name.toLowerCase().replace(/\s+/g, '-');
    const tech = await prisma.technology.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    ids.push(tech.id);
  }
  await prisma.$transaction([
    prisma.projectTechnology.deleteMany({ where: { projectId, technologyId: { notIn: ids } } }),
    prisma.projectTechnology.createMany({
      data: ids.map((technologyId) => ({ projectId, technologyId })),
      skipDuplicates: true,
    }),
  ]);
}

function resolveStatus(
  intent: z.infer<typeof ProjectFormSchema>['intent'],
  current: ContentStatus | undefined,
  scheduledAt: Date | null
): { status: ContentStatus; error?: string } {
  switch (intent) {
    case 'publish':
      return { status: 'PUBLISHED' };
    case 'schedule':
      if (!scheduledAt || scheduledAt.getTime() <= Date.now())
        return { status: current ?? 'DRAFT', error: 'Choose a future date/time to schedule.' };
      return { status: 'SCHEDULED' };
    case 'unpublish':
      return { status: 'DRAFT' };
    case 'archive':
      return { status: 'ARCHIVED' };
    default:
      return { status: current ?? 'DRAFT' };
  }
}

export async function saveProject(
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.write');
  } catch {
    return { error: 'You do not have permission to edit projects.' };
  }

  const parsed = ProjectFormSchema.safeParse(formRecord(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  const d = parsed.data;

  const slug = d.slug ? slugify(d.slug) : slugify(d.title);
  if (!isValidSlug(slug)) return { error: 'Slug must be lowercase letters, numbers and dashes.' };

  const featured = formData.get('featured') === 'on';
  const robotsIndex = formData.get('robotsIndex') === 'on';
  const robotsFollow = formData.get('robotsFollow') === 'on';
  const sortOrder = /^-?\d{1,6}$/.test(d.sortOrder ?? '') ? parseInt(d.sortOrder!, 10) : 0;

  let metrics: Prisma.InputJsonValue | undefined;
  if (!empty(d.metricsJson)) {
    try {
      metrics = MetricsSchema.parse(JSON.parse(d.metricsJson!)) as Prisma.InputJsonValue;
    } catch {
      return { error: 'Metrics must be a JSON array like [{"label":"SKUs","value":"30,000+"}].' };
    }
  }

  const scheduledAt = d.scheduledAt ? new Date(d.scheduledAt) : null;
  const existing = d.id
    ? await prisma.project.findFirst({ where: { id: d.id, deletedAt: null } })
    : null;
  if (d.id && !existing) return { error: 'Project not found.' };

  const { status, error } = resolveStatus(d.intent, existing?.status, scheduledAt);
  if (error) return { error };

  const data: Prisma.ProjectUncheckedUpdateInput = {
    title: d.title,
    slug,
    shortDescription: d.shortDescription,
    overview: orNull(d.overview),
    problem: orNull(d.problem),
    goals: orNull(d.goals),
    architecture: orNull(d.architecture),
    implementation: orNull(d.implementation),
    challenges: orNull(d.challenges),
    solution: orNull(d.solution),
    results: orNull(d.results),
    client: orNull(d.client),
    industry: orNull(d.industry),
    projectType: orNull(d.projectType),
    projectDate: parseDate(d.projectDate),
    completionDate: parseDate(d.completionDate),
    githubUrl: orNull(d.githubUrl),
    liveUrl: orNull(d.liveUrl),
    videoUrl: orNull(d.videoUrl),
    metrics: metrics ?? Prisma.DbNull,
    featured,
    sortOrder,
    status,
    seoTitle: orNull(d.seoTitle),
    seoDescription: orNull(d.seoDescription),
    canonicalUrl: orNull(d.canonicalUrl),
    robotsIndex,
    robotsFollow,
    ogTitle: orNull(d.ogTitle),
    ogDescription: orNull(d.ogDescription),
    scheduledAt: status === 'SCHEDULED' ? scheduledAt : null,
    publishedAt: status === 'PUBLISHED' ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null,
    authorId: user.id,
  };

  try {
    if (existing) {
      const { technologies, ...snapshot } = await prisma.project.findUniqueOrThrow({
        where: { id: existing.id },
        include: { technologies: { include: { technology: { select: { name: true } } } } },
      });
      await prisma.projectRevision.create({
        data: {
          projectId: existing.id,
          authorId: user.id,
          snapshot: {
            ...snapshot,
            technologies: technologies.map((t) => t.technology.name),
          } as Prisma.InputJsonValue,
        },
      });
      await prisma.project.update({ where: { id: existing.id }, data });
      await syncTechnologies(existing.id, d.technologyNames ?? '');
      await logAudit({
        userId: user.id,
        action: `project.${d.intent === 'save' ? 'update' : d.intent}`,
        resource: 'project',
        resourceId: existing.id,
        metadata: { title: d.title, slug, status },
      });
      revalidatePath('/vorudealireza/projects');
      redirect(`/vorudealireza/projects/${existing.id}?saved=1`);
    }

    const created = await prisma.project.create({
      data: data as Prisma.ProjectUncheckedCreateInput,
    });
    await syncTechnologies(created.id, d.technologyNames ?? '');
    await logAudit({
      userId: user.id,
      action: 'project.create',
      resource: 'project',
      resourceId: created.id,
      metadata: { title: d.title, slug, status },
    });
    revalidatePath('/vorudealireza/projects');
    redirect(`/vorudealireza/projects/${created.id}?saved=1`);
  } catch (e) {
    if (isPostgresUniqueViolation(e)) return { error: 'Another project already uses that slug.' };
    throw e;
  }
  return { error: null };
}

export async function deleteProject(_prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.delete');
  } catch {
    return { error: 'You do not have permission to delete projects.' };
  }
  const id = String(formData.get('id') ?? '');
  const project = await prisma.project.findFirst({ where: { id, deletedAt: null } });
  if (!project) return { error: 'Project not found.' };

  await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  await logAudit({
    userId: user.id,
    action: 'project.delete',
    resource: 'project',
    resourceId: id,
    metadata: { title: project.title, slug: project.slug },
  });
  revalidatePath('/vorudealireza/projects');
  redirect('/vorudealireza/projects');
}

export async function restoreProjectRevision(projectId: string, revisionId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error('Not signed in.');
  assertCan(user.role, 'content.write');

  const parsed = RevisionSchema.safeParse({ projectId, revisionId });
  if (!parsed.success) throw new Error('Invalid input.');

  const revision = await prisma.projectRevision.findFirst({ where: { id: revisionId, projectId } });
  if (!revision) throw new Error('Revision not found.');
  const snap = revision.snapshot as Record<string, unknown>;

  const editableKeys = [
    'title', 'slug', 'shortDescription', 'overview', 'problem', 'goals', 'architecture',
    'implementation', 'challenges', 'solution', 'results', 'client', 'industry', 'projectType',
    'githubUrl', 'liveUrl', 'videoUrl', 'metrics', 'featured', 'sortOrder', 'status',
    'seoTitle', 'seoDescription', 'canonicalUrl', 'robotsIndex', 'robotsFollow',
    'ogTitle', 'ogDescription', 'scheduledAt', 'publishedAt',
  ] as const;
  const data: Record<string, unknown> = {};
  for (const k of editableKeys) if (k in snap) data[k] = snap[k];

  try {
    await prisma.project.update({ where: { id: projectId }, data });
    if (Array.isArray(snap.technologies)) {
      await syncTechnologies(projectId, (snap.technologies as string[]).join(','));
    }
  } catch (e) {
    if (isPostgresUniqueViolation(e)) throw new Error('Restored slug conflicts with another project.');
    throw e;
  }
  await logAudit({
    userId: user.id,
    action: 'project.restore_revision',
    resource: 'project',
    resourceId: projectId,
    metadata: { revisionId },
  });
  revalidatePath('/vorudealireza/projects');
  redirect(`/vorudealireza/projects/${projectId}?restored=1`);
}
