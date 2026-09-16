'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { logout } from '@/lib/auth/actions';

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="btn-ghost text-xs"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await logout();
          router.push('/vorudealireza/login');
          router.refresh();
        })
      }
    >
      Sign out
    </button>
  );
}
