'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Alert } from '@/components/ui';
import { api } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  // Without an SMS/email provider the API hands the 6-digit code back outside production
  // (same pattern as register/verify). We surface it and pass it into the reset screen.
  const [devCode, setDevCode] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post<{ devCode?: string }>('/auth/forgot-password', { email });
      if (r?.devCode) setDevCode(r.devCode);
    } catch {}
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-soil font-display">SokoOS</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
        {!sent ? (
          <>
            <h2 className="text-xl font-semibold text-ink mb-2">Reset password</h2>
            <p className="text-sm text-ink/50 mb-6">
              Enter your email and we&apos;ll send you a 6-digit reset code.
            </p>
            <form onSubmit={onSubmit} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Button type="submit" loading={loading} className="w-full">
                Send reset code
              </Button>
            </form>
          </>
        ) : (
          <>
            <Alert tone="success" title="Check your messages" className="mb-4">
              If an account with <strong>{email}</strong> exists, a 6-digit reset code has been sent to it.
            </Alert>
            {devCode && (
              <Alert tone="info" className="mb-4">
                Dev mode — your code is <strong data-testid="dev-code">{devCode}</strong>
              </Alert>
            )}
            <Button
              className="w-full"
              onClick={() => router.push(`/reset-password?token=${encodeURIComponent(devCode)}`)}
            >
              Enter the code →
            </Button>
          </>
        )}
      </div>

      <p className="text-center text-sm text-ink/50 mt-6">
        <Link href="/login" className="text-sunset font-medium">← Back to login</Link>
      </p>
    </div>
  );
}
