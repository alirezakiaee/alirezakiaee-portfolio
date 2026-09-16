import type { Metadata } from 'next';
import { getHomePage, getSettings } from '@/lib/public-data';
import { renderBlock } from '@/components/public/block-renderer';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: s['seo.defaultTitle'] || 'Alireza Kiaee — Senior Software Engineer',
    description: s['seo.defaultDescription'] || s['site.description'] || undefined,
  };
}

export default async function HomePage() {
  const page = await getHomePage();

  return (
    <main id="top">
      {page?.blocks.length ? (
        page.blocks.map((b) => renderBlock(b))
      ) : (
        <section className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-sm font-medium tracking-widest uppercase text-accent mb-3">Alireza Kiaee</p>
            <h1 className="font-display font-black text-4xl md:text-6xl tracking-tight">Portfolio</h1>
          </div>
        </section>
      )}
    </main>
  );
}
