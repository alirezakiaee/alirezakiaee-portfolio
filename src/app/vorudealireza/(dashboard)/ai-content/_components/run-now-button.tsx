'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { runAiScheduleNow } from '../actions';

export function RunNowButton({ scheduleId }: { scheduleId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        className="btn"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await runAiScheduleNow(scheduleId);
            setResult(r.ok ? 'Post generated.' : (r.error ?? 'Failed.'));
            router.refresh();
          })
        }
      >
        {pending ? 'Generating…' : 'Run now'}
      </button>
      {result && <span className="text-xs text-muted">{result}</span>}
    </span>
  );
}
