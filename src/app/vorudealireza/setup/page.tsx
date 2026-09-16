'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { setupAdmin, confirmTotpEnrollment } from '@/lib/auth/actions';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'enroll'>('form');
  const [setupKey, setSetupKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [secret, setSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await setupAdmin({ setupKey, username, password });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setPendingToken(res.data.pendingToken);
    setSecret(res.data.secret);
    setQrDataUrl(await QRCode.toDataURL(res.data.otpauth, { width: 200, margin: 1 }));
    setStep('enroll');
  }

  async function handleEnrollSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await confirmTotpEnrollment({ pendingToken, code });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push('/vorudealireza');
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 py-12 bg-paper">
      <div className="w-full max-w-md">
        <h1 className="font-display font-extrabold text-3xl tracking-tight">Admin setup</h1>
        <p className="text-muted text-sm mt-2">
          One-time bootstrap — create your admin account and enroll an authenticator app.
        </p>

        {step === 'form' && (
          <form onSubmit={handleSetupSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5" htmlFor="setup-key">
                Setup key
              </label>
              <input id="setup-key" type="password" className="field" value={setupKey} onChange={(e) => setSetupKey(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5" htmlFor="username">
                Username
              </label>
              <input id="username" className="field" value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} maxLength={32} required />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5" htmlFor="password">
                Password (10+ chars)
              </label>
              <input
                id="password"
                type="password"
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={10}
                required
              />
            </div>
            <button className="btn w-full" type="submit" disabled={busy}>
              Create admin &amp; get QR code
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}

        {step === 'enroll' && (
          <div className="mt-10 border-t border-black/10 pt-8">
            <h2 className="font-display font-bold text-xl">Scan with your authenticator</h2>
            <p className="text-muted text-sm mt-1">Google Authenticator, Microsoft Authenticator, 1Password, Authy…</p>
            <div className="mt-5 flex items-start gap-6">
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="TOTP QR code" className="p-3 bg-white rounded-2xl border border-black/10 shrink-0" width={200} height={200} />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-widest text-muted">Manual entry key</p>
                <code className="block mt-1 text-sm break-all font-mono bg-black/5 rounded-lg px-3 py-2">{secret}</code>
              </div>
            </div>
            <form onSubmit={handleEnrollSubmit} className="mt-6 flex gap-3">
              <input
                className="field"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <button className="btn shrink-0" type="submit" disabled={busy}>
                Verify &amp; finish
              </button>
            </form>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
