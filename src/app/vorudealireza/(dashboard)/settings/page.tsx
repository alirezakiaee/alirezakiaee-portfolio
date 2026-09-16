import { prisma } from '@/lib/db';
import { SETTING_KEYS } from '@/lib/settings-keys';
import { SettingsForm } from './_components/settings-form';

export default async function SettingsPage() {
  const rows = await prisma.setting.findMany({ where: { key: { in: [...SETTING_KEYS] } } });
  const values: Record<string, string> = {};
  for (const r of rows) values[r.key] = typeof r.value === 'string' ? r.value : String(r.value ?? '');

  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">Settings</h1>
      <p className="text-sm text-muted mt-2">Site-wide values used across pages, SEO, and metadata.</p>
      <div className="mt-8">
        <SettingsForm values={values} />
      </div>
    </div>
  );
}
