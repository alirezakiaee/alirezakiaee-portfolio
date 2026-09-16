import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { SidebarNav } from './_components/sidebar-nav';
import { LogoutButton } from './_components/logout-button';

// This is the real security boundary (Node.js runtime, full DB check) —
// middleware.ts only does a cheap edge-side JWT check to bounce obvious
// unauthenticated requests early.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/vorudealireza/login');

  return (
    <div className="min-h-screen bg-paper text-ink font-body">
      <header className="sticky top-0 z-40 bg-paper/80 backdrop-blur-xl border-b border-black/[0.06]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="font-display font-extrabold text-lg">
              AK<span className="text-accent">.</span>
            </a>
            <span className="text-sm text-muted">Content admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted hidden sm:inline">
              {user.username} · <span className="font-medium text-ink">{user.role}</span>
            </span>
            <a href="/" target="_blank" className="btn-ghost text-xs">
              View site
            </a>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
        <SidebarNav role={user.role} />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
