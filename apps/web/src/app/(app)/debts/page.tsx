'use client';

import { useDeferredValue, useState } from 'react';
import {
  useCreateDebt, useDebtSummary, useDebts, useDebtsByPerson, useRecordDebtPayment,
  useWriteOffDebt, type Debt, type PersonDebt,
} from '@/hooks/use-queries';
import { formatDate, formatMoney } from '@/lib/format';
import {
  Badge, Button, Card, EmptyState, Input, Modal, PageHeader, SearchInput, Select, Spinner, Tabs, Textarea,
} from '@/components/ui';
import { ApiError } from '@/lib/api-client';

const METHOD_LABEL: Record<string, string> = { CASH: 'Cash', MTN_MOMO: 'MTN MoMo', AIRTEL_MONEY: 'Airtel Money' };
const METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MTN_MOMO', label: 'MTN MoMo' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
];

const STATUS_BADGE: Record<Debt['status'], { tone: 'warning' | 'info' | 'success' | 'neutral'; label: string }> = {
  OPEN: { tone: 'warning', label: 'Unpaid' },
  PARTIALLY_PAID: { tone: 'info', label: 'Part-paid' },
  SETTLED: { tone: 'success', label: 'Settled' },
  WRITTEN_OFF: { tone: 'neutral', label: 'Written off' },
};

const isOverdue = (d: Debt) =>
  (d.status === 'OPEN' || d.status === 'PARTIALLY_PAID') && !!d.dueAt && new Date(d.dueAt).getTime() < Date.now();

/** Up to two leading initials for a person's avatar chip ("Mama Aisha" → "MA"). */
const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?';

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : err instanceof Error ? err.message : fallback;

/** A summary tile. Kept local to this screen; the dashboard uses its own Kpi. */
function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'danger' | 'success' }) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`font-display text-2xl font-bold tabular-nums ${
        tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success-dark' : 'text-ink'
      }`}>{value}</p>
      {sub && <p className="text-xs text-ink/45">{sub}</p>}
    </Card>
  );
}

