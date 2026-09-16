import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { TestimonialForm } from '../_components/testimonial-form';

export default async function EditTestimonialPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const [t, media, projects] = await Promise.all([
    prisma.testimonial.findUnique({ where: { id } }),
    prisma.media.findMany({ where: { deletedAt: null, mimeType: { startsWith: 'image/' } }, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, originalName: true } }),
    prisma.project.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true } }),
  ]);
  if (!t) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">{t.authorName}</h1>
      {saved && <p className="mt-2 text-sm text-green-700">Saved.</p>}
      <div className="mt-8">
        <TestimonialForm
          testimonial={{
            id: t.id,
            authorName: t.authorName,
            authorTitle: t.authorTitle,
            authorCompany: t.authorCompany,
            quote: t.quote,
            avatarId: t.avatarId,
            projectId: t.projectId,
            featured: t.featured,
            sortOrder: t.sortOrder,
          }}
          media={media.map((m) => ({ id: m.id, label: m.originalName }))}
          projects={projects.map((p) => ({ id: p.id, label: p.title }))}
        />
      </div>
    </div>
  );
}
