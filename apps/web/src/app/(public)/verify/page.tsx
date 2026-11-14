'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, Input, Alert } from '@/components/ui';
import { api } from '@/lib/api-client';

function VerifyContent() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get('email') ?? '';
  const [devCode, setDevCode] = useState('');

  useEffect(() => {
    try {
      const biz = params.get('biz');
      if (biz) sessionStorage.setItem('sokoos_pending_biz', biz);
      const dc = sessionStorage.getItem('sokoos_dev_code');
      if (dc) setDevCode(dc);
    } catch {}
  }, [params]);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);

  async function onVerify() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-email', { email, code: token });
      router.push(`/login?verified=1&email=${encodeURIComponent(email)}`);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    try {
      const r = await api.post<{ devCode?: string }>('/auth/resend-verification', { email });
      if (r?.devCode) setDevCode(r.devCode);
      setResent(true);
    } catch {}
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">📧</div>
        <h1 className="text-2xl font-bold text-ink font-display">Verify your email</h1>
        <p className="text-sm text-ink/50 mt-2">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        {resent && <Alert tone="success">Code resent.</Alert>}

        {devCode && (
          <Alert tone="info">Dev mode — your code is <strong data-testid="dev-code">{devCode}</strong></Alert>
        )}

        <Input
          label="Verification code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="000000"
        />

        <Button onClick={onVerify} loading={loading} className="w-full">
          Verify email
        </Button>

        <p className="text-center text-sm text-ink/50">
          Didn't receive it?{' '}
          <button onClick={onResend} className="text-sunset font-medium hover:text-sunset-hover">
            Resend code
          </button>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-ink/50">Loading…</div>}>
      <VerifyContent />
    </Suspense>
  );
}
