'use client';

import { useActionState, useRef, useState } from 'react';
import { uploadMedia, type MediaFormState } from '../actions';

const initial: MediaFormState = { error: null };

export function MediaUploadForm() {
  const [state, formAction, pending] = useActionState(uploadMedia, initial);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} className="rounded-2xl border border-black/[0.08] bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <label htmlFor="file" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
            File (JPEG, PNG, WebP, GIF, AVIF, PDF — max 10 MB)
          </label>
          <input
            ref={fileRef}
            id="file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf"
            className="text-sm"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
            required
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="altText" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
            Alt text
          </label>
          <input id="altText" name="altText" className="field !w-64" placeholder="Describe the image" />
        </div>
        <button type="submit" className="btn" disabled={pending || !fileName}>
          {pending ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