export default function DebtsPage() {
  const [tab, setTab] = useState<'debts' | 'people'>('debts');
  const [status, setStatus] = useState<'OUTSTANDING' | 'SETTLED' | 'ALL'>('OUTSTANDING');
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const [personFilter, setPersonFilter] = useState<{ id: string; name: string } | null>(null);

  const { data: summary } = useDebtSummary();
  const debts = useDebts({
    q: q || undefined,
    customerId: personFilter?.id,
    status: status === 'OUTSTANDING' ? undefined : status,
  });
  const people = useDebtsByPerson(tab === 'people' ? q || undefined : undefined);

  const [newOpen, setNewOpen] = useState(false);
  const [payFor, setPayFor] = useState<Debt | null>(null);

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Debts"
        subtitle="Goods customers took on credit, and the payments they make until it is cleared"
        actions={<Button onClick={() => setNewOpen(true)}>Record a debt</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Owed to you"
          value={formatMoney(summary?.outstandingMinor ?? 0)}
          sub={`${summary?.openCount ?? 0} unpaid debt${(summary?.openCount ?? 0) === 1 ? '' : 's'}`}
        />
        <Stat label="People owing" value={String(summary?.debtorCount ?? 0)} sub="Customers with a balance" />
        <Stat
          label="Overdue"
          value={String(summary?.overdueCount ?? 0)}
          sub="Past the agreed date"
          tone={(summary?.overdueCount ?? 0) > 0 ? 'danger' : undefined}
        />
        <Stat
          label="Collected this month"
          value={formatMoney(summary?.collectedThisMonthMinor ?? 0)}
          sub="Payments received"
          tone="success"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { key: 'debts', label: 'Debts', count: summary?.openCount },
            { key: 'people', label: 'By person', count: summary?.debtorCount },
          ]}
          active={tab}
          onChange={(t) => setTab(t as 'debts' | 'people')}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone or item" className="w-full sm:w-72" />
      </div>

      {tab === 'debts' && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {([
              ['OUTSTANDING', 'Still owing'],
              ['SETTLED', 'Settled'],
              ['ALL', 'All'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatus(key)}
                aria-pressed={status === key}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  status === key ? 'bg-sunset text-white' : 'bg-sand text-ink/60 hover:bg-peach hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
            {personFilter && (
              <button
                onClick={() => setPersonFilter(null)}
                className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink/70 hover:bg-sand"
              >
                Only {personFilter.name}
                <span aria-hidden className="text-ink/40">✕</span>
              </button>
            )}
          </div>

          {debts.isLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : debts.isError ? (
            <Card><EmptyState icon="⚠️" title="Couldn't load debts" description={errorMessage(debts.error, 'Try again in a moment.')} /></Card>
          ) : !debts.data?.items.length ? (
            <Card>
              <EmptyState
                icon="📒"
                title={status === 'OUTSTANDING' ? 'Nobody owes you anything' : 'No debts here'}
                description={status === 'OUTSTANDING' ? 'When a customer takes an item and pays later, record it here and track each payment.' : undefined}
                action={<Button variant="secondary" size="sm" onClick={() => setNewOpen(true)}>Record a debt</Button>}
              />
            </Card>
          ) : (
            <ul className="space-y-3">
              {debts.data.items.map((d) => (
                <DebtRow key={d.id} debt={d} onPay={() => setPayFor(d)} />
              ))}
            </ul>
          )}

          {debts.data && debts.data.total > debts.data.items.length && (
            <p className="mt-4 text-center text-xs text-ink/45">
              Showing {debts.data.items.length} of {debts.data.total}. Refine the search to narrow it down.
            </p>
          )}
        </>
      )}

      {tab === 'people' && (
        <Card padding={false}>
          {people.isLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : !people.data?.length ? (
            <EmptyState icon="👥" title="Nobody owes you anything" description="People appear here once they take something on credit." />
          ) : (
            <ul className="divide-y divide-border">
              {people.data.map((p) => (
                <PersonRow
                  key={p.key}
                  person={p}
                  onOpen={() => {
                    if (p.customerId) {
                      setPersonFilter({ id: p.customerId, name: p.name });
                      setStatus('ALL');
                      setTab('debts');
                    } else {
                      setSearch(p.phone ?? p.name);
                      setStatus('ALL');
                      setTab('debts');
                    }
                  }}
                />
              ))}
            </ul>
          )}
        </Card>
      )}

      <NewDebtModal open={newOpen} onClose={() => setNewOpen(false)} />
      <PaymentModal debt={payFor} onClose={() => setPayFor(null)} />
    </div>
  );
}

