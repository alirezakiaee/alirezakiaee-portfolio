import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getPostBySlug, getSettings } from '@/lib/public-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [post, s] = await Promise.all([getPostBySlug(slug), getSettings()]);
  if (!post) return {};
  const title = post.seoTitle || post.title;
  const tpl = s['seo.titleTemplate'];
  return {
    title: tpl ? tpl.replace('%s', title) : title,
    description: post.seoDescription || post.excerpt || undefined,
    robots: { index: post.robotsIndex, follow: post.robotsFollow },
    ...(post.canonicalUrl ? { alternates: { canonical: post.canonicalUrl } } : {}),
    openGraph: {
      title: post.ogTitle || title,
      description: post.ogDescription || post.seoDescription || undefined,
      type: 'article',
      ...(post.featuredImage ? { images: [post.featuredImage.storagePath] } : {}),
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <main id="top" className="px-4 sm:px-6 lg:px-8 pt-32 pb-24">
      <article className="mx-auto max-w-3xl">
        <Link href="/blog" className="text-sm text-muted hover:text-accent transition-colors">← Back to blog</Link>

        <div className="mt-8 flex items-center gap-3 text-sm text-muted">
          {post.publishedAt && (
            <time dateTime={post.publishedAt.toISOString()}>
              {post.publishedAt.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
          )}
          {post.categories.map((c) => (
            <span key={c.category.id} className="rounded-full bg-accent/10 text-accent px-2.5 py-0.5 text-xs font-medium">
              {c.category.name}
            </span>
          ))}
        </div>

        <h1 className="mt-4 font-display font-extrabold tracking-tight text-4xl md:text-5xl leading-tight">{post.title}</h1>
        {post.excerpt && <p className="mt-4 text-lg text-muted leading-relaxed">{post.excerpt}</p>}

        {post.featuredImage && (
          <Image
            src={post.featuredImage.storagePath}
            alt={post.featuredImage.altText ?? post.title}
            width={post.featuredImage.width ?? 1200}
            height={post.featuredImage.height ?? 630}
            className="mt-8 w-full rounded-3xl object-cover"
            priority
          />
        )}

        {post.content && (
          <div className="prose-content mt-10" dangerouslySetInnerHTML={{ __html: post.content }} />
        )}

        {post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span key={t.tag.id} className="rounded-full border border-black/10 px-3 py-1 text-xs text-muted">
                #{t.tag.name}
              </span>
            ))}
          </div>
        )}
      </article>
    </main>
  );
}
