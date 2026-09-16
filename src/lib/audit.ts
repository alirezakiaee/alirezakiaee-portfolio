import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export async function logAudit(params: {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    // Audit must never break the underlying action — report and continue.
    console.error('[audit] write failed:', params.action, e);
  }
}
