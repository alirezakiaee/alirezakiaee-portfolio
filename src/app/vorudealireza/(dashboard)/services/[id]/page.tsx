import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ServiceForm } from '../_components/service-form';

export default async function EditServicePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const svc = await prisma.service.findUnique({
    where: { id },
    include: { technologies: { include: { technology: { select: { name: true } } } } },
  });
  if (!svc) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">{svc.name}</h1>
      {saved && <p className="mt-2 text-sm text-green-700">Saved.</p>}
      <div className="mt-8">
        <ServiceForm
          service={{
            id: svc.id,
            name: svc.name,
            slug: svc.slug,
            summary: svc.summary,
            description: svc.description,
            icon: svc.icon,
            features: Array.isArray(svc.features) ? (svc.features as string[]) : [],
            ctaLabel: svc.ctaLabel,
            ctaUrl: svc.ctaUrl,
            active: svc.active,
            sortOrder: svc.sortOrder,
            technologyNames: svc.technologies.map((t) => t.technology.name).join(', '),
          }}
        />
      </div>
    </div>
  );
}
