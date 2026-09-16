'use client';

import { useActionState } from 'react';
import { deleteProject, type ProjectFormState } from '../actions';

const initial: ProjectFormState = { error: null };

export function DeleteProjectButton({ id, title }: { id: string; title: string }) {
  const [state, formAction, pending] = useActionState(deleteProject, initial);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Move "${title}" to trash?`)) e.preventDefault();
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
