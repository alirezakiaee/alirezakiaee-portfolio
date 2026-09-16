'use client';

import { useActionState } from 'react';
import { deleteMedia, updateMedia, type MediaFormState } from '../actions';

const initial: MediaFormState = { error: null };

export function MediaEditForm({ media }: {
  media: { id: string; title: string | null; altText: string | null; caption: string | null };
}) {
  const [state, formAction, pending] = useActionState(updateMedia, initial);
  return (
    <form action={formAction} className="rounded-2xl border border-black/[0.08] bg-white p-5 space-y-4">
      <input type="hidden" name="id" value={media.id} />
      <div>
        <label htmlFor="title" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">Title</label>
        <input id="title" name="title" className="field" defaultValue={media.title ?? ''} maxLength={200} />
      </div>
      <div>
        <label htmlFor="altText" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">Alt text</label>
        <input id="altText" name="altText" className="field" defaultValue={media.altText ?? ''} maxLength={300} />
      </div>
      <div>
        <label htmlFor="caption" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">Caption</label>
        <textarea id="caption" name="caption" rows={2} className="field" defaultValue={media.caption ?? ''} maxLength={500} />
      </div>
      <button type="submit" className="btn" disabled={pending}>Save</button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

export function DeleteMediaButton({ id, name }: { id: string; name: string }) {
  const [state, formAction, pending] = useActionState(deleteMedia, initial);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Delete "${name}"? The file is removed from storage.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-ghost text-red-600 border-red-200 hover:border-red-400 hover:text-red-700" disabled={pending}>
        Delete
      </button>
      {state.error && <p className="text-xs text-red-600 mt-2">{state.error}</p>}
    </form>
  );
}
