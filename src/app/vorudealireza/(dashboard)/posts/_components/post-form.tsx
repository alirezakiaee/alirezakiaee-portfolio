'use client';

import { useActionState } from 'react';
import { savePost, type PostFormState } from '../actions';

export type PostFormInitial = {
  id?: string;
  status?: string;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  content?: string;
  featuredImageId?: string | null;
  categoryNames?: string;
  tagNames?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  ogTitle?: string | null;
  ogDescription?: string | null;
  scheduledAt?: string;
};

const initial: PostFormState = { error: null };

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

export function PostForm({
  post,
  images,
}: {
  post: PostFormInitial;
  images: { id: string; originalName: string; title: string | null }[];
}) {
  const [state, formAction, pending] = useActionState(savePost, initial);
  const status = post.status ?? 'DRAFT';

  return (
    <form action={formAction} className="space-y-6">
      {post.id && <input type="hidden" name="id" value={post.id} />}

      <Section title="Post">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <input id="title" name="title" className="field" defaultValue={post.title} required maxLength={200} />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <input id="slug" name="slug" className="field font-mono text-xs" defaultValue={post.slug} placeholder="auto-from-title" maxLength={80} />
          </div>
          <div>
            <Label htmlFor="featuredImageId">Featured image</Label>
            <select id="featuredImageId" name="featuredImageId" className="field" defaultValue={post.featuredImageId ?? ''}>
              <option value="">— none —</option>
              {images.map((m) => (
                <option key={m.id} value={m.id}>{m.title ?? m.originalName}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <textarea id="excerpt" name="excerpt" rows={2} className="field" defaultValue={post.excerpt ?? ''} maxLength={500} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="content">Content (HTML — sanitized on save)</Label>
            <textarea
              id="content"
              name="content"
              rows={14}
              className="field font-mono text-xs"
              defaultValue={post.content ?? ''}
              placeholder="<p>Write your post…</p>"
            />
          </div>
          <div>
            <Label htmlFor="categoryNames">Categories (comma separated)</Label>
            <input id="categoryNames" name="categoryNames" className="field" defaultValue={post.categoryNames ?? ''} placeholder="Engineering, Notes" />
          </div>
          <div>
            <Label htmlFor="tagNames">Tags (comma separated)</Label>
            <input id="tagNames" name="tagNames" className="field" defaultValue={post.tagNames ?? ''} placeholder="typescript, prisma" />
          </div>
        </div>
      </Section>

      <Section title="SEO">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="seoTitle">SEO title</Label>
            <input id="seoTitle" name="seoTitle" className="field" defaultValue={post.seoTitle ?? ''} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="canonicalUrl">Canonical URL</Label>
            <input id="canonicalUrl" name="canonicalUrl" type="url" className="field" defaultValue={post.canonicalUrl ?? ''} />
          </div>
          <div>
            <Label htmlFor="seoDescription">SEO description</Label>
            <textarea id="seoDescription" name="seoDescription" rows={2} className="field" defaultValue={post.seoDescription ?? ''} />
          </div>
          <div>
            <Label htmlFor="ogTitle">OG title</Label>
            <input id="ogTitle" name="ogTitle" className="field" defaultValue={post.ogTitle ?? ''} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="ogDescription">OG description</Label>
            <textarea id="ogDescription" name="ogDescription" rows={2} className="field" defaultValue={post.ogDescription ?? ''} />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="robotsIndex" defaultChecked={post.robotsIndex ?? true} className="accent-accent" />
              robots index
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="robotsFollow" defaultChecked={post.robotsFollow ?? true} className="accent-accent" />
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
          <input id="scheduledAt" name="scheduledAt" type="datetime-local" className="field" defaultValue={post.scheduledAt ?? ''} />
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
