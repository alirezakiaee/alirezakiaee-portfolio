'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { assertCan } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit';
import { SETTING_KEYS, type SettingKey } from '@/lib/settings-keys';

export type SettingsFormState = { error: string | null; saved?: boolean };

// Every editable setting key and its validation rules.
const FIELD_DEFS: Record<SettingKey, z.ZodString> = {
  'site.title': z.string().trim().max(120),
  'site.tagline': z.string().trim().max(200),
  'site.description': z.string().trim().max(500),
  'site.email': z.string().trim().max(200),
  'site.location': z.string().trim().max(120),
  'social.github': z.string().trim().max(300),
  'social.linkedin': z.string().trim().max(300),
  'social.twitter': z.string().trim().max(300),
  'seo.defaultTitle': z.string().trim().max(200),
  'seo.titleTemplate': z.string().trim().max(200),
  'seo.defaultDescription': z.string().trim().max(300),
  'seo.defaultOgImage': z.string().trim().max(500),
  'ai.apiKey': z.string().trim().max(500),
  'ai.baseUrl': z.string().trim().max(300),
  'ai.model': z.string().trim().max(120),
  'ai.systemPrompt': z.string().trim().max(8000),
};

export async function saveSettings(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'settings.write');
  } catch {
    return { error: 'You do not have permission.' };
  }

  const values: [SettingKey, string][] = [];
  for (const key of SETTING_KEYS) {
    const raw = formData.get(key);
    const parsed = FIELD_DEFS[key].safeParse(raw ?? '');
    if (!parsed.success) return { error: `${key}: ${parsed.error.issues[0]?.message}` };
    // The API key field is write-only: a blank submission keeps the stored value.
    if (key === 'ai.apiKey' && parsed.data === '') continue;
    values.push([key, parsed.data]);
  }

  await prisma.$transaction(
    values.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  );
  await logAudit({ userId: user.id, action: 'settings.update', resource: 'settings', metadata: { keys: SETTING_KEYS } });
  revalidatePath('/vorudealireza/settings');
  return { error: null, saved: true };
}
