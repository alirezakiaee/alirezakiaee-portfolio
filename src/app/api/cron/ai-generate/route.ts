import { NextResponse } from 'next/server';
import { runDueSchedules } from '@/lib/ai/runner';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Vercel Cron calls this on the schedule configured in vercel.json.
// It can also be invoked manually / from an external scheduler with:
//   Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail closed in production — an open endpoint would let anyone burn
    // API credits. Vercel Cron sends CRON_SECRET automatically once set.
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }
  } else if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runDueSchedules('cron');
  return NextResponse.json(result);
}
