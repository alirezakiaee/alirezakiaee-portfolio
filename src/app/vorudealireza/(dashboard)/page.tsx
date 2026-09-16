import Link from 'next/link';
import { getDashboardStats, getRecentActivity } from '@/services/dashboard.service';

function StatCard({ label, value, sublabel }: { label: string; value: number; sublabel?: string }) {
  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-2 font-display font-extrabold text-3xl tracking-tight">{value}</p>
      {sublabel && <p className="text-xs text-muted mt-1">{sublabel}</p>}
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="btn-ghost">
      + {label}
    </Link>
  );
}

export default async function DashboardPage() {
  const [stats, activity] = await Promise.all([getDashboardStats(), getRecentActivity()]);

  return (
    <div>
      <h1 className="font-display font-extrabold text-3xl tracking-tight">Dashboard</h1>
      <p className="text-sm text-muted mt-2">Overview of your site content.</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <QuickAction href="/vorudealireza/projects/new" label="New Project" />
        <QuickAction href="/vorudealireza/pages/new" label="New Page" />
        <QuickAction href="/vorudealireza/posts/new" label="New Blog Post" />
        <QuickAction href="/vorudealireza/media" label="Upload Media" />
      </div>

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Published Pages" value={stats.pagesPublished} sublabel={`${stats.pagesDraft} drafts`} />
        <StatCard label="Blog Posts" value={stats.postsPublished} sublabel={`${stats.postsDraft} drafts`} />
        <StatCard label="Projects" value={stats.projectsPublished} sublabel={`${stats.projectsDraft} drafts`} />
        <StatCard label="Media Files" value={stats.mediaCount} />
      </div>

      {stats.scheduledCount > 0 && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          {stats.scheduledCount} item{stats.scheduledCount === 1 ? '' : 's'} scheduled for future publishing.
        </div>
      )}

      <div className="mt-10">
        <h2 className="font-display font-bold text-lg mb-4">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted">No admin activity recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {activity.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-black/[0.06] bg-white px-4 py-3 text-sm flex items-center justify-between">
                <span>
                  <span className="font-medium">{entry.user?.username ?? 'System'}</span>{' '}
                  <span className="text-muted">{entry.action}</span>{' '}
                  {entry.resourceId && <code className="text-xs bg-black/5 rounded px-1.5 py-0.5">{entry.resourceId.slice(0, 8)}</code>}
                </span>
                <span className="text-xs text-muted">{new Date(entry.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
