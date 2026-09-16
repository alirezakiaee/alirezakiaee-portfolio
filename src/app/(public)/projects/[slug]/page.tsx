import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getProjectBySlug, getSettings } from '@/lib/public-data';

export const dynamic = 'force-dynamic';

const SECTIONS: [keyof import('@prisma/client').Project, string][] = [
  ['overview', 'Overview'],
  ['problem', 'Problem'],
  ['goals', 'Goals'],
  ['architecture', 'Architecture'],
  ['implementation', 'Implementation'],
  ['challenges', 'Challenges'],
  ['solution', 'Solution'],
  ['results', 'Results'],
];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [p, s] = await Promise.all([getProjectBySlug(slug), getSettings()]);
  if (!p) return {};
  const title = p.seoTitle || p.title;
  const tpl = s['seo.titleTemplate'];
  return {
    title: tpl ? tpl.replace('%s', title) : title,
    description: p.seoDescription || p.shortDescription,
    robots: { index: p.robotsIndex, follow: p.robotsFollow },
    ...(p.canonicalUrl ? { alternates: { canonical: p.canonicalUrl } } : {}),
    openGraph: {
      title: p.ogTitle || title,
      description: p.ogDescription || p.seoDescription || p.shortDescription,
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProjectBySlug(slug);
  if (!p) notFound();

  const gradient = (p.cardStyle as { gradient?: string[] } | null)?.gradient;
  const metrics = Array.isArray(p.metrics) ? (p.metrics as { label: string; value: string }[]) : [];

  return (
    <main id="top" className="px-4 sm:px-6 lg:px-8 pt-32 pb-24">
      <div className="mx-auto max-w-4xl">
        <Link href="/#work" className="text-sm text-muted hover:text-accent transition-colors">← All work</Link>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {p.technologies.map((t) => (
            <span key={t.technology.name} className="rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-medium">
              {t.technology.name}
            </span>
          ))}
        </div>

        <h1 className="mt-4 font-display font-extrabold tracking-tight text-4xl md:text-6xl leading-[1.02]">{p.title}</h1>
        <p className="mt-4 text-lg text-muted leading-relaxed">{p.shortDescription}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
          {p.client && <span>Client: <span className="text-ink font-medium">{p.client}</span></span>}
          {p.industry && <span>Industry: <span className="text-ink font-medium">{p.industry}</span></span>}
          {p.projectType && <span>Type: <span className="text-ink font-medium">{p.projectType}</span></span>}
        </div>

        {(p.liveUrl || p.githubUrl || p.videoUrl) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {p.liveUrl && (
              <Link href={p.liveUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full bg-ink text-white px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
                Visit live <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M7 7h10v10" /></svg>
              </Link>
            )}
            {p.githubUrl && (
              <Link href={p.githubUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium hover:border-accent hover:text-accent transition-colors">
                Source
              </Link>
            )}
            {p.videoUrl && (
              <Link href={p.videoUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium hover:border-accent hover:text-accent transition-colors">
                Video
              </Link>
            )}
          </div>
        )}

        {p.coverImage ? (
          <Image
            src={p.coverImage.storagePath}
            alt={p.coverImage.altText ?? p.title}
            width={p.coverImage.width ?? 1200}
            height={p.coverImage.height ?? 675}
            className="mt-10 w-full rounded-3xl object-cover border border-black/[0.06]"
            priority
          />
        ) : gradient?.length ? (
          <div
            className="mt-10 w-full aspect-[16/9] rounded-3xl border border-black/[0.06]"
            style={{ backgroundImage: `linear-gradient(to bottom right, ${gradient.join(', ')})` }}
          />
        ) : null}

        {metrics.length > 0 && (
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-2xl border border-black/[0.08] bg-white p-5 text-center">
                <p className="font-display font-extrabold text-2xl text-accent">{m.value}</p>
                <p className="mt-1 text-xs text-muted uppercase tracking-wider">{m.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-14 space-y-12">
          {SECTIONS.map(([key, label]) =>
            p[key] ? (
              <section key={key}>
                <h2 className="font-display font-extrabold tracking-tight text-2xl md:text-3xl mb-4">{label}</h2>
                <p className="text-muted leading-relaxed whitespace-pre-line">{String(p[key])}</p>
              </section>
            ) : null
          )}
        </div>

        {p.gallery.length > 0 && (
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {p.gallery.map((g) => (
              <figure key={g.id} className="rounded-2xl overflow-hidden border border-black/[0.08] bg-white">
                <Image src={g.media.storagePath} alt={g.media.altText ?? g.caption ?? p.title} width={g.media.width ?? 800} height={g.media.height ?? 600} className="w-full object-cover" />
                {g.caption && <figcaption className="px-4 py-3 text-xs text-muted">{g.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
