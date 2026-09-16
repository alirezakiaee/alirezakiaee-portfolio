import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPost, listImageMedia } from '@/services/posts.service';
import { PostForm, type PostFormInitial } from '../_components/post-form';
import { DeletePostButton } from '../_components/delete-button';

const datetimeInput = (d: Date | null) =>
  d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined;

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; restored?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [post, images] = await Promise.all([getPost(id), listImageMedia()]);
  if (!post) notFound();

  const initial: PostFormInitial = {
    id: post.id,
    status: post.status,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    featuredImageId: post.featuredImageId,
    categoryNames: post.categories.map((c) => c.category.name).join(', '),
    tagNames: post.tags.map((t) => t.tag.name).join(', '),
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    canonicalUrl: post.canonicalUrl,
    robotsIndex: post.robotsIndex,
    robotsFollow: post.robotsFollow,
    ogTitle: post.ogTitle,
    ogDescription: post.ogDescription,
    scheduledAt: datetimeInput(post.scheduledAt),
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">{post.title}</h1>
          <p className="text-sm text-muted mt-2">
            <code className="bg-black/5 rounded px-1.5 py-0.5 text-xs">/blog/{post.slug}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/vorudealireza/posts/${post.id}/revisions`} className="btn-ghost">
            Revisions
          </Link>
          <DeletePostButton id={post.id} title={post.title} />
        </div>
      </div>

      {sp.saved && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Saved.
        </p>
      )}
      {sp.restored && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Revision restored.
        </p>
      )}

      <div className="mt-8">
        <PostForm post={initial} images={images} />
      </div>
    </div>
  );
}
