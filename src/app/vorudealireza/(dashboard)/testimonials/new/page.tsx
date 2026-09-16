import { prisma } from '@/lib/db';
import { TestimonialForm } from '../_components/testimonial-form';

export default async function NewTestimonialPage() {
  const [media, projects] = await Promise.all([
    prisma.media.findMany({ where: { deletedAt: null, mimeType: { startsWith: 'image/' } }, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, originalName: true } }),
    prisma.project.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true } }),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">New testimonial</h1>
      <div className="mt-8">
        <TestimonialForm
          testimonial={{}}
          media={media.map((m) => ({ id: m.id, label: m.originalName }))}
          projects={projects.map((p) => ({ id: p.id, label: p.title }))}
        />
      </div>
    </div>
  );
}
