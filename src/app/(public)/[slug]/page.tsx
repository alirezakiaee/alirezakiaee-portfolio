import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPageBySlug, getSettings } from '@/lib/public-data';
import { renderBlock } from '@/components/public/block-renderer';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [page, s] = await Promise.all([getPageBySlug(slug), getSettings()]);
  if (!page) return {};
  const title = page.seoTitle || page.title;
  const tpl = s['seo.titleTemplate'];
  return {
    title: tpl ? tpl.replace('%s', title) : title,
    description: page.seoDescription || page.excerpt || s['seo.defaultDescription'] || undefined,
    robots: {
      index: page.robotsIndex,
      follow: page.robotsFollow,
    },
    ...(page.canonicalUrl ? { alternates: { canonical: page.canonicalUrl } } : {}),
    openGraph: {
      title: page.ogTitle || title,
      description: page.ogDescription || page.seoDescription || undefined,
    },
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === 'home') return notFound(); // home renders at /
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  return (
    <main id="top" className="pt-28">
      {page.blocks.length ? (
        page.blocks.map((b) => renderBlock(b))
      ) : (
        <section className="px-4 sm:px-6 lg:px-8 py-24">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-display font-extrabold tracking-tight text-4xl md:text-6xl">{page.title}</h1>
            {page.excerpt && <p className="mt-6 text-lg text-muted">{page.excerpt}</p>}
          </div>
        </section>
      )}
    </main>
  );
}
