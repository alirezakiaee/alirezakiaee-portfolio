'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { assertCan } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit';

export type TestimonialFormState = { error: string | null };

const TestimonialSchema = z.object({
  id: z.string().optional(),
  authorName: z.string().trim().min(1, 'Author name is required').max(120),
  authorTitle: z.string().trim().max(120).optional(),
  authorCompany: z.string().trim().max(120).optional(),
  quote: z.string().trim().min(1, 'Quote is required').max(5000),
  avatarId: z.string().optional(),
  projectId: z.string().optional(),
  featured: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export async function saveTestimonial(_prev: TestimonialFormState, formData: FormData): Promise<TestimonialFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.write');
  } catch {
    return { error: 'You do not have permission.' };
  }

  const parsed = TestimonialSchema.safeParse({
    id: formData.get('id') || undefined,
    authorName: formData.get('authorName'),
    authorTitle: formData.get('authorTitle') || undefined,
    authorCompany: formData.get('authorCompany') || undefined,
    quote: formData.get('quote'),
    avatarId: formData.get('avatarId') || undefined,
    projectId: formData.get('projectId') || undefined,
    featured: formData.get('featured') === 'on',
    sortOrder: formData.get('sortOrder'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  if (parsed.data.avatarId) {
    const m = await prisma.media.findUnique({ where: { id: parsed.data.avatarId }, select: { id: true } });
    if (!m) return { error: 'Selected avatar image not found.' };
  }
  if (parsed.data.projectId) {
    const p = await prisma.project.findUnique({ where: { id: parsed.data.projectId }, select: { id: true } });
    if (!p) return { error: 'Selected project not found.' };
  }

  const data = {
    authorName: parsed.data.authorName,
    authorTitle: parsed.data.authorTitle || null,
    authorCompany: parsed.data.authorCompany || null,
    quote: parsed.data.quote,
    avatarId: parsed.data.avatarId || null,
    projectId: parsed.data.projectId || null,
    featured: parsed.data.featured,
    sortOrder: parsed.data.sortOrder,
  };

  let id = parsed.data.id;
  if (id) {
    await prisma.testimonial.update({ where: { id }, data });
    await logAudit({ userId: user.id, action: 'testimonial.update', resource: 'testimonial', resourceId: id, metadata: { authorName: data.authorName } });
  } else {
    const created = await prisma.testimonial.create({ data });
    id = created.id;
    await logAudit({ userId: user.id, action: 'testimonial.create', resource: 'testimonial', resourceId: id, metadata: { authorName: data.authorName } });
  }
  revalidatePath('/vorudealireza/testimonials');
  redirect(`/vorudealireza/testimonials/${id}?saved=1`);
}

export async function deleteTestimonial(_prev: TestimonialFormState, formData: FormData): Promise<TestimonialFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.delete');
  } catch {
    return { error: 'You do not have permission.' };
  }
  const id = String(formData.get('id') ?? '');
  const t = await prisma.testimonial.findUnique({ where: { id } });
  if (!t) return { error: 'Testimonial not found.' };
  await prisma.testimonial.delete({ where: { id } });
  await logAudit({ userId: user.id, action: 'testimonial.delete', resource: 'testimonial', resourceId: id, metadata: { authorName: t.authorName } });
  revalidatePath('/vorudealireza/testimonials');
  redirect('/vorudealireza/testimonials');
}
