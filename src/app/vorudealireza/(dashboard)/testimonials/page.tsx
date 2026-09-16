import Link from 'next/link';
import { prisma } from '@/lib/db';

export default async function TestimonialsPage() {
  const items = await prisma.testimonial.findMany({
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: { project: { select: { title: true } } },
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">Testimonials</h1>
          <p className="text-sm text-muted mt-2">{items.length} collected.</p>
        </div>
        <Link href="/vorudealireza/testimonials/new" className="btn">New testimonial</Link>
      </div>

      <ul className="mt-8 space-y-3">
        {items.map((t) => (
          <li key={t.id}>
            <Link
              href={`/vorudealireza/testimonials/${t.id}`}
              className="block rounded-2xl border border-black/[0.08] bg-white px-5 py-4 hover:border-accent/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{t.authorName}</span>
                {t.authorTitle && <span className="text-xs text-muted">{t.authorTitle}{t.authorCompany ? `, ${t.authorCompany}` : ''}</span>}
                {t.featured && <span className="badge badge-published">Featured</span>}
                <span className="ml-auto text-xs text-muted">order {t.sortOrder}</span>
              </div>
              <p className="mt-1.5 text-sm text-muted line-clamp-2">“{t.quote}”</p>
              {t.project && <p className="mt-1 text-xs text-accent">↳ {t.project.title}</p>}
            </Link>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-2xl border border-dashed border-black/[0.15] px-5 py-10 text-center text-sm text-muted">
            No testimonials yet.
          </li>
        )}
      </ul>
    </div>
  );
}
