import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getPublishedPosts, getSettings } from '@/lib/public-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const tpl = s['seo.titleTemplate'];
  return {
    title: tpl ? tpl.replace('%s', 'Blog') : 'Blog — Alireza Kiaee',
    description: 'Writing on software engineering, ERP integrations, and full-stack development.',
  };
}

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <main id="top" className="px-4 sm:px-6 lg:px-8 pt-32 pb-24 min-h-screen">
      <div className="mx-auto max-w-6xl">
        <p className="reveal text-sm font-medium tracking-widest uppercase text-accent mb-3">Writing</p>
        <h1 className="reveal font-display font-extrabold tracking-tight text-4xl md:text-6xl mb-14">Blog</h1>

        <ul className="space-y-6">
          {posts.map((p, i) => (
            <li key={p.id}>
              <Link
                href={`/blog/${p.slug}`}
                className="reveal group flex flex-col sm:flex-row gap-6 rounded-3xl border border-black/[0.06] bg-white p-6 hover:border-accent/40 transition-colors"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                {p.featuredImage && (
                  <Image
                    src={p.featuredImage.storagePath}
                    alt={p.featuredImage.altText ?? p.title}
                    width={320}
                    height={200}
                    className="rounded-2xl object-cover sm:w-56 sm:h-36 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-3 text-xs text-muted">
                    {p.publishedAt && (
                      <time dateTime={p.publishedAt.toISOString()}>
                        {p.publishedAt.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </time>
                    )}
                    {p.categories.map((c) => (
                      <span key={c.category.id} className="rounded-full bg-accent/10 text-accent px-2.5 py-0.5 font-medium">
                        {c.category.name}
                      </span>
                    ))}
                  </div>
                  <h2 className="mt-2 font-display font-bold text-2xl tracking-tight group-hover:text-accent transition-colors">{p.title}</h2>
                  {p.excerpt && <p className="mt-2 text-muted line-clamp-2">{p.excerpt}</p>}
                </div>
              </Link>
            </li>
          ))}
          {posts.length === 0 && (
            <li className="rounded-3xl border border-dashed border-black/[0.15] px-6 py-16 text-center text-muted">
              No posts published yet — check back soon.
            </li>
          )}
        </ul>
      </div>
    </main>
  );
}
