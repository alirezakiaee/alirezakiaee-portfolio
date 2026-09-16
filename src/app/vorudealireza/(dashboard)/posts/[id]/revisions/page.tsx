import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPost, getPostRevisions } from '@/services/posts.service';
import { restorePostRevision } from '../../actions';

export default async function PostRevisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();
  const revisions = await getPostRevisions(post.id);

  return (
    <div className="max-w-3xl">
      <Link href={`/vorudealireza/posts/${post.id}`} className="text-sm text-muted hover:text-ink">
        ← Back to post
      </Link>
      <h1 className="font-display font-extrabold text-3xl tracking-tight mt-2">Revisions</h1>
      <p className="text-sm text-muted mt-2">
        A snapshot is taken before every save. Restoring replaces the current fields, categories and tags.
      </p>

      {revisions.length === 0 ? (
        <p className="mt-10 text-sm text-muted">No revisions yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {revisions.map((rev, i) => {
            const snap = rev.snapshot as { title?: string; status?: string };
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
                <form action={restorePostRevision.bind(null, post.id, rev.id)} className="ml-auto">
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
