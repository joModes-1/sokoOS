'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/format';
import { PageHeader, Card, Button, Alert, Input } from '@/components/ui';
import { api } from '@/lib/api-client';
import { useBusinessContext } from '@/hooks/use-business';

const DENOMINATIONS = [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50];

export default function DayClosurePage() {
  const { branchId } = useBusinessContext();
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const cashTotal = DENOMINATIONS.reduce((sum, d) => sum + d * (counts[d] ?? 0), 0);

  async function closeDay() {
    if (!branchId) {
      setError('No active branch. Sign in again and select a branch.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/payments/day-closure', {
        branchId,
        businessDate: new Date().toISOString().slice(0, 10),
        denominations: Object.entries(counts)
          .filter(([, count]) => count > 0)
          .map(([denom, count]) => ({
            denominationValue: Number(denom),
            count,
            amount: Number(denom) * count,
          })),
        countedCashMinor: cashTotal,
        ...(reason.trim() ? { discrepancyReason: reason.trim() } : {}),
      });
      setDone(true);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Day closure failed');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto text-center py-16">
        <div className="text-5xl mb-4">🌙</div>
        <h2 className="text-xl font-bold text-ink font-display">Day closed!</h2>
        <p className="text-sm text-ink/50 mt-2">Cash total: {formatMoney(cashTotal)}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <PageHeader title="Day Closure" subtitle="Count cash and close out today's transactions" />

      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}

      <Card>
        <h2 className="font-semibold text-ink mb-4">Cash count</h2>
        <div className="space-y-3">
          {DENOMINATIONS.map((denom) => (
            <div key={denom} className="flex items-center gap-2 sm:gap-4">
              <div className="w-24 sm:w-28 flex-shrink-0">
                <span className="text-sm font-medium text-ink">UGX {denom.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink/40">×</span>
                <input
                  type="number"
                  min={0}
                  value={counts[denom] ?? ''}
                  onChange={(e) =>
                    setCounts({ ...counts, [denom]: parseInt(e.target.value, 10) || 0 })
                  }
                  className="form-input w-20 text-right"
                  placeholder="0"
                />
              </div>
              <div className="flex-1 min-w-0 truncate text-right text-sm text-ink/60">
                = {formatMoney(denom * (counts[denom] ?? 0))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border mt-4 pt-4 flex justify-between items-center">
          <span className="font-semibold text-ink">Total cash</span>
          <span className="text-2xl font-bold text-sunset font-display">{formatMoney(cashTotal)}</span>
        </div>

        <div className="mt-4">
          <Input
            label="Discrepancy reason (required if cash differs)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. 5,000 UGX missing — under investigation"
          />
        </div>

        <Button loading={loading} onClick={closeDay} className="w-full mt-4" size="lg">
          Close day
        </Button>
      </Card>
    </div>
  );
}
