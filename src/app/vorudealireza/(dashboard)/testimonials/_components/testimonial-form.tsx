'use client';

import { useActionState } from 'react';
import { deleteTestimonial, saveTestimonial, type TestimonialFormState } from '../actions';

export type TestimonialFormInitial = {
  id?: string;
  authorName?: string;
  authorTitle?: string | null;
  authorCompany?: string | null;
  quote?: string;
  avatarId?: string | null;
  projectId?: string | null;
  featured?: boolean;
  sortOrder?: number;
};

type Option = { id: string; label: string };

const initial: TestimonialFormState = { error: null };

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
      {children}
    </label>
  );
}

export function TestimonialForm({ testimonial, media, projects }: {
  testimonial: TestimonialFormInitial;
  media: Option[];
  projects: Option[];
}) {
  const [state, formAction, pending] = useActionState(saveTestimonial, initial);
  const [delState, delAction, delPending] = useActionState(deleteTestimonial, initial);

  return (
    <div className="space-y-6">
      <form action={formAction} className="rounded-2xl border border-black/[0.08] bg-white p-5 space-y-4">
        {testimonial.id && <input type="hidden" name="id" value={testimonial.id} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="authorName">Author name</Label>
            <input id="authorName" name="authorName" className="field" defaultValue={testimonial.authorName} required maxLength={120} />
          </div>
          <div>
            <Label htmlFor="authorTitle">Title / role</Label>
            <input id="authorTitle" name="authorTitle" className="field" defaultValue={testimonial.authorTitle ?? ''} maxLength={120} />
          </div>
          <div>
            <Label htmlFor="authorCompany">Company</Label>
            <input id="authorCompany" name="authorCompany" className="field" defaultValue={testimonial.authorCompany ?? ''} maxLength={120} />
          </div>
          <div>
            <Label htmlFor="avatarId">Avatar (media)</Label>
            <select id="avatarId" name="avatarId" className="field" defaultValue={testimonial.avatarId ?? ''}>
              <option value="">— none —</option>
              {media.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="quote">Quote</Label>
            <textarea id="quote" name="quote" rows={4} className="field" defaultValue={testimonial.quote} required maxLength={5000} />
          </div>
          <div>
            <Label htmlFor="projectId">Related project</Label>
            <select id="projectId" name="projectId" className="field" defaultValue={testimonial.projectId ?? ''}>
              <option value="">— none —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="sortOrder">Sort order</Label>
            <input id="sortOrder" name="sortOrder" type="number" className="field" defaultValue={testimonial.sortOrder ?? 0} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer sm:col-span-2">
            <input type="checkbox" name="featured" defaultChecked={testimonial.featured} className="accent-accent" />
            Featured testimonial
          </label>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn" disabled={pending}>Save testimonial</button>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        </div>
      </form>

      {testimonial.id && (
        <form
          action={delAction}
          className="rounded-2xl border border-red-200 bg-red-50/50 p-5 flex items-center justify-between"
          onSubmit={(e) => {
            if (!confirm('Delete this testimonial? This cannot be undone.')) e.preventDefault();
          }}
        >
          <p className="text-sm text-red-700">Permanently delete this testimonial.</p>
          <input type="hidden" name="id" value={testimonial.id} />
          <button type="submit" className="btn-ghost !text-red-600 !border-red-200" disabled={delPending}>Delete</button>
          {delState.error && <p className="text-sm text-red-600">{delState.error}</p>}
        </form>
      )}
    </div>
  );
}
