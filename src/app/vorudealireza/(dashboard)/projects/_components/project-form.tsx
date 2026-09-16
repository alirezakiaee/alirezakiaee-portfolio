'use client';

import { useActionState } from 'react';
import { saveProject, type ProjectFormState } from '../actions';

export type ProjectFormInitial = {
  id?: string;
  status?: string;
  title?: string;
  slug?: string;
  shortDescription?: string;
  overview?: string | null;
  problem?: string | null;
  goals?: string | null;
  architecture?: string | null;
  implementation?: string | null;
  challenges?: string | null;
  solution?: string | null;
  results?: string | null;
  client?: string | null;
  industry?: string | null;
  projectType?: string | null;
  projectDate?: string;
  completionDate?: string;
  githubUrl?: string | null;
  liveUrl?: string | null;
  videoUrl?: string | null;
  metricsJson?: string;
  technologyNames?: string;
  featured?: boolean;
  sortOrder?: number;
  scheduledAt?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  ogTitle?: string | null;
  ogDescription?: string | null;
};

const initial: ProjectFormState = { error: null };

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-black/[0.08] bg-white p-5 space-y-4">
      <legend className="font-display font-bold text-sm px-1">{title}</legend>
      {children}
    </fieldset>
  );
}

function TextArea({ id, name, rows = 4, defaultValue, placeholder, mono }: {
  id: string; name: string; rows?: number; defaultValue?: string | null; placeholder?: string; mono?: boolean;
}) {
  return (
    <textarea
      id={id}
      name={name}
      rows={rows}
      defaultValue={defaultValue ?? ''}
      placeholder={placeholder}
      className={`field ${mono ? 'font-mono text-xs' : ''}`}
    />
  );
}