// ── One debt ──────────────────────────────────────────────────────────────────
function DebtRow({ debt, onPay }: { debt: Debt; onPay: () => void }) {
  const [open, setOpen] = useState(false);
  const badge = STATUS_BADGE[debt.status];
  const overdue = isOverdue(debt);
  const paidPct = debt.amountMinor > 0 ? Math.min((debt.paidMinor / debt.amountMinor) * 100, 100) : 0;
  const active = debt.status === 'OPEN' || debt.status === 'PARTIALLY_PAID';

  return (
    <li>
      <Card padding={false} className={overdue ? 'border-danger/40' : ''}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            aria-hidden
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              overdue ? 'bg-danger/10 text-danger' : 'bg-sunset/10 text-sunset'
            }`}
          >
            {initials(debt.customerName)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-ink">{debt.customerName}</p>
              {debt.customerPhone && <span className="text-xs text-ink/45">{debt.customerPhone}</span>}
              <Badge tone={badge.tone}>{badge.label}</Badge>
              {overdue && <Badge tone="danger">Overdue</Badge>}
            </div>
            <p className="mt-0.5 truncate text-sm text-ink/60">{debt.itemSummary ?? 'Goods on credit'}</p>
            <p className="mt-1 text-xs text-ink/40">
              Taken {formatDate(debt.createdAt, { relative: true })}
              {debt.dueAt && <> · due {formatDate(debt.dueAt)}</>}
              {debt.payments.length > 0 && <> · {debt.payments.length} payment{debt.payments.length > 1 ? 's' : ''}</>}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold tabular-nums text-ink">{formatMoney(debt.balanceMinor)}</p>
          <p className="text-xs text-ink/45">
            {debt.paidMinor > 0 ? `${formatMoney(debt.paidMinor)} paid of ${formatMoney(debt.amountMinor)}` : 'Nothing paid yet'}
          </p>
        </div>
      </div>

      <div className="px-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-sand-dark" role="progressbar" aria-valuenow={Math.round(paidPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Amount paid">
          <div className="h-full rounded-full bg-sunset transition-[width]" style={{ width: `${paidPct}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-xs font-medium text-ink/55 hover:text-ink"
        >
          {open ? 'Hide payments' : `Payment history (${debt.payments.length})`}
        </button>
        {active && (
          <div className="flex items-center gap-2">
            <WriteOffButton debt={debt} />
            <Button size="sm" onClick={onPay}>Record payment</Button>
          </div>
        )}
      </div>

      {open && (
        <div className="border-t border-border bg-sand/40 p-4">
          {debt.payments.length === 0 ? (
            <p className="text-sm text-ink/45">No payments yet. Every part-payment will be listed here.</p>
          ) : (
            <ul className="space-y-2">
              {debt.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-ink">{formatMoney(p.amountMinor)} · {METHOD_LABEL[p.method] ?? p.method}</p>
                    <p className="text-xs text-ink/45">
                      {formatDate(p.paidAt)}
                      {p.note && <> · {p.note}</>}
                    </p>
                  </div>
                  <Badge tone="neutral">Paid</Badge>
                </li>
              ))}
            </ul>
          )}
          {debt.note && <p className="mt-3 border-t border-border pt-3 text-xs text-ink/55">Note: {debt.note}</p>}
        </div>
      )}
      </Card>
    </li>
  );
}

function WriteOffButton({ debt }: { debt: Debt }) {
  const writeOff = useWriteOffDebt();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>Write off</Button>
    );
  }
  return (
    <Modal
      open
      onClose={() => setConfirming(false)}
      title={`Write off ${formatMoney(debt.balanceMinor)}?`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
          <Button
            variant="danger"
            size="sm"
            loading={writeOff.isPending}
            onClick={() => writeOff.mutate({ debtId: debt.id, reason: reason || undefined }, { onSuccess: () => setConfirming(false) })}
          >
            Write off
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink/70">
        This marks {debt.customerName}&apos;s balance as a loss. The money stays recorded as unpaid — it only
        stops counting against what you are owed.
      </p>
      <Input
        className="mt-3"
        label="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Moved away, unreachable…"
      />
      {writeOff.isError && <p className="mt-2 text-xs text-danger">{errorMessage(writeOff.error, 'Could not write off')}</p>}
    </Modal>
  );
}

