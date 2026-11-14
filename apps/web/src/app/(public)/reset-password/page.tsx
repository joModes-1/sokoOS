'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, Input, PasswordInput, Alert } from '@/components/ui';
import { api } from '@/lib/api-client';

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  // The code arrives in the URL when coming from the forgot-password screen; otherwise the user
  // types the 6-digit code they received (e.g. from SMS) here.
  const [token, setToken] = useState(params.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Minimum 8 characters'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      router.push('/login?reset=1');
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Reset failed — link may have expired');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-soil font-display">SokoOS</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
        <h2 className="text-xl font-semibold text-ink mb-6">Set new password</h2>
        {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Reset code"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="6-digit code"
            inputMode="numeric"
            maxLength={6}
            required
          />
          <PasswordInput label="New password" value={password} onChange={e => setPassword(e.target.value)} required />
          <PasswordInput label="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          <Button type="submit" loading={loading} className="w-full">Set password</Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-ink/50">Loading…</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
