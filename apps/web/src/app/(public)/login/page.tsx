'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button, Input, PasswordInput, Alert } from '@/components/ui';
import { api, saveSession, setActiveContext } from '@/lib/api-client';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  requiresMfa?: boolean;
  challengeToken?: string;
  user: { id: string; fullName: string; email: string };
  business?: { id: string; name: string; type: string };
  branch?: { id: string };
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    defaultValues: { email: '', password: '', rememberMe: false }
  });

  async function onSubmit(data: LoginForm) {
    setError('');
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>('/auth/login', {
        email: data.email,
        password: data.password,
      });
      if (res.requiresMfa && res.challengeToken) {
        setMfaToken(res.challengeToken);
        setMfaStep(true);
        return;
      }
      await finalizeLogin(res, data.rememberMe);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function onMfaSubmit() {
    setError('');
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>('/auth/login/mfa', {
        challengeToken: mfaToken,
        code: mfaCode,
      });
      await finalizeLogin(res, false);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function finalizeLogin(res: LoginResponse, rememberMe: boolean) {
    saveSession(res.accessToken, res.refreshToken, rememberMe);
    // First login after registration: create the business captured on the sign-up form
    if (!res.business) {
      let pending: string | null = null;
      try { pending = sessionStorage.getItem('sokoos_pending_biz'); } catch {}
      if (pending) {
        const created = await api.post<{ business: { id: string; legalName: string; businessType: string }; branch: { id: string } }>(
          '/businesses', JSON.parse(pending),
        );
        res = {
          ...res,
          business: { id: created.business.id, name: created.business.legalName, type: created.business.businessType },
          branch: { id: created.branch.id },
        };
        try { sessionStorage.removeItem('sokoos_pending_biz'); sessionStorage.removeItem('sokoos_dev_code'); } catch {}
      }
    }
    if (res.business) {
      setActiveContext(res.business.id, res.branch?.id);
      try {
        sessionStorage.setItem('sokoos_industry', res.business.type);
        sessionStorage.setItem('sokoos_business_name', res.business.name);
        sessionStorage.setItem('sokoos_user_name', res.user.fullName);
      } catch {}
    }
    router.push('/dashboard');
  }

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-border bg-white p-8 shadow-lg">
        <h2 className="mb-1 font-display text-2xl font-bold text-ink">
          {mfaStep ? 'Two-factor verification' : 'Sign in to your account'}
        </h2>
        <p className="mb-6 text-sm text-ink/50">
          {mfaStep ? 'Enter the code from your authenticator app.' : 'Welcome back. Enter your details to continue.'}
        </p>

        {error && <Alert tone="danger" className="mb-4">{error}</Alert>}

        {!mfaStep ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email', { required: 'Email is required' })}
            />
            <PasswordInput
              label="Password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password', { required: 'Password is required' })}
            />
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-[15px] text-ink/70">
                <input type="checkbox" className="h-4 w-4 rounded border-border" {...register('rememberMe')} />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-[15px] font-medium text-sunset hover:text-sunset-hover">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" size="lg" loading={loading} className="w-full">Sign in</Button>
          </form>
        ) : (
          <div className="space-y-4">
            <Input
              label="Authentication code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value)}
              placeholder="000000"
            />
            <Button onClick={onMfaSubmit} size="lg" loading={loading} className="w-full">Verify</Button>
            <button
              type="button"
              onClick={() => setMfaStep(false)}
              className="w-full text-[15px] text-ink/50 hover:text-ink"
            >
              ← Back to login
            </button>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[15px] text-ink/50">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-sunset hover:text-sunset-hover">
          Create one
        </Link>
      </p>
    </div>
  );
}
