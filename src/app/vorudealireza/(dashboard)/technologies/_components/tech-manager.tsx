'use client';

import { useActionState, useState } from 'react';
import { deleteTechnology, saveTechnology, type TechFormState } from '../actions';

const initial: TechFormState = { error: null };

type Tech = { id: string; name: string; slug: string; icon: string | null; usage: number };

export function TechManager({ techs }: { techs: Tech[] }) {
  const [createState, createAction, createPending] = useActionState(saveTechnology, initial);
  const [editing, setEditing] = useState<Tech | null>(null);
  const [editState, editAction, editPending] = useActionState(saveTechnology, initial);
  const [delState, delAction, delPending] = useActionState(deleteTechnology, initial);

  return (
    <div className="space-y-6">
      <form action={createAction} className="rounded-2xl border border-black/[0.08] bg-white p-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="new-name" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">Name</label>
          <input id="new-name" name="name" className="field !w-56" required maxLength={80} placeholder="e.g. TypeScript" />
        </div>
        <div>
          <label htmlFor="new-icon" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">Icon (optional)</label>
          <input id="new-icon" name="icon" className="field !w-56" placeholder="icon name or URL" />
        </div>
        <button type="submit" className="btn" disabled={createPending}>Add</button>
        {createState.error && <p className="w-full text-sm text-red-600">{createState.error}</p>}
      </form>

      <ul className="space-y-2">
        {techs.map((t) =>
          editing?.id === t.id ? (
            <li key={t.id} className="rounded-xl border border-accent/30 bg-white px-4 py-3">
              <form action={editAction} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={t.id} />
                <input name="name" className="field !w-48" defaultValue={t.name} required maxLength={80} />
                <input name="slug" className="field !w-40 font-mono text-xs" defaultValue={t.slug} />
                <input name="icon" className="field !w-48" defaultValue={t.icon ?? ''} placeholder="icon" />
                <button type="submit" className="btn !py-2" disabled={editPending}>Save</button>
                <button type="button" className="btn-ghost !py-2" onClick={() => setEditing(null)}>Cancel</button>
                {editState.error && <p className="w-full text-sm text-red-600">{editState.error}</p>}
              </form>
            </li>
          ) : (
            <li key={t.id} className="rounded-xl border border-black/[0.08] bg-white px-4 py-3 flex items-center gap-3">
              <span className="font-medium text-sm">{t.name}</span>
              <code className="text-xs bg-black/5 rounded px-1.5 py-0.5">{t.slug}</code>
              {t.usage > 0 && <span className="text-xs text-muted">used by {t.usage}</span>}
              <span className="ml-auto flex items-center gap-2">
                <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => setEditing(t)}>
                  Edit
                </button>
                <form action={delAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                    disabled={delPending || t.usage > 0}
                    title={t.usage > 0 ? 'In use — unlink first' : 'Delete'}
                  >
                    Delete
                  </button>
                </form>
              </span>
            </li>
          )
        )}
      </ul>
      {delState.error && <p className="text-sm text-red-600">{delState.error}</p>}
    </div>
  );
}
