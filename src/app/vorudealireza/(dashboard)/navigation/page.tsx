import Link from 'next/link';
import { NavLocation } from '@prisma/client';
import { prisma } from '@/lib/db';
import { NavManager } from './_components/nav-manager';

const LOCATIONS: { value: NavLocation; label: string }[] = [
  { value: 'HEADER', label: 'Header' },
  { value: 'FOOTER', label: 'Footer' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default async function NavigationPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const { location } = await searchParams;
  const active = (LOCATIONS.some((l) => l.value === location) ? location : 'HEADER') as NavLocation;

  const nav = await prisma.navigation.findUnique({
    where: { location: active },
    include: {
      items: {
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
        include: { children: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] } },
      },
    },
  });
  const topLevel = (nav?.items ?? []).filter((i) => !i.parentId);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">Navigation</h1>
      <p className="text-sm text-muted mt-2">Menu items shown in each area of the public site.</p>

      <div className="mt-6 flex gap-2">
        {LOCATIONS.map((l) => (
          <Link
            key={l.value}
            href={`/vorudealireza/navigation?location=${l.value}`}
            className={`px-4 py-2 rounded-full text-sm border transition-colors ${
              active === l.value
                ? 'bg-ink text-paper border-ink'
                : 'border-black/[0.12] text-muted hover:text-ink hover:border-ink/30'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <NavManager
          location={active}
          items={topLevel.map((i) => ({
            id: i.id,
            label: i.label,
            url: i.url,
            sortOrder: i.sortOrder,
            openInNewTab: i.openInNewTab,
            enabled: i.enabled,
            children: i.children.map((c) => ({
              id: c.id,
              label: c.label,
              url: c.url,
              sortOrder: c.sortOrder,
              openInNewTab: c.openInNewTab,
              enabled: c.enabled,
            })),
          }))}
        />
      </div>
    </div>
  );
}
