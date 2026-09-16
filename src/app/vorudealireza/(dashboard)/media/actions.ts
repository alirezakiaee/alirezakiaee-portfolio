'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { assertCan } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit';
import { removeFile, storeFile } from '@/lib/media/storage';

export type MediaFormState = { error: string | null };

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'application/pdf',
]);

export async function uploadMedia(_prev: MediaFormState, formData: FormData): Promise<MediaFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'media.write');
  } catch {
    return { error: 'You do not have permission to upload media.' };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a file to upload.' };
  if (file.size > MAX_BYTES) return { error: 'File exceeds the 10 MB limit.' };
  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME.has(mime)) {
    return { error: `File type "${mime}" is not allowed. Upload JPEG, PNG, WebP, GIF, AVIF or PDF.` };
  }

  const altText = String(formData.get('altText') ?? '').trim().slice(0, 300) || null;
  const title = String(formData.get('title') ?? '').trim().slice(0, 200) || null;

  const { storagePath, filename } = await storeFile(file);
  try {
    const media = await prisma.media.create({
      data: {
        filename,
        originalName: file.name.slice(0, 300),
        mimeType: mime,
        sizeBytes: file.size,
        storagePath,
        altText,
        title,
        uploadedById: user.id,
      },
    });
    await logAudit({
      userId: user.id,
      action: 'media.upload',
      resource: 'media',
      resourceId: media.id,
      metadata: { name: file.name, mime, size: file.size },
    });
    revalidatePath('/vorudealireza/media');
    redirect(`/vorudealireza/media/${media.id}?uploaded=1`);
  } catch (e) {
    await removeFile(storagePath);
    throw e;
  }
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(200).optional(),
  altText: z.string().trim().max(300).optional(),
  caption: z.string().trim().max(500).optional(),
});

export async function updateMedia(_prev: MediaFormState, formData: FormData): Promise<MediaFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'media.write');
  } catch {
    return { error: 'You do not have permission to edit media.' };
  }
  const rec: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === 'string') rec[k] = v;
  const parsed = UpdateSchema.safeParse(rec);
  if (!parsed.success) return { error: 'Invalid input.' };

  const media = await prisma.media.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!media) return { error: 'Media not found.' };

  await prisma.media.update({
    where: { id: media.id },
    data: {
      title: parsed.data.title || null,
      altText: parsed.data.altText || null,
      caption: parsed.data.caption || null,
    },
  });
  await logAudit({ userId: user.id, action: 'media.update', resource: 'media', resourceId: media.id });
  revalidatePath('/vorudealireza/media');
  redirect(`/vorudealireza/media/${media.id}?saved=1`);
}

export async function deleteMedia(_prev: MediaFormState, formData: FormData): Promise<MediaFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'media.delete');
  } catch {
    return { error: 'You do not have permission to delete media.' };
  }
  const id = String(formData.get('id') ?? '');
  const media = await prisma.media.findFirst({ where: { id, deletedAt: null } });
  if (!media) return { error: 'Media not found.' };

  const usage =
    (await prisma.project.count({ where: { coverImageId: id, deletedAt: null } })) +
    (await prisma.projectImage.count({ where: { mediaId: id } })) +
    (await prisma.page.count({ where: { featuredImageId: id, deletedAt: null } })) +
    (await prisma.post.count({ where: { featuredImageId: id, deletedAt: null } }));
  if (usage > 0) return { error: `Still in use by ${usage} item${usage === 1 ? '' : 's'} — remove it there first.` };

  await prisma.media.update({ where: { id }, data: { deletedAt: new Date() } });
  await removeFile(media.storagePath);
  await logAudit({
    userId: user.id,
    action: 'media.delete',
    resource: 'media',
    resourceId: id,
    metadata: { name: media.originalName },
  });
  revalidatePath('/vorudealireza/media');
  redirect('/vorudealireza/media');
}
