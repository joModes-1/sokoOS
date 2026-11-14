'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, Input, PasswordInput, Alert } from '@/components/ui';
import { api, saveSession, setActiveContext } from '@/lib/api-client';

function AcceptInvitationContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; fullName: string };
        business: { id: string; name: string; type: string };
        branch: { id: string };
      }>('/auth/accept-invitation', { token, fullName, password });
      saveSession(res.accessToken, res.refreshToken);
      setActiveContext(res.business.id, res.branch.id);
      try {
        sessionStorage.setItem('sokoos_industry', res.business.type);
        sessionStorage.setItem('sokoos_business_name', res.business.name);
        sessionStorage.setItem('sokoos_user_name', res.user.fullName);
      } catch {}
      router.push('/dashboard');
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Invalid or expired invitation');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-soil font-display">SokoOS</h1>
        <p className="text-sm text-ink/50 mt-1">You've been invited to join a workspace</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
        <h2 className="text-xl font-semibold text-ink mb-6">Accept invitation</h2>
        {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} required />
          <PasswordInput label="Create a password" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button type="submit" loading={loading} className="w-full">Join workspace</Button>
        </form>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-ink/50">Loading…</div>}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
