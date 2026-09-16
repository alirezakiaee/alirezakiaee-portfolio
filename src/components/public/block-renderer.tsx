import Link from 'next/link';
import Image from 'next/image';
import { getFeaturedProjects, getSettings } from '@/lib/public-data';
import { prisma } from '@/lib/db';

type BlockData = Record<string, unknown>;

const ArrowIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M7 7h10v10" /></svg>
);

const PILLAR_ICONS: Record<string, React.ReactNode> = {
  code: <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6" /></svg>,
  link: <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  layers: <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,
};

const CONTACT_ICONS: Record<string, React.ReactNode> = {
  github: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" /></svg>,
  linkedin: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" /></svg>,
  phone: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
};

function accentText(text: string, accent: string, accentCls = 'text-ink font-medium') {
  if (!accent || !text.includes(accent)) return text;
  const [before, after] = text.split(accent);
  return (
    <>
      {before}
      <span className={accentCls}>{accent}</span>
      {after}
    </>
  );
}

// ---------- Section renderers ----------

function HomeHero({ d }: { d: BlockData }) {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden px-4 sm:px-6 lg:px-8 pt-28">
      <div className="pointer-events-none absolute -top-32 -right-32 w-[34rem] h-[34rem] rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -left-40 w-[28rem] h-[28rem] rounded-full bg-ink/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full border border-black/[0.04]" />

      <div className="mx-auto max-w-6xl w-full">
        {!!d.eyebrow && (
          <p className="reveal flex items-center gap-3 text-sm font-medium tracking-widest uppercase text-muted mb-6">
            <span className="inline-block w-8 h-px bg-accent" />
            {String(d.eyebrow)}
          </p>
        )}
        <h1 className="font-display font-black leading-[0.95] tracking-tight text-[clamp(3rem,10vw,8.5rem)]">
          <span className="reveal block">{String(d.line1 ?? '')}</span>
          <span className="reveal block text-outline" style={{ transitionDelay: '100ms' }}>{String(d.line2 ?? '')}</span>
        </h1>
        <div className="reveal mt-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8" style={{ transitionDelay: '200ms' }}>
          {!!d.tagline && (
            <p className="max-w-md text-lg text-muted leading-relaxed">
              {accentText(String(d.tagline), String(d.accent ?? ''))}
            </p>
          )}
          <div className="flex items-center gap-4">
            <Link href="/#work" className="inline-flex items-center gap-2 rounded-full bg-ink text-white px-7 py-3.5 text-sm font-medium hover:bg-accent transition-colors duration-300 cursor-pointer">
              View work
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
            </Link>
            <Link href="/#contact" className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-7 py-3.5 text-sm font-medium hover:border-accent hover:text-accent transition-colors duration-300 cursor-pointer">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee({ d }: { d: BlockData }) {
  const items = (d.items as string[] | undefined) ?? [];
  const strip = (
    <span className="flex gap-10 shrink-0">
      {items.map((it) => (
        <span key={it} className="flex gap-10">
          <span>{it}</span>
          <span className="text-accent">•</span>
        </span>
      ))}
    </span>
  );
  return (
    <div className="reveal border-y border-black/[0.06] py-4 overflow-hidden" style={{ transitionDelay: '300ms' }}>
      <div className="marquee flex whitespace-nowrap gap-10 font-display font-semibold text-muted/70 uppercase tracking-widest text-sm">
        {strip}
        <span className="flex gap-10 shrink-0" aria-hidden="true">{strip}</span>
      </div>
    </div>
  );
}

function About({ d }: { d: BlockData }) {
  return (
    <section id="about" className="px-4 sm:px-6 lg:px-8 pt-24 md:pt-32 pb-16 bg-ink text-paper relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 right-0 w-[30rem] h-[30rem] rounded-full bg-accent/20 blur-3xl" />
      <div className="mx-auto max-w-6xl relative">
        <p className="reveal text-sm font-medium tracking-widest uppercase text-accent mb-3">02 — About</p>
        <h2 className="reveal font-display font-extrabold tracking-tight text-3xl md:text-5xl leading-tight max-w-4xl">
          {accentText(String(d.body ?? ''), String(d.accent ?? ''), 'text-accent')}
        </h2>
      </div>
    </section>
  );
}

