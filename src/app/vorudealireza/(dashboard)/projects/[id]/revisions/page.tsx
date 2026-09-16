import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject, getProjectRevisions } from '@/services/projects.service';
import { restoreProjectRevision } from '../../actions';

export default async function ProjectRevisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const revisions = await getProjectRevisions(project.id);

  return (
    <div className="max-w-3xl">
      <Link href={`/vorudealireza/projects/${project.id}`} className="text-sm text-muted hover:text-ink">
        ← Back to project
      </Link>
      <h1 className="font-display font-extrabold text-3xl tracking-tight mt-2">Revisions</h1>
      <p className="text-sm text-muted mt-2">
        A snapshot is taken before every save. Restoring replaces the current fields.
      </p>

      {revisions.length === 0 ? (
        <p className="mt-10 text-sm text-muted">No revisions yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {revisions.map((rev, i) => {
            const snap = rev.snapshot as { title?: string; status?: string; updatedAt?: string };
            return (
              <li
                key={rev.id}
                className="rounded-2xl border border-black/[0.08] bg-white px-5 py-4 flex items-center gap-4 flex-wrap"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    Revision {revisions.length - i}
                    {i === 0 && <span className="badge badge-draft ml-2">latest</span>}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(rev.createdAt).toLocaleString()}
                    {rev.author?.username ? ` · ${rev.author.username}` : ''}
                    {snap.title ? ` · “${snap.title}”` : ''}
                    {snap.status ? ` · ${snap.status.toLowerCase()}` : ''}
                  </p>
                </div>
                <form action={restoreProjectRevision.bind(null, project.id, rev.id)} className="ml-auto">
                  <button type="submit" className="btn-ghost !px-4 !py-2 text-xs">
                    Restore
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
