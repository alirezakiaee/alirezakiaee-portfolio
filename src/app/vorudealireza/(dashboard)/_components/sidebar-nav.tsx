'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@prisma/client';

type NavItem = { label: string; href: string };
type NavGroup = { label: string | null; items: NavItem[] };

const GROUPS: NavGroup[] = [
  { label: null, items: [{ label: 'Dashboard', href: '/vorudealireza' }] },
  {
    label: 'Content',
    items: [
      { label: 'Pages', href: '/vorudealireza/pages' },
      { label: 'Blog Posts', href: '/vorudealireza/posts' },
      { label: 'Projects', href: '/vorudealireza/projects' },
      { label: 'Services', href: '/vorudealireza/services' },
      { label: 'Testimonials', href: '/vorudealireza/testimonials' },
      { label: 'Technologies', href: '/vorudealireza/technologies' },
    ],
  },
  { label: 'Media', items: [{ label: 'Media Library', href: '/vorudealireza/media' }] },
  {
    label: 'Website',
    items: [
      { label: 'Navigation', href: '/vorudealireza/navigation' },
      { label: 'Settings', href: '/vorudealireza/settings' },
      { label: 'Redirects', href: '/vorudealireza/redirects' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users', href: '/vorudealireza/users' },
      { label: 'Audit Log', href: '/vorudealireza/audit-log' },
    ],
  },
];

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6 text-sm" aria-label="Admin navigation">
      {GROUPS.map((group, i) => {
        const items = group.label === 'System' && role !== 'ADMIN' ? [] : group.items;
        if (items.length === 0) return null;
        return (
          <div key={i}>
            {group.label && <p className="px-3 mb-1.5 text-xs font-medium uppercase tracking-widest text-muted">{group.label}</p>}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = pathname === item.href || (item.href !== '/vorudealireza' && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-lg px-3 py-2 font-medium transition-colors ${
                        active ? 'bg-ink text-white' : 'text-muted hover:bg-black/5 hover:text-ink'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
