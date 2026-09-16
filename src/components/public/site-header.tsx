import Link from 'next/link';
import { getNavItems } from '@/lib/public-data';

// Fallback nav when the CMS header menu is empty — mirrors the legacy site.
const FALLBACK = [
  { label: 'Work', url: '/#work' },
  { label: 'About', url: '/#about' },
  { label: 'Experience', url: '/#experience' },
  { label: 'Blog', url: '/blog' },
  { label: 'Contact', url: '/#contact' },
];

function href(url: string): string {
  return url;
}

export async function SiteHeader() {
  const items = await getNavItems('HEADER');
  const links = items.length
    ? items.map((i) => ({ label: i.label, url: i.url, newTab: i.openInNewTab }))
    : FALLBACK.map((l) => ({ ...l, newTab: false }));

  return (
    <header className="fixed top-4 left-4 right-4 z-50">
      <nav className="mx-auto max-w-6xl flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white/70 backdrop-blur-xl px-5 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <Link href="/" className="font-display tracking-tight text-lg font-extrabold cursor-pointer">
          AK<span className="text-accent">.</span>
        </Link>

        <ul className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
          {links.map((l) => (
            <li key={l.label}>
              <Link
                className="hover:text-ink transition-colors duration-200 cursor-pointer"
                href={href(l.url)}
                {...(l.newTab ? { target: '_blank', rel: 'noopener' } : {})}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/#contact"
          className="hidden md:inline-flex items-center gap-2 rounded-full bg-ink text-white text-sm font-medium px-5 py-2.5 hover:bg-accent transition-colors duration-300 cursor-pointer"
        >
          Let&apos;s talk
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M7 7h10v10" /></svg>
        </Link>

        <button id="menu-btn" className="md:hidden p-2 cursor-pointer" aria-label="Open menu" aria-expanded="false">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </nav>

      <div id="mobile-menu" className="md:hidden hidden mx-auto max-w-6xl mt-2 rounded-2xl border border-black/[0.06] bg-white/90 backdrop-blur-xl p-4 shadow-lg">
        <ul className="flex flex-col gap-1 text-base font-medium">
          {links.map((l) => (
            <li key={l.label}>
              <Link
                className="block rounded-xl px-4 py-3 hover:bg-black/5 transition-colors cursor-pointer"
                href={href(l.url)}
                {...(l.newTab ? { target: '_blank', rel: 'noopener' } : {})}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
