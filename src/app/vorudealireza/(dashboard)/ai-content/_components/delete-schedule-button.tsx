'use client';

import { useActionState } from 'react';
import { deleteAiSchedule, type AiScheduleFormState } from '../actions';

const initial: AiScheduleFormState = { error: null };

export function DeleteScheduleButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(deleteAiSchedule, initial);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm('Delete this schedule? Generated posts are kept.')) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-sm text-red-600 hover:underline" disabled={pending}>
        Delete
      </button>
      {state.error && <p className="text-xs text-red-600 mt-1">{state.error}</p>}
    </form>
  );
}
