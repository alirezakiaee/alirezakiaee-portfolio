'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, verifyLoginTotp } from '@/lib/auth/actions';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'password' | 'totp'>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await login({ username, password });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setPendingToken(res.data.pendingToken);
    setStep('totp');
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await verifyLoginTotp({ pendingToken, code });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push('/vorudealireza');
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-paper">
      <div className="w-full max-w-sm">
        <a href="/" className="font-display font-extrabold text-lg">
          AK<span className="text-accent">.</span>
        </a>
        <h1 className="font-display font-extrabold text-3xl tracking-tight mt-6">Admin sign in</h1>

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className="field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button className="btn w-full" type="submit" disabled={busy}>
              Continue
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}

        {step === 'totp' && (
          <form onSubmit={handleTotpSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5" htmlFor="code">
                Authenticator code
              </label>
              <input
                id="code"
                className="field"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                required
                autoFocus
              />
            </div>
            <button className="btn w-full" type="submit" disabled={busy}>
              Verify &amp; sign in
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
