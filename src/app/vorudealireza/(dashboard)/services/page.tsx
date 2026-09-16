import Link from 'next/link';
import { prisma } from '@/lib/db';

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { technologies: { include: { technology: { select: { name: true } } } } },
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">Services</h1>
          <p className="text-sm text-muted mt-2">{services.length} defined.</p>
        </div>
        <Link href="/vorudealireza/services/new" className="btn">New service</Link>
      </div>

      <ul className="mt-8 space-y-3">
        {services.map((s) => (
          <li key={s.id}>
            <Link
              href={`/vorudealireza/services/${s.id}`}
              className="block rounded-2xl border border-black/[0.08] bg-white px-5 py-4 hover:border-accent/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{s.name}</span>
                <code className="text-xs bg-black/5 rounded px-1.5 py-0.5">{s.slug}</code>
                <span className={`badge ${s.active ? 'badge-published' : 'badge-archived'}`}>
                  {s.active ? 'Active' : 'Inactive'}
                </span>
                <span className="ml-auto text-xs text-muted">order {s.sortOrder}</span>
              </div>
              {s.summary && <p className="mt-1.5 text-sm text-muted line-clamp-1">{s.summary}</p>}
              {s.technologies.length > 0 && (
                <p className="mt-1.5 text-xs text-muted">
                  {s.technologies.map((t) => t.technology.name).join(' · ')}
                </p>
              )}
            </Link>
          </li>
        ))}
        {services.length === 0 && (
          <li className="rounded-2xl border border-dashed border-black/[0.15] px-5 py-10 text-center text-sm text-muted">
            No services yet — create your first one.
          </li>
        )}
      </ul>
    </div>
  );
}
