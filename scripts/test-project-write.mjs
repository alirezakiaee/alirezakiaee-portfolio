import { readFileSync } from 'node:fs';
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]+)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { prisma } = await import('../src/lib/db.ts');

const step = async (name, fn) => {
  try {
    const r = await fn();
    console.log('PASS', name, typeof r === 'object' ? JSON.stringify(r).slice(0, 120) : r);
    return r;
  } catch (e) {
    console.log('FAIL', name, '→', String(e).slice(0, 200));
    return null;
  }
};

const p = await step('project.create', () =>
  prisma.project.create({
    data: { title: 'TSX smoke', slug: 'tsx-smoke', shortDescription: 'x', status: 'DRAFT' },
  })
);

if (p) {
  await step('technology.upsert', () =>
    prisma.technology.upsert({ where: { slug: 'tsx-tech' }, update: { name: 'TSX Tech' }, create: { name: 'TSX Tech', slug: 'tsx-tech' } })
  );
  const tech = await prisma.technology.findUnique({ where: { slug: 'tsx-tech' } });
  await step('createMany', () =>
    prisma.projectTechnology.createMany({ data: [{ projectId: p.id, technologyId: tech.id }], skipDuplicates: true })
  );
  await step('transaction', () =>
    prisma.$transaction([
      prisma.projectTechnology.deleteMany({ where: { projectId: p.id, technologyId: { notIn: [tech.id] } } }),
      prisma.projectTechnology.createMany({ data: [{ projectId: p.id, technologyId: tech.id }], skipDuplicates: true }),
    ])
  );
  await step('revision.create', () =>
    prisma.projectRevision.create({ data: { projectId: p.id, snapshot: { title: 'x' } } })
  );
  await step('audit.create', () =>
    prisma.auditLog.create({ data: { action: 'test', resource: 'project', resourceId: p.id } })
  );
  await prisma.project.delete({ where: { id: p.id } });
  console.log('cleanup ok');
}
await prisma.$disconnect();
