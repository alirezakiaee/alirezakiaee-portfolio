import Link from 'next/link';
import { getNavItems } from '@/lib/public-data';

export async function SiteFooter() {
  const items = await getNavItems('FOOTER');

  return (
    <footer className="border-t border-black/[0.06] px-4 sm:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
        <p>© {new Date().getFullYear()} Alireza Kiaee. Crafted with care.</p>
        {items.length > 0 && (
          <ul className="flex items-center gap-5">
            {items.map((i) => (
              <li key={i.id}>
                <Link
                  href={i.url}
                  className="hover:text-accent transition-colors duration-200"
                  {...(i.openInNewTab ? { target: '_blank', rel: 'noopener' } : {})}
                >
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/#top" className="inline-flex items-center gap-2 hover:text-accent transition-colors duration-200 cursor-pointer">
          Back to top
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
        </Link>
      </div>
    </footer>
  );
}
