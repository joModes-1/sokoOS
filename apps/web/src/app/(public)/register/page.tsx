'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button, Input, PasswordInput, Select, Alert } from '@/components/ui';
import { api } from '@/lib/api-client';
import { BUSINESS_TYPES, BUSINESS_SIZES } from '@sokoos/shared';

interface RegisterForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  businessType: string;
  businessSize: string;
  branchName: string;
  branchCode: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'account' | 'business'>('account');
  const [typeQuery, setTypeQuery] = useState('');

  const { register, handleSubmit, getValues, watch, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: {
      fullName: '', email: '', phone: '', password: '', confirmPassword: '',
      businessName: '', businessType: 'RETAIL', businessSize: 'MICRO',
      branchName: 'Main Branch', branchCode: 'MAIN',
    }
  });

  const businessType = watch('businessType');
  const selectedType = BUSINESS_TYPES.find(t => t.code === businessType);
  const typeQuery_ = typeQuery.trim().toLowerCase();
  const filteredTypes = BUSINESS_TYPES.filter(
    t => !typeQuery_ || `${t.label} ${t.description}`.toLowerCase().includes(typeQuery_),
  );

  async function onSubmit(data: RegisterForm) {
    setError('');
    setLoading(true);
    try {
      // Step 1: Register user — the verification code is emailed, never displayed
      await api.post('/auth/register', {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone.replace(/\s/g, ''),
        password: data.password,
      });
      // Step 2: Create business (after login flow, but simplified here)
      router.push(`/verify?email=${encodeURIComponent(data.email)}&next=onboard&biz=${encodeURIComponent(JSON.stringify({
        businessName: data.businessName,
        businessType: data.businessType,
        businessSize: data.businessSize,
        branchName: data.branchName,
        branchCode: data.branchCode,
      }))}`);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function goNext() {
    const v = getValues();
    if (!v.fullName || !v.email || !v.phone || !v.password) {
      setError('Please fill in all fields');
      return;
    }
    if (!/^\+256[0-9]{9}$|^07[0-9]{8}$/.test(v.phone.replace(/\s/g, ''))) {
      setError('Enter a valid Uganda phone number (+256700000000 or 0700000000)');
      return;
    }
    if (v.password.length < 8 || !/[A-Z]/.test(v.password) || !/[0-9]/.test(v.password)) {
      setError('Password must be 8+ characters with at least one uppercase letter and one number');
      return;
    }
    if (v.password !== v.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setStep('business');
  }

  return (
    <div className="w-full">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {(['account', 'business'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s || (step === 'business' && s === 'account') ? 'bg-sunset text-white' : 'bg-sand text-ink/40 border border-border'}`}>
              {i + 1}
            </div>
            <span className={`text-sm font-medium ${step === s ? 'text-ink' : 'text-ink/40'}`}>
              {s === 'account' ? 'Your account' : 'Your business'}
            </span>
            {i < 1 && <span className="text-ink/20">—</span>}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-white p-8 shadow-lg">
        {error && <Alert tone="danger" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 'account' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-ink">Create your account</h2>
              <Input label="Full name" placeholder="Grace Nakato" error={errors.fullName?.message}
                {...register('fullName', { required: 'Required' })} />
              <Input label="Email address" type="email" placeholder="grace@example.com" error={errors.email?.message}
                {...register('email', { required: 'Required' })} />
              <Input label="Phone number" type="tel" placeholder="+256 700 000000" error={errors.phone?.message}
                hint="Uganda number (+256 or 07xx)"
                {...register('phone', { required: 'Required' })} />
              <PasswordInput label="Password" error={errors.password?.message}
                {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
              <PasswordInput label="Confirm password" error={errors.confirmPassword?.message}
                {...register('confirmPassword', { required: 'Required' })} />
              <Button type="button" size="lg" onClick={goNext} className="w-full">Continue →</Button>
            </div>
          )}

          {step === 'business' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-ink">About your business</h2>
              <Input label="Business name" placeholder="Nakato Traders Ltd" error={errors.businessName?.message}
                {...register('businessName', { required: 'Required' })} />

              {/* Business type grid */}
              <div>
                <label htmlFor="business-type-search" className="text-sm font-medium text-ink/80 block mb-2">Business type</label>

                {/* Filter keeps the list usable however many types exist — the grid itself is
                    height-capped and scrolls, so the form never grows without bound. */}
                <div className="relative mb-2">
                  <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <circle cx="9" cy="9" r="6" />
                    <path d="m17 17-4-4" strokeLinecap="round" />
                  </svg>
                  <input
                    id="business-type-search"
                    type="search"
                    value={typeQuery}
                    onChange={e => setTypeQuery(e.target.value)}
                    placeholder="Search business types…"
                    className="form-input w-full pl-9"
                  />
                </div>

                <div className="max-h-[340px] overflow-y-auto scroll-shade rounded-lg pr-1">
                  <div className="grid grid-cols-3 gap-2">
                    {filteredTypes.map(t => (
                      <label
                        key={t.code}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer text-center transition-all ${businessType === t.code ? 'border-sunset bg-sunset/5 text-sunset' : 'border-border hover:border-ochre'}`}
                      >
                        <input type="radio" value={t.code} className="sr-only" {...register('businessType')} />
                        <span className="text-xl">{t.icon}</span>
                        <span className="text-xs font-medium text-ink/70 leading-tight">{t.label}</span>
                      </label>
                    ))}
                  </div>
                  {filteredTypes.length === 0 && (
                    <p className="py-6 text-center text-sm text-ink/45">No business type matches “{typeQuery}”.</p>
                  )}
                </div>

                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <p className="text-xs text-ink/50">
                    {/* Only describe the selection while it is actually on screen — otherwise the caption
                        reads as if it belongs to the filtered results above it. */}
                    {selectedType && filteredTypes.some(t => t.code === selectedType.code)
                      ? selectedType.description
                      : 'Pick the closest match for your business.'}
                  </p>
                  <p aria-live="polite" className="shrink-0 text-xs tabular-nums text-ink/40">
                    {filteredTypes.length === BUSINESS_TYPES.length
                      ? `${BUSINESS_TYPES.length} types`
                      : `${filteredTypes.length} of ${BUSINESS_TYPES.length}`}
                  </p>
                </div>
              </div>

              <Select
                label="Business size"
                options={BUSINESS_SIZES.map(s => ({ value: s.code, label: `${s.label} (${s.description})` }))}
                {...register('businessSize')}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input label="First branch name" placeholder="Main Branch"
                  {...register('branchName', { required: 'Required' })} />
                <Input label="Branch code" placeholder="MAIN"
                  {...register('branchCode', { required: 'Required' })} />
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setStep('account')} className="flex-1">
                  ← Back
                </Button>
                <Button type="submit" loading={loading} className="flex-1">
                  Create business
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>

      <p className="mt-6 text-center text-[15px] text-ink/50">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-sunset hover:text-sunset-hover">Sign in</Link>
      </p>
    </div>
  );
}