export function ProjectForm({ project }: { project: ProjectFormInitial }) {
  const [state, formAction, pending] = useActionState(saveProject, initial);
  const status = project.status ?? 'DRAFT';

  return (
    <form action={formAction} className="space-y-6">
      {project.id && <input type="hidden" name="id" value={project.id} />}

      <Section title="Basics">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <input id="title" name="title" className="field" defaultValue={project.title} required maxLength={200} />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <input
              id="slug"
              name="slug"
              className="field font-mono text-xs"
              defaultValue={project.slug}
              placeholder="auto-from-title"
              maxLength={80}
            />
          </div>
          <div>
            <Label htmlFor="sortOrder">Sort order</Label>
            <input id="sortOrder" name="sortOrder" type="number" className="field" defaultValue={project.sortOrder ?? 0} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="shortDescription">Short description</Label>
            <TextArea id="shortDescription" name="shortDescription" rows={2} defaultValue={project.shortDescription} />
          </div>
          <div>
            <Label htmlFor="client">Client</Label>
            <input id="client" name="client" className="field" defaultValue={project.client ?? ''} maxLength={120} />
          </div>
          <div>
            <Label htmlFor="industry">Industry</Label>
            <input id="industry" name="industry" className="field" defaultValue={project.industry ?? ''} maxLength={120} />
          </div>
          <div>
            <Label htmlFor="projectType">Project type</Label>
            <input id="projectType" name="projectType" className="field" defaultValue={project.projectType ?? ''} maxLength={120} placeholder="Integration platform" />
          </div>
          <div>
            <Label htmlFor="technologyNames">Technologies (comma separated)</Label>
            <input
              id="technologyNames"
              name="technologyNames"
              className="field"
              defaultValue={project.technologyNames ?? ''}
              placeholder="TypeScript, Node.js, PostgreSQL"
            />
          </div>
          <div>
            <Label htmlFor="projectDate">Start date</Label>
            <input id="projectDate" name="projectDate" type="date" className="field" defaultValue={project.projectDate ?? ''} />
          </div>
          <div>
            <Label htmlFor="completionDate">Completion date</Label>
            <input id="completionDate" name="completionDate" type="date" className="field" defaultValue={project.completionDate ?? ''} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2 cursor-pointer">
            <input type="checkbox" name="featured" defaultChecked={project.featured} className="accent-accent" />
            Featured project
          </label>
        </div>
      </Section>

      <Section title="Case study">
        {(
          [
            ['overview', 'Overview'],
            ['problem', 'Problem'],
            ['goals', 'Goals'],
            ['architecture', 'Architecture'],
            ['implementation', 'Implementation'],
            ['challenges', 'Challenges'],
            ['solution', 'Solution'],
            ['results', 'Results'],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <Label htmlFor={key}>{label}</Label>
            <TextArea id={key} name={key} rows={3} defaultValue={project[key]} />
          </div>
        ))}
        <div>
          <Label htmlFor="metricsJson">Metrics (JSON)</Label>
          <TextArea
            id="metricsJson"
            name="metricsJson"
            rows={3}
            mono
            defaultValue={project.metricsJson}
            placeholder='[{"label":"Daily orders","value":"1,500+"},{"label":"SKUs","value":"30,000+"}]'
          />
        </div>
      </Section>

      <Section title="Links">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="githubUrl">GitHub URL</Label>
            <input id="githubUrl" name="githubUrl" type="url" className="field" defaultValue={project.githubUrl ?? ''} placeholder="https://github.com/…" />
          </div>
          <div>
            <Label htmlFor="liveUrl">Live URL</Label>
            <input id="liveUrl" name="liveUrl" type="url" className="field" defaultValue={project.liveUrl ?? ''} placeholder="https://…" />
          </div>
          <div>
            <Label htmlFor="videoUrl">Video URL</Label>
            <input id="videoUrl" name="videoUrl" type="url" className="field" defaultValue={project.videoUrl ?? ''} placeholder="https://…" />
          </div>
        </div>
      </Section>

      <Section title="SEO">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="seoTitle">SEO title</Label>
            <input id="seoTitle" name="seoTitle" className="field" defaultValue={project.seoTitle ?? ''} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="canonicalUrl">Canonical URL</Label>
            <input id="canonicalUrl" name="canonicalUrl" type="url" className="field" defaultValue={project.canonicalUrl ?? ''} />
          </div>
          <div>
            <Label htmlFor="seoDescription">SEO description</Label>
            <TextArea id="seoDescription" name="seoDescription" rows={2} defaultValue={project.seoDescription} />
          </div>
          <div>
            <Label htmlFor="ogTitle">OG title</Label>
            <input id="ogTitle" name="ogTitle" className="field" defaultValue={project.ogTitle ?? ''} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="ogDescription">OG description</Label>
            <TextArea id="ogDescription" name="ogDescription" rows={2} defaultValue={project.ogDescription} />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="robotsIndex" defaultChecked={project.robotsIndex ?? true} className="accent-accent" />
              robots index
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="robotsFollow" defaultChecked={project.robotsFollow ?? true} className="accent-accent" />
              robots follow
            </label>
          </div>
        </div>
      </Section>

      <div className="rounded-2xl border border-black/[0.08] bg-white p-5 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted mr-auto">
          Status: <span className="font-medium text-ink">{status}</span>
        </span>
        <button type="submit" name="intent" value="save" className="btn-ghost" disabled={pending}>
          Save
        </button>
        {status !== 'PUBLISHED' && (
          <button type="submit" name="intent" value="publish" className="btn" disabled={pending}>
            Publish
          </button>
        )}
        {status === 'PUBLISHED' && (
          <button type="submit" name="intent" value="unpublish" className="btn-ghost" disabled={pending}>
            Unpublish
          </button>
        )}
        {status !== 'ARCHIVED' && (
          <button type="submit" name="intent" value="archive" className="btn-ghost" disabled={pending}>
            Archive
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-black/[0.08] bg-white p-5 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="scheduledAt">Schedule publish at</Label>
          <input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            className="field"
            defaultValue={project.scheduledAt ?? ''}
          />
        </div>
        <button type="submit" name="intent" value="schedule" className="btn-ghost" disabled={pending}>
          Schedule
        </button>
      </div>

      {state.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}
    </form>
  );
}