function Pillars({ d }: { d: BlockData }) {
  const items = (d.items as { title: string; body?: string; icon?: string }[] | undefined) ?? [];
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16 bg-ink text-paper relative overflow-hidden">
      <div className="mx-auto max-w-6xl relative grid grid-cols-1 md:grid-cols-3 gap-10">
        {items.map((p, i) => (
          <div key={p.title} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}>
            <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
              {PILLAR_ICONS[p.icon ?? ''] ?? PILLAR_ICONS.code}
              {p.title}
            </h3>
            {!!p.body && <p className="text-paper/60 leading-relaxed text-sm">{p.body}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Skills({ d }: { d: BlockData }) {
  const items = (d.items as string[] | undefined) ?? [];
  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-24 md:pb-32 pt-4 bg-ink text-paper">
      <div className="mx-auto max-w-6xl reveal flex flex-wrap gap-3">
        {items.map((s) => <span key={s} className="skill-chip">{s}</span>)}
      </div>
    </section>
  );
}

function Experience({ d }: { d: BlockData }) {
  const items = (d.items as { title: string; body?: string; period?: string; company?: string; location?: string; current?: boolean }[] | undefined) ?? [];
  return (
    <section id="experience" className="px-4 sm:px-6 lg:px-8 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <p className="reveal text-sm font-medium tracking-widest uppercase text-accent mb-3">03 — Experience</p>
        <h2 className="reveal font-display font-extrabold tracking-tight text-4xl md:text-6xl mb-14">Where I&apos;ve been</h2>
        <ol className="relative border-l-2 border-black/10 ml-2 space-y-12">
          {items.map((e, i) => (
            <li key={`${e.title}-${i}`} className="reveal relative pl-8" style={{ transitionDelay: `${i * 80}ms` }}>
              <span className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full ring-4 ring-paper ${e.current ? 'bg-accent' : 'bg-ink/20'}`} />
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <h3 className="font-display font-bold text-xl">{e.title}</h3>
                {!!e.period && <span className={`text-sm font-medium ${e.current ? 'text-accent' : 'text-muted'}`}>{e.period}</span>}
              </div>
              <p className="text-muted font-medium mt-1">{[e.company, e.location].filter(Boolean).join(' · ')}</p>
              {!!e.body && <p className="mt-3 max-w-2xl leading-relaxed text-muted">{e.body}</p>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

async function ProjectList({ d }: { d: BlockData }) {
  const projects = await getFeaturedProjects(Number(d.maxItems ?? 4));
  return (
    <section id="work" className="px-4 sm:px-6 lg:px-8 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="reveal flex items-end justify-between mb-12">
          <div>
            <p className="text-sm font-medium tracking-widest uppercase text-accent mb-3">01 — Selected Work</p>
            <h2 className="font-display font-extrabold tracking-tight text-4xl md:text-6xl">{String(d.heading ?? 'Projects')}</h2>
          </div>
          <p className="hidden md:block max-w-xs text-sm text-muted">Enterprise platforms, integrations, and products — designed, built, and shipped to production.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((p, i) => {
            const gradient = (p.cardStyle as { gradient?: string[] } | null)?.gradient;
            const style = gradient?.length
              ? { backgroundImage: `linear-gradient(to bottom right, ${gradient.join(', ')})` }
              : undefined;
            const href = p.liveUrl ?? `/projects/${p.slug}`;
            const external = !!p.liveUrl;
            return (
              <Link
                key={p.id}
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener' } : {})}
                className="project-card reveal group relative rounded-3xl overflow-hidden border border-black/[0.06] bg-white cursor-pointer block"
                style={{ transitionDelay: `${(i % 2) * 80}ms` }}
              >
                <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-accent via-accent to-ink" style={style}>
                  <div className="absolute inset-0 card-sheen" />
                  <span className="absolute top-6 left-6 font-display font-black text-white/10 text-7xl select-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                    <div className="flex gap-2 flex-wrap">
                      {p.technologies.map((t) => (
                        <span key={t.technology.name} className="rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-medium text-white">
                          {t.technology.name}
                        </span>
                      ))}
                    </div>
                    <span className="w-11 h-11 shrink-0 rounded-full bg-white text-ink grid place-items-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      <ArrowIcon />
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display font-bold text-2xl tracking-tight group-hover:text-accent transition-colors duration-300">{p.title}</h3>
                  <p className="mt-2 text-muted leading-relaxed">{p.shortDescription}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SideProjects({ d }: { d: BlockData }) {
  const items = (d.items as { title: string; link?: string }[] | undefined) ?? [];
  return (
    <div className="px-4 sm:px-6 lg:px-8 -mt-16 pb-24">
      <div className="mx-auto max-w-6xl">
        <p className="reveal text-sm text-muted">
          More side projects:{' '}
          {items.map((sp, i) => (
            <span key={sp.title}>
              {i > 0 && <span className="mx-2 text-accent">·</span>}
              {sp.link ? (
                <Link href={sp.link} target="_blank" rel="noopener" className="text-ink font-medium underline decoration-accent/40 underline-offset-4 hover:text-accent transition-colors duration-200">
                  {sp.title}
                </Link>
              ) : (
                <span className="text-ink font-medium">{sp.title}</span>
              )}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

async function ContactSection({ d }: { d: BlockData }) {
  const settings = await getSettings();
  const items = (d.items as { label: string; value?: string; link?: string; visible?: boolean }[] | undefined) ?? [];
  const email = settings['site.email'] || items.find((i) => i.label === 'email')?.link?.replace(/^mailto:/, '') || '';
  const socials = items.filter((i) => i.visible !== false && i.link && i.label !== 'email');

  return (
    <section id="contact" className="px-4 sm:px-6 lg:px-8 py-24 md:py-40 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-accent/[0.06] to-transparent" />
      <div className="mx-auto max-w-6xl text-center relative">
        <p className="reveal text-sm font-medium tracking-widest uppercase text-accent mb-6">04 — {String(d.heading ?? 'Contact')}</p>
        <h2 className="reveal font-display font-black tracking-tight text-[clamp(2.5rem,8vw,6rem)] leading-none">
          {(() => {
            const text = String(d.ctaText ?? "Let's build something great together");
            const accent = String(d.ctaAccent ?? 'great together');
            if (accent && text.includes(accent)) {
              const [before, after] = text.split(accent);
              return <>{before}<br /><span className="text-outline-accent">{accent}</span>{after}</>;
            }
            return text;
          })()}
        </h2>
        <p className="reveal mt-8 max-w-xl mx-auto text-muted text-lg leading-relaxed" style={{ transitionDelay: '100ms' }}>
          Have a project in mind, or just want to say hi? My inbox is always open.
        </p>
        <div className="reveal mt-10 flex flex-col sm:flex-row items-center justify-center gap-4" style={{ transitionDelay: '200ms' }}>
          {email && (
            <Link href={`mailto:${email}`} className="inline-flex items-center gap-2 rounded-full bg-ink text-white px-8 py-4 text-sm font-medium hover:bg-accent transition-colors duration-300">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
              {email}
            </Link>
          )}
          <div className="flex items-center gap-3">
            {socials.map((s) => (
              <Link
                key={s.label}
                href={String(s.link)}
                {...(String(s.link).startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}
                aria-label={s.label}
                className="w-12 h-12 rounded-full border border-ink/15 grid place-items-center hover:border-accent hover:text-accent transition-colors duration-300"
              >
                {CONTACT_ICONS[s.label] ?? <ArrowIcon />}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Generic blocks for custom pages ----------

function Hero({ d }: { d: BlockData }) {
  return (
    <section className="px-4 sm:px-6 lg:px-8 pt-32 pb-16">
      <div className="mx-auto max-w-6xl">
        <h1 className={`reveal font-display font-black tracking-tight text-[clamp(2.5rem,8vw,5.5rem)] leading-[0.98] ${d.align === 'center' ? 'text-center' : ''}`}>
          {String(d.heading ?? '')}
        </h1>
        {!!d.subheading && <p className={`reveal mt-6 text-lg text-muted max-w-2xl ${d.align === 'center' ? 'mx-auto text-center' : ''}`}>{String(d.subheading)}</p>}
        {!!(d.ctaLabel && d.ctaUrl) && (
          <div className={`reveal mt-8 ${d.align === 'center' ? 'text-center' : ''}`}>
            <Link href={String(d.ctaUrl)} className="inline-flex items-center gap-2 rounded-full bg-ink text-white px-7 py-3.5 text-sm font-medium hover:bg-accent transition-colors">
              {String(d.ctaLabel)} <ArrowIcon />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function RichText({ d }: { d: BlockData }) {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-3xl prose-content" dangerouslySetInnerHTML={{ __html: String(d.html ?? '') }} />
    </section>
  );
}

function Cta({ d }: { d: BlockData }) {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16">
      <div className="mx-auto max-w-6xl rounded-3xl border border-black/[0.08] bg-white p-10 md:p-16 text-center">
        <h2 className="reveal font-display font-extrabold tracking-tight text-3xl md:text-5xl">{String(d.heading ?? '')}</h2>
        {!!d.text && <p className="reveal mt-4 text-muted max-w-xl mx-auto">{String(d.text)}</p>}
        {!!(d.buttonLabel && d.buttonUrl) && (
          <Link href={String(d.buttonUrl)} className="reveal mt-8 inline-flex items-center gap-2 rounded-full bg-ink text-white px-7 py-3.5 text-sm font-medium hover:bg-accent transition-colors">
            {String(d.buttonLabel)} <ArrowIcon />
          </Link>
        )}
      </div>
    </section>
  );
}

async function Gallery({ d }: { d: BlockData }) {
  const ids = (d.mediaIds as string[] | undefined) ?? [];
  if (!ids.length) return null;
  const media = await prisma.media.findMany({ where: { id: { in: ids }, deletedAt: null } });
  const byId = new Map(media.map((m) => [m.id, m]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ordered.map((m) => (
          <div key={m!.id} className="rounded-2xl overflow-hidden border border-black/[0.08] bg-white">
            <Image src={m!.storagePath} alt={m!.altText ?? m!.originalName} width={m!.width ?? 800} height={m!.height ?? 600} className="w-full h-auto object-cover" />
            {!!m!.caption && <p className="px-4 py-3 text-xs text-muted">{m!.caption}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Spacer({ d }: { d: BlockData }) {
  const h = { sm: 'h-8', md: 'h-16', lg: 'h-24' }[String(d.size ?? 'md')] ?? 'h-16';
  return <div className={h} aria-hidden="true" />;
}

// ---------- Dispatcher ----------

export function renderBlock(block: { id: string; type: string; data: unknown }) {
  const d = (block.data ?? {}) as BlockData;
  switch (block.type) {
    case 'homeHero': return <HomeHero key={block.id} d={d} />;
    case 'marquee': return <Marquee key={block.id} d={d} />;
    case 'about': return <About key={block.id} d={d} />;
    case 'pillars': return <Pillars key={block.id} d={d} />;
    case 'skills': return <Skills key={block.id} d={d} />;
    case 'experience': return <Experience key={block.id} d={d} />;
    case 'projectList': return <ProjectList key={block.id} d={d} />;
    case 'sideProjects': return <SideProjects key={block.id} d={d} />;
    case 'contactSection': return <ContactSection key={block.id} d={d} />;
    case 'hero': return <Hero key={block.id} d={d} />;
    case 'richText': return <RichText key={block.id} d={d} />;
    case 'cta': return <Cta key={block.id} d={d} />;
    case 'gallery': return <Gallery key={block.id} d={d} />;
    case 'spacer': return <Spacer key={block.id} d={d} />;
    default: return null;
  }
}
