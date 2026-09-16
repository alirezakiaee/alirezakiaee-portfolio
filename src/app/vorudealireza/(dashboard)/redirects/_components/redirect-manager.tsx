'use client';

import { useActionState, useState } from 'react';
import { deleteRedirect, saveRedirect, type RedirectFormState } from '../actions';

const initial: RedirectFormState = { error: null };

type Redirect = {
  id: string;
  fromPath: string;
  toPath: string;
  type: 'PERMANENT' | 'TEMPORARY';
  enabled: boolean;
  hits: number;
};

export function RedirectManager({ redirects }: { redirects: Redirect[] }) {
  const [createState, createAction, createPending] = useActionState(saveRedirect, initial);
  const [editState, editAction, editPending] = useActionState(saveRedirect, initial);
  const [delState, delAction, delPending] = useActionState(deleteRedirect, initial);
  const [editing, setEditing] = useState<Redirect | null>(null);

  return (
    <div className="space-y-6">
      <form action={createAction} className="rounded-2xl border border-black/[0.08] bg-white p-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="r-from" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">From</label>
          <input id="r-from" name="fromPath" className="field !w-52 font-mono text-xs" required placeholder="/old-path" maxLength={500} />
        </div>
        <div>
          <label htmlFor="r-to" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">To</label>
          <input id="r-to" name="toPath" className="field !w-52 font-mono text-xs" required placeholder="/new-path or https://…" maxLength={500} />
        </div>
        <div>
          <label htmlFor="r-type" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">Type</label>
          <select id="r-type" name="type" className="field !w-28">
            <option value="PERMANENT">301</option>
            <option value="TEMPORARY">302</option>
          </select>
        </div>
        <input type="hidden" name="enabled" value="on" />
        <button type="submit" className="btn" disabled={createPending}>Add</button>
        {createState.error && <p className="w-full text-sm text-red-600">{createState.error}</p>}
      </form>

      <ul className="space-y-2">
        {redirects.map((r) =>
          editing?.id === r.id ? (
            <li key={r.id} className="rounded-xl border border-accent/30 bg-white px-4 py-3">
              <form action={editAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input name="fromPath" className="field !w-44 font-mono text-xs" defaultValue={r.fromPath} required />
                <input name="toPath" className="field !w-44 font-mono text-xs" defaultValue={r.toPath} required />
                <select name="type" className="field !w-24" defaultValue={r.type}>
                  <option value="PERMANENT">301</option>
                  <option value="TEMPORARY">302</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs pb-2.5 cursor-pointer">
                  <input type="checkbox" name="enabled" defaultChecked={r.enabled} className="accent-accent" /> enabled
                </label>
                <button type="submit" className="btn !py-2" disabled={editPending}>Save</button>
                <button type="button" className="btn-ghost !py-2" onClick={() => setEditing(null)}>Cancel</button>
                {editState.error && <p className="w-full text-sm text-red-600">{editState.error}</p>}
              </form>
            </li>
          ) : (
            <li key={r.id} className="rounded-xl border border-black/[0.08] bg-white px-4 py-3 flex items-center gap-3">
              <code className={`text-xs font-mono ${r.enabled ? '' : 'line-through text-muted'}`}>{r.fromPath}</code>
              <span className="text-muted">→</span>
              <code className="text-xs font-mono truncate max-w-48">{r.toPath}</code>
              <span className="badge badge-draft">{r.type === 'PERMANENT' ? '301' : '302'}</span>
              {r.hits > 0 && <span className="text-xs text-muted">{r.hits} hits</span>}
              <span className="ml-auto flex items-center gap-2">
                <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => setEditing(r)}>Edit</button>
                <form action={delAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50" disabled={delPending}>
                    Delete
                  </button>
                </form>
              </span>
            </li>
          )
        )}
        {redirects.length === 0 && (
          <li className="rounded-2xl border border-dashed border-black/[0.15] px-5 py-10 text-center text-sm text-muted">
            No redirects defined.
          </li>
        )}
      </ul>
      {delState.error && <p className="text-sm text-red-600">{delState.error}</p>}
    </div>
  );
}
