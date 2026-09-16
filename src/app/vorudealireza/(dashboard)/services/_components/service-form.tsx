'use client';

import { useActionState } from 'react';
import { deleteService, saveService, type ServiceFormState } from '../actions';

export type ServiceFormInitial = {
  id?: string;
  name?: string;
  slug?: string;
  summary?: string | null;
  description?: string | null;
  icon?: string | null;
  features?: string[];
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  active?: boolean;
  sortOrder?: number;
  technologyNames?: string;
};

const initial: ServiceFormState = { error: null };

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
      {children}
    </label>
  );
}

export function ServiceForm({ service }: { service: ServiceFormInitial }) {
  const [state, formAction, pending] = useActionState(saveService, initial);
  const [delState, delAction, delPending] = useActionState(deleteService, initial);

  return (
    <div className="space-y-6">
      <form action={formAction} className="rounded-2xl border border-black/[0.08] bg-white p-5 space-y-4">
        {service.id && <input type="hidden" name="id" value={service.id} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <input id="name" name="name" className="field" defaultValue={service.name} required maxLength={120} />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <input id="slug" name="slug" className="field font-mono text-xs" defaultValue={service.slug} placeholder="auto-from-name" maxLength={80} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="summary">Summary</Label>
            <textarea id="summary" name="summary" rows={2} className="field" defaultValue={service.summary ?? ''} maxLength={500} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea id="description" name="description" rows={5} className="field" defaultValue={service.description ?? ''} />
          </div>
          <div>
            <Label htmlFor="icon">Icon</Label>
            <input id="icon" name="icon" className="field" defaultValue={service.icon ?? ''} placeholder="icon name or URL" maxLength={300} />
          </div>
          <div>
            <Label htmlFor="technologyNames">Technologies (comma separated)</Label>
            <input id="technologyNames" name="technologyNames" className="field" defaultValue={service.technologyNames ?? ''} placeholder="Node.js, PostgreSQL" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="features">Features (one per line)</Label>
            <textarea
              id="features"
              name="features"
              rows={4}
              className="field font-mono text-xs"
              defaultValue={(service.features ?? []).join('\n')}
              placeholder={'Discovery workshop\nAPI design\nOngoing support'}
            />
          </div>
          <div>
            <Label htmlFor="ctaLabel">CTA label</Label>
            <input id="ctaLabel" name="ctaLabel" className="field" defaultValue={service.ctaLabel ?? ''} maxLength={80} />
          </div>
          <div>
            <Label htmlFor="ctaUrl">CTA URL</Label>
            <input id="ctaUrl" name="ctaUrl" className="field" defaultValue={service.ctaUrl ?? ''} placeholder="/contact or https://…" maxLength={500} />
          </div>
          <div>
            <Label htmlFor="sortOrder">Sort order</Label>
            <input id="sortOrder" name="sortOrder" type="number" className="field" defaultValue={service.sortOrder ?? 0} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer self-end pb-2">
            <input type="checkbox" name="active" defaultChecked={service.active ?? true} className="accent-accent" />
            Active (visible on site)
          </label>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn" disabled={pending}>Save service</button>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        </div>
      </form>

      {service.id && (
        <form
          action={delAction}
          className="rounded-2xl border border-red-200 bg-red-50/50 p-5 flex items-center justify-between"
          onSubmit={(e) => {
            if (!confirm('Delete this service? This cannot be undone.')) e.preventDefault();
          }}
        >
          <p className="text-sm text-red-700">Permanently delete this service.</p>
          <input type="hidden" name="id" value={service.id} />
          <button type="submit" className="btn-ghost !text-red-600 !border-red-200" disabled={delPending}>
            Delete
          </button>
          {delState.error && <p className="text-sm text-red-600">{delState.error}</p>}
        </form>
      )}
    </div>
  );
}