// ── One person ────────────────────────────────────────────────────────────────
function PersonRow({ person, onOpen }: { person: PersonDebt; onOpen: () => void }) {
  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sand/50">
        <span
          aria-hidden
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sunset/10 text-xs font-bold text-sunset"
        >
          {initials(person.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{person.name}</p>
          <p className="truncate text-xs text-ink/45">
            {person.phone ? `${person.phone} · ` : ''}
            {person.debtCount} debt{person.debtCount > 1 ? 's' : ''}
            {person.items[0] && <> · {person.items[0]}</>}
            {person.items.length > 1 && <> +{person.items.length - 1} more</>}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-semibold tabular-nums text-ink">{formatMoney(person.outstandingMinor)}</p>
          <p className="text-xs text-ink/45">
            of {formatMoney(person.totalMinor)}
            {person.lastPaymentAt && <> · last paid {formatDate(person.lastPaymentAt, { relative: true })}</>}
          </p>
        </div>
      </button>
    </li>
  );
}

// ── Record a new debt ─────────────────────────────────────────────────────────
function NewDebtModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateDebt();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemSummary, setItemSummary] = useState('');
  const [amount, setAmount] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [note, setNote] = useState('');

  const amountMinor = Math.round(Number(amount));
  const valid = customerName.trim().length > 0 && Number.isFinite(amountMinor) && amountMinor > 0;

  function reset() {
    setCustomerName(''); setCustomerPhone(''); setItemSummary(''); setAmount(''); setDueAt(''); setNote('');
  }

  function submit() {
    if (!valid) return;
    create.mutate(
      {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        itemSummary: itemSummary.trim() || undefined,
        amountMinor,
        dueAt: dueAt || undefined,
        note: note.trim() || undefined,
      },
      { onSuccess: () => { reset(); onClose(); } },
    );
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); create.reset(); onClose(); }}
      title="Record a debt"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => { reset(); create.reset(); onClose(); }}>Cancel</Button>
          <Button size="sm" loading={create.isPending} disabled={!valid} onClick={submit}>
            Save debt
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label="Customer name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g. Mama Aisha"
          autoFocus
        />
        <Input
          label="Phone (optional)"
          hint="Adding a phone links this debt to the same person next time."
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="+256 7…"
        />
        <Input
          label="What did they take?"
          value={itemSummary}
          onChange={(e) => setItemSummary(e.target.value)}
          placeholder="e.g. 2 kg sugar, 1 bar soap"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount owed (UGX)"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
          <Input
            label="Pay by (optional)"
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>
        <Textarea
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything you want to remember about this one"
        />
        {create.isError && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {errorMessage(create.error, 'Could not save the debt')}
          </p>
        )}
      </div>
    </Modal>
  );
}

// ── Record a payment ──────────────────────────────────────────────────────────
function PaymentModal({ debt, onClose }: { debt: Debt | null; onClose: () => void }) {
  const pay = useRecordDebtPayment();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'MTN_MOMO' | 'AIRTEL_MONEY'>('CASH');
  const [note, setNote] = useState('');

  // The modal is unmounted between debts, so `key` on the parent is unnecessary: `debt` changing
  // from null resets these on the next open only if we clear them when closing.
  const amountMinor = Math.round(Number(amount));
  const remaining = debt?.balanceMinor ?? 0;
  const valid = !!debt && Number.isFinite(amountMinor) && amountMinor > 0 && amountMinor <= remaining;

  function close() {
    setAmount(''); setNote(''); setMethod('CASH'); pay.reset(); onClose();
  }

  if (!debt) return null;

  return (
    <Modal
      open
      onClose={close}
      title={`Payment from ${debt.customerName}`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={close}>Cancel</Button>
          <Button
            size="sm"
            loading={pay.isPending}
            disabled={!valid}
            onClick={() =>
              pay.mutate(
                { debtId: debt.id, amountMinor, method, note: note.trim() || undefined },
                { onSuccess: close },
              )
            }
          >
            Save payment
          </Button>
        </>
      }
    >
      <div className="mb-3 rounded-lg bg-sand px-3 py-2.5 text-sm">
        <p className="text-ink/60">Outstanding on this debt</p>
        <p className="font-display text-xl font-bold tabular-nums text-ink">{formatMoney(remaining)}</p>
        <p className="text-xs text-ink/45">
          {debt.itemSummary ?? 'Goods on credit'} · taken {formatDate(debt.createdAt)}
        </p>
      </div>
      <div className="space-y-3">
        <Input
          label="Amount received (UGX)"
          type="number"
          inputMode="numeric"
          min={1}
          max={remaining}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          autoFocus
          error={amountMinor > remaining ? `Most they owe on this debt is ${formatMoney(remaining)}` : undefined}
          rightAddon={
            <button
              type="button"
              onClick={() => setAmount(String(remaining))}
              className="pointer-events-auto text-xs font-semibold text-sunset hover:underline"
            >
              All
            </button>
          }
        />
        <Select
          label="Paid by"
          options={METHOD_OPTIONS}
          value={method}
          onChange={(e) => setMethod(e.target.value as typeof method)}
        />
        <Input
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. balance next Friday"
        />
        {pay.isError && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {errorMessage(pay.error, 'Could not record the payment')}
          </p>
        )}
      </div>
    </Modal>
  );
}