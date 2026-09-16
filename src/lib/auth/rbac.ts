import 'server-only';
import type { Role } from '@prisma/client';

// Deliberately a simple enum + capability map rather than a full
// Role/Permission database schema — see docs/ARCHITECTURE.md
// ("Deliberately not built") for the reasoning. Every Server Action that
// mutates data must call `can()` server-side; hiding a button in the UI is
// never sufficient on its own.
export type Capability =
  | 'content.read'
  | 'content.write'
  | 'content.publish'
  | 'content.delete'
  | 'media.write'
  | 'media.delete'
  | 'settings.write'
  | 'users.manage';

const MATRIX: Record<Role, Capability[]> = {
  ADMIN: [
    'content.read',
    'content.write',
    'content.publish',
    'content.delete',
    'media.write',
    'media.delete',
    'settings.write',
    'users.manage',
  ],
  EDITOR: ['content.read', 'content.write', 'content.publish', 'content.delete', 'media.write', 'media.delete'],
  AUTHOR: ['content.read', 'content.write', 'media.write'],
  VIEWER: ['content.read'],
};

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role]?.includes(capability) ?? false;
}

export function assertCan(role: Role, capability: Capability): void {
  if (!can(role, capability)) {
    throw new Error('FORBIDDEN');
  }
}
