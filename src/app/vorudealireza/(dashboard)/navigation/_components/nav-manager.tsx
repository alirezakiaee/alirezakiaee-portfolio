'use client';

import { useActionState, useState } from 'react';
import { deleteNavItem, saveNavItem, type NavFormState } from '../actions';

const initial: NavFormState = { error: null };

type Child = { id: string; label: string; url: string; sortOrder: number; openInNewTab: boolean; enabled: boolean };
type Item = Child & { children: Child[] };
type EditTarget = { item: Child; parentId: string | null };

export function NavManager({ location, items }: { location: string; items: Item[] }) {
  const [createState, createAction, createPending] = useActionState(saveNavItem, initial);
  const [editState, editAction, editPending] = useActionState(saveNavItem, initial);
  const [delState, delAction, delPending] = useActionState(deleteNavItem, initial);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [parentId, setParentId] = useState('');

  const parentOptions = items.map((i) => ({ id: i.id, label: i.label }));

  function EditForm({ item, pid }: { item: Child; pid: string | null }) {
    return (
      <form action={editAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="location" value={location} />
        <input type="hidden" name="parentId" value={pid ?? ''} />
        <input name="label" className="field !w-36" defaultValue={item.label} required maxLength={80} />
        <input name="url" className="field !w-48 font-mono text-xs" defaultValue={item.url} required maxLength={500} />
        <input name="sortOrder" type="number" className="field !w-20" defaultValue={item.sortOrder} />
        <label className="flex items-center gap-1.5 text-xs pb-2.5 cursor-pointer">
          <input type="checkbox" name="openInNewTab" defaultChecked={item.openInNewTab} className="accent-accent" /> new tab
        </label>
        <label className="flex items-center gap-1.5 text-xs pb-2.5 cursor-pointer">
          <input type="checkbox" name="enabled" defaultChecked={item.enabled} className="accent-accent" /> enabled
        </label>
        <button type="submit" className="btn !py-2" disabled={editPending}>Save</button>
        <button type="button" className="btn-ghost !py-2" onClick={() => setEditing(null)}>Cancel</button>
        {editState.error && <p className="w-full text-sm text-red-600">{editState.error}</p>}
      </form>
    );
  }

  function Row({ item, pid, indent }: { item: Child; pid: string | null; indent?: boolean }) {
    return editing?.item.id === item.id ? (
      <li className={`rounded-xl border border-accent/30 bg-white px-4 py-3 ${indent ? 'ml-8' : ''}`}>
        <EditForm item={item} pid={pid} />
      </li>
    ) : (
      <li className={`rounded-xl border border-black/[0.08] bg-white px-4 py-3 flex items-center gap-3 ${indent ? 'ml-8' : ''}`}>
        {indent && <span className="text-muted text-xs">↳</span>}
        <span className={`font-medium text-sm ${item.enabled ? '' : 'line-through text-muted'}`}>{item.label}</span>
        <code className="text-xs bg-black/5 rounded px-1.5 py-0.5 truncate max-w-48">{item.url}</code>
        {item.openInNewTab && <span className="text-[10px] uppercase tracking-wider text-muted">new tab</span>}
        <span className="text-xs text-muted">#{item.sortOrder}</span>
        <span className="ml-auto flex items-center gap-2">
          <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => setEditing({ item, parentId: pid })}>
            Edit
          </button>
          <form action={delAction}>
            <input type="hidden" name="id" value={item.id} />
            <button
              type="submit"
              className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
              disabled={delPending}
              onClick={(e) => {
                if (!confirm('Delete this item (and any children)?')) e.preventDefault();
              }}
            >
              Delete
            </button>
          </form>
        </span>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <form action={createAction} className="rounded-2xl border border-black/[0.08] bg-white p-5 flex flex-wrap items-end gap-3">
        <input type="hidden" name="location" value={location} />
        <div>
          <label htmlFor="nav-label" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">Label</label>
          <input id="nav-label" name="label" className="field !w-40" required maxLength={80} placeholder="Projects" />
        </div>
        <div>
          <label htmlFor="nav-url" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">URL</label>
          <input id="nav-url" name="url" className="field !w-56 font-mono text-xs" required maxLength={500} placeholder="/projects or https://…" />
        </div>
        <div>
          <label htmlFor="nav-parent" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">Parent</label>
          <select id="nav-parent" name="parentId" className="field !w-40" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">— top level —</option>
            {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="nav-order" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">Order</label>
          <input id="nav-order" name="sortOrder" type="number" className="field !w-20" defaultValue={items.length} />
        </div>
        <label className="flex items-center gap-1.5 text-sm pb-2.5 cursor-pointer">
          <input type="checkbox" name="openInNewTab" className="accent-accent" /> new tab
        </label>
        <input type="hidden" name="enabled" value="on" />
        <button type="submit" className="btn" disabled={createPending}>Add item</button>
        {createState.error && <p className="w-full text-sm text-red-600">{createState.error}</p>}
      </form>

      <ul className="space-y-2">
        {items.flatMap((i) => [
          <Row key={i.id} item={i} pid={null} />,
          ...i.children.map((c) => <Row key={c.id} item={c} pid={i.id} indent />),
        ])}
        {items.length === 0 && (
          <li className="rounded-2xl border border-dashed border-black/[0.15] px-5 py-10 text-center text-sm text-muted">
            No items in this menu yet.
          </li>
        )}
      </ul>
      {delState.error && <p className="text-sm text-red-600">{delState.error}</p>}
    </div>
  );
}
