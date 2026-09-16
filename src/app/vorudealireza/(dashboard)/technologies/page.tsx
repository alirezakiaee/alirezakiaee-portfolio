import { prisma } from '@/lib/db';
import { TechManager } from './_components/tech-manager';

export default async function TechnologiesPage() {
  const techs = await prisma.technology.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { projects: true, services: true } } },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">Technologies</h1>
      <p className="text-sm text-muted mt-2">
        The taxonomy used by projects and services. {techs.length} defined.
      </p>
      <div className="mt-8">
        <TechManager techs={techs.map((t) => ({ id: t.id, name: t.name, slug: t.slug, icon: t.icon, usage: t._count.projects + t._count.services }))} />
      </div>
    </div>
  );
}
