import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject } from '@/services/projects.service';
import { ProjectForm, type ProjectFormInitial } from '../_components/project-form';
import { DeleteProjectButton } from '../_components/delete-button';

const dateInput = (d: Date | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : undefined;
const datetimeInput = (d: Date | null) =>
  d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined;

export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; restored?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const project = await getProject(id);
  if (!project) notFound();

  const initial: ProjectFormInitial = {
    id: project.id,
    status: project.status,
    title: project.title,
    slug: project.slug,
    shortDescription: project.shortDescription,
    overview: project.overview,
    problem: project.problem,
    goals: project.goals,
    architecture: project.architecture,
    implementation: project.implementation,
    challenges: project.challenges,
    solution: project.solution,
    results: project.results,
    client: project.client,
    industry: project.industry,
    projectType: project.projectType,
    projectDate: dateInput(project.projectDate),
    completionDate: dateInput(project.completionDate),
    githubUrl: project.githubUrl,
    liveUrl: project.liveUrl,
    videoUrl: project.videoUrl,
    metricsJson: project.metrics ? JSON.stringify(project.metrics) : '',
    technologyNames: project.technologies.map((t) => t.technology.name).join(', '),
    featured: project.featured,
    sortOrder: project.sortOrder,
    scheduledAt: datetimeInput(project.scheduledAt),
    seoTitle: project.seoTitle,
    seoDescription: project.seoDescription,
    canonicalUrl: project.canonicalUrl,
    robotsIndex: project.robotsIndex,
    robotsFollow: project.robotsFollow,
    ogTitle: project.ogTitle,
    ogDescription: project.ogDescription,
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">{project.title}</h1>
          <p className="text-sm text-muted mt-2">
            <code className="bg-black/5 rounded px-1.5 py-0.5 text-xs">/{project.slug}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/vorudealireza/projects/${project.id}/revisions`} className="btn-ghost">
            Revisions
          </Link>
          <DeleteProjectButton id={project.id} title={project.title} />
        </div>
      </div>

      {sp.saved && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Saved.
        </p>
      )}
      {sp.restored && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Revision restored.
        </p>
      )}

      <div className="mt-8">
        <ProjectForm project={initial} />
      </div>
    </div>
  );
}
