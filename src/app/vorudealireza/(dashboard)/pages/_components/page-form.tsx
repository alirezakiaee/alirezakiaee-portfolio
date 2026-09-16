'use client';

import { useActionState } from 'react';
import { savePage, type PageFormState } from '../actions';
import { BlockEditor, toEditorBlocks } from './block-editor';

export type PageFormInitial = {
  id?: string;
  status?: string;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  template?: string;
  parentId?: string | null;
  sortOrder?: number;
  blocks?: { type: string; data: unknown; enabled: boolean }[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  ogTitle?: string | null;
  ogDescription?: string | null;
  scheduledAt?: string;
};

const initial: PageFormState = { error: null };

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

export function PageForm({
  page,
  parentOptions,
}: {
  page: PageFormInitial;
  parentOptions: { id: string; title: string; slug: string }[];
}) {
  const [state, formAction, pending] = useActionState(savePage, initial);
  const status = page.status ?? 'DRAFT';

  return (
    <form action={formAction} className="space-y-6">
      {page.id && <input type="hidden" name="id" value={page.id} />}

      <Section title="Page">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <input id="title" name="title" className="field" defaultValue={page.title} required maxLength={200} />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <input id="slug" name="slug" className="field font-mono text-xs" defaultValue={page.slug} placeholder="auto-from-title" maxLength={80} />
          </div>
          <div>
            <Label htmlFor="template">Template</Label>
            <input id="template" name="template" className="field" defaultValue={page.template ?? 'default'} maxLength={60} />
          </div>
          <div>
            <Label htmlFor="parentId">Parent page</Label>
            <select id="parentId" name="parentId" className="field" defaultValue={page.parentId ?? ''}>
              <option value="">— none —</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} (/{p.slug})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="sortOrder">Sort order</Label>
            <input id="sortOrder" name="sortOrder" type="number" className="field" defaultValue={page.sortOrder ?? 0} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <textarea id="excerpt" name="excerpt" rows={2} className="field" defaultValue={page.excerpt ?? ''} maxLength={500} />
          </div>
        </div>
      </Section>

      <BlockEditor initialBlocks={toEditorBlocks(page.blocks ?? [])} />

      <Section title="SEO">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="seoTitle">SEO title</Label>
            <input id="seoTitle" name="seoTitle" className="field" defaultValue={page.seoTitle ?? ''} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="canonicalUrl">Canonical URL</Label>
            <input id="canonicalUrl" name="canonicalUrl" type="url" className="field" defaultValue={page.canonicalUrl ?? ''} />
          </div>
          <div>
            <Label htmlFor="seoDescription">SEO description</Label>
            <textarea id="seoDescription" name="seoDescription" rows={2} className="field" defaultValue={page.seoDescription ?? ''} />
          </div>
          <div>
            <Label htmlFor="ogTitle">OG title</Label>
            <input id="ogTitle" name="ogTitle" className="field" defaultValue={page.ogTitle ?? ''} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="ogDescription">OG description</Label>
            <textarea id="ogDescription" name="ogDescription" rows={2} className="field" defaultValue={page.ogDescription ?? ''} />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="robotsIndex" defaultChecked={page.robotsIndex ?? true} className="accent-accent" />
              robots index
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="robotsFollow" defaultChecked={page.robotsFollow ?? true} className="accent-accent" />
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
          <input id="scheduledAt" name="scheduledAt" type="datetime-local" className="field" defaultValue={page.scheduledAt ?? ''} />
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
