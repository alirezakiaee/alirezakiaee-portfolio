import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMedia } from '@/services/media.service';
import { DeleteMediaButton, MediaEditForm } from '../_components/media-forms';

const fmtBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export default async function MediaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uploaded?: string; saved?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const media = await getMedia(id);
  if (!media) notFound();

  const usage = [
    ...media.projectCovers.map((p) => ({ label: `Project cover: ${p.title}`, href: `/vorudealireza/projects/${p.id}` })),
    ...media.projectImages.map((pi) => ({ label: `Project gallery: ${pi.project.title}`, href: `/vorudealireza/projects/${pi.project.id}` })),
    ...media.pages.map((p) => ({ label: `Page image: ${p.title}`, href: `/vorudealireza/pages/${p.id}` })),
    ...media.posts.map((p) => ({ label: `Post image: ${p.title}`, href: `/vorudealireza/posts/${p.id}` })),
  ];

  return (
    <div className="max-w-3xl">
      <Link href="/vorudealireza/media" className="text-sm text-muted hover:text-ink">
        ← Back to media library
      </Link>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden">
          <div className="aspect-square bg-black/[0.03] grid place-items-center overflow-hidden">
            {media.mimeType.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.storagePath} alt={media.altText ?? media.originalName} className="h-full w-full object-contain" />
            ) : (
              <span className="text-sm font-mono text-muted">{media.mimeType}</span>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl tracking-tight break-all">
              {media.title ?? media.originalName}
            </h1>
            <p className="text-xs text-muted mt-2 space-y-1">
              <span className="block">{media.mimeType} · {fmtBytes(media.sizeBytes)}</span>
              <span className="block">uploaded {new Date(media.createdAt).toLocaleString()}{media.uploadedBy ? ` by ${media.uploadedBy.username}` : ''}</span>
            </p>
            <a href={media.storagePath} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline break-all mt-2 inline-block">
              {media.storagePath}
            </a>
          </div>
          {sp.uploaded && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Uploaded.</p>
          )}
          {sp.saved && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Saved.</p>
          )}
          <MediaEditForm media={media} />
          <div>
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted mb-2">Used by</h2>
            {usage.length === 0 ? (
              <p className="text-sm text-muted">Not used anywhere.</p>
            ) : (
              <ul className="space-y-1">
                {usage.map((u, i) => (
                  <li key={i}>
                    <Link href={u.href} className="text-sm text-accent hover:underline">{u.label}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DeleteMediaButton id={media.id} name={media.originalName} />
        </div>
      </div>
    </div>
  );
}
