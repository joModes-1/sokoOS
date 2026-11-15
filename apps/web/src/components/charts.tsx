'use client';

/**
 * Dashboard chart primitives - plain SVG/HTML, no chart library.
 *
 * Colour roles (validated with the dataviz palette checker, all-pairs, light surface):
 *   REVENUE  the theme's brand accent (--brand)  — money coming in
 *   PROFIT   #0e8f82  what is left after cost    — fixed data-series colour
 *   MIX      #6250d6  breakdowns                 — fixed data-series colour
 * Text always wears ink tokens; the coloured mark beside it carries identity.
 *
 * SVG presentation attributes cannot hold `var()`, so the theme colours are resolved to concrete
 * strings once per mount (and again whenever `data-brand` flips) — see `useChartColors`.
 */

import { useEffect, useRef, useState } from 'react';
import { formatMoney } from '@/lib/format';

export const CHART = {
  revenue: '#c2410c',
  profit: '#0e8f82',
  mix: '#6250d6',
  grid: 'rgba(28,15,5,0.07)',
  axis: 'rgba(28,15,5,0.45)',
  surface: '#ffffff',
} as const;

type ChartColors = Record<keyof typeof CHART, string>;

/** Defaults (= :root in globals.css), used until/if the live theme vars resolve. */
const FALLBACK: ChartColors = CHART;

/** Resolve the chart palette from the live theme; re-resolves when Settings → Appearance flips it. */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(FALLBACK);
  useEffect(() => {
    const root = document.documentElement;
    const resolve = () => {
      const s = getComputedStyle(root);
      const v = (name: string) => s.getPropertyValue(name).trim();
      const brand = v('--brand-rgb');
      const text = v('--text-rgb');
      const surface = v('--surface');
      setColors({
        revenue: brand ? `rgb(${brand})` : FALLBACK.revenue,
        profit: FALLBACK.profit,
        mix: FALLBACK.mix,
        grid: text ? `rgb(${text} / 0.07)` : FALLBACK.grid,
        axis: text ? `rgb(${text} / 0.45)` : FALLBACK.axis,
        surface: surface || FALLBACK.surface,
      });
    };
    resolve();
    const mo = new MutationObserver(resolve);
    mo.observe(root, { attributes: true, attributeFilter: ['data-brand'] });
    return () => mo.disconnect();
  }, []);
  return colors;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e?.contentRect.width ?? 0)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** A tidy axis maximum and tick list for a value range starting at zero. */
function niceScale(max: number, ticks = 4) {
  if (max <= 0) return { max: 1, ticks: [0, 1] };
  const rough = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= rough) ?? mag * 10;
  const top = Math.ceil(max / step) * step;
  return { max: top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}

const short = (n: number) => formatMoney(n, 'UGX', { short: true }).replace('UGX ', '');
const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' });
const weekday = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' });

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: React.ReactNode }) {
  const flip = x > width * 0.62;
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left: flip ? undefined : x + 14, right: flip ? width - x + 14 : undefined, top: Math.max(0, y - 10), minWidth: 150 }}
      role="status"
    >
      {children}
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />;
}

// ── Sparkline ────────────────────────────────────────────────────────────────
export function Sparkline({ values, color, height = 36 }: { values: number[]; color?: string; height?: number }) {
  const C = useChartColors();
  const stroke = color ?? C.revenue;
  const [ref, width] = useWidth<HTMLDivElement>();
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pad = 4;
  const pts = values.map((v, i) => [
    pad + (i / Math.max(values.length - 1, 1)) * Math.max(width - pad * 2, 1),
    height - pad - ((v - min) / Math.max(max - min, 1)) * (height - pad * 2),
  ]);
  const last = pts[pts.length - 1];
  return (
    <div ref={ref} className="w-full" aria-hidden>
      {width > 0 && pts.length > 1 && (
        <svg width={width} height={height}>
          <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {last && <circle cx={last[0]} cy={last[1]} r={3.5} fill={stroke} stroke={C.surface} strokeWidth={2} />}
        </svg>
      )}
    </div>
  );
}

// ── Trend chart (revenue + profit by day) ────────────────────────────────────
export interface DayPoint { date: string; revenue: number; profit: number; transactions: number }

export function TrendChart({ data, height = 280 }: { data: DayPoint[]; height?: number }) {
  const C = useChartColors();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  const m = { top: 12, right: 18, bottom: 26, left: 44 };
  const w = Math.max(width - m.left - m.right, 10);
  const h = height - m.top - m.bottom;
  const { max, ticks } = niceScale(Math.max(...data.map(d => d.revenue), 1));
  const x = (i: number) => m.left + (i / Math.max(data.length - 1, 1)) * w;
  const y = (v: number) => m.top + h - (v / max) * h;
  const line = (k: 'revenue' | 'profit') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(' ');
  const area = `${line('revenue')} L${x(data.length - 1)},${m.top + h} L${x(0)},${m.top + h} Z`;
  const labelEvery = data.length > 20 ? 5 : data.length > 10 ? 2 : 1;
  const hd = hover != null ? data[hover] : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink/70">
        <span className="inline-flex items-center gap-1.5"><Swatch color={C.revenue} /> Revenue</span>
        <span className="inline-flex items-center gap-1.5"><Swatch color={C.profit} /> Gross profit</span>
        <button
          type="button"
          onClick={() => setTable(t => !t)}
          className="ml-auto rounded-md border border-border px-2 py-1 text-[11px] font-medium text-ink/60 hover:bg-sand"
        >
          {table ? 'Show chart' : 'View as table'}
        </button>
      </div>

      {table ? (
        <div className="max-h-[280px] overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-sand text-left text-ink/60">
              <tr><th className="px-3 py-2">Day</th><th className="px-3 py-2 text-right">Revenue</th><th className="px-3 py-2 text-right">Profit</th><th className="px-3 py-2 text-right">Sales</th></tr>
            </thead>
            <tbody>
              {[...data].reverse().map(d => (
                <tr key={d.date} className="border-t border-border">
                  <td className="px-3 py-1.5">{weekday(d.date)}</td>
                  <td className="px-3 py-1.5 text-right">{formatMoney(d.revenue)}</td>
                  <td className="px-3 py-1.5 text-right">{formatMoney(d.profit)}</td>
                  <td className="px-3 py-1.5 text-right">{d.transactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative w-full" style={{ height }}>
          {width > 0 && (
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={`Revenue and gross profit per day for the last ${data.length} days`}
              onPointerLeave={() => setHover(null)}
              onPointerMove={e => {
                const r = e.currentTarget.getBoundingClientRect();
                const i = Math.round(((e.clientX - r.left - m.left) / w) * (data.length - 1));
                setHover(Math.min(Math.max(i, 0), data.length - 1));
              }}
            >
              <defs>
                <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.revenue} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={C.revenue} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {ticks.map(t => (
                <g key={t}>
                  <line x1={m.left} x2={m.left + w} y1={y(t)} y2={y(t)} stroke={C.grid} />
                  <text x={m.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={C.axis}>{short(t)}</text>
                </g>
              ))}
              {data.map((d, i) => ((i % labelEvery === 0 && data.length - 1 - i >= Math.ceil(labelEvery / 2) + 1) || i === data.length - 1) && (
                <text key={d.date} x={x(i)} y={height - 6} textAnchor={i === data.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'} fontSize={11} fill={C.axis}>{dayLabel(d.date)}</text>
              ))}
              <path d={area} fill="url(#rev-fill)" />
              <path d={line('revenue')} fill="none" stroke={C.revenue} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <path d={line('profit')} fill="none" stroke={C.profit} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {hover == null && data.length > 0 && (
                <>
                  <circle cx={x(data.length - 1)} cy={y(data[data.length - 1]!.revenue)} r={4} fill={C.revenue} stroke={C.surface} strokeWidth={2} />
                  <circle cx={x(data.length - 1)} cy={y(data[data.length - 1]!.profit)} r={4} fill={C.profit} stroke={C.surface} strokeWidth={2} />
                </>
              )}
              {hd && hover != null && (
                <>
                  <line x1={x(hover)} x2={x(hover)} y1={m.top} y2={m.top + h} stroke={C.axis} strokeDasharray="3 3" />
                  <circle cx={x(hover)} cy={y(hd.revenue)} r={4.5} fill={C.revenue} stroke={C.surface} strokeWidth={2} />
                  <circle cx={x(hover)} cy={y(hd.profit)} r={4.5} fill={C.profit} stroke={C.surface} strokeWidth={2} />
                </>
              )}
            </svg>
          )}
          {hd && hover != null && (
            <Tooltip x={x(hover)} y={y(hd.revenue)} width={width}>
              <p className="mb-1 font-semibold text-ink">{weekday(hd.date)}</p>
              <p className="flex items-center justify-between gap-4"><span className="inline-flex items-center gap-1.5 text-ink/60"><Swatch color={C.revenue} />Revenue</span><span className="font-semibold text-ink">{formatMoney(hd.revenue)}</span></p>
              <p className="flex items-center justify-between gap-4"><span className="inline-flex items-center gap-1.5 text-ink/60"><Swatch color={C.profit} />Profit</span><span className="font-semibold text-ink">{formatMoney(hd.profit)}</span></p>
              <p className="mt-1 text-ink/50">{hd.transactions} sales</p>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}

// ── Busiest hours (columns) ──────────────────────────────────────────────────
export function HourChart({ data, height = 250 }: { data: { hour: number; revenue: number; transactions: number }[]; height?: number }) {
  const C = useChartColors();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { top: 8, right: 4, bottom: 22, left: 4 };
  const w = Math.max(width - m.left - m.right, 10);
  const h = height - m.top - m.bottom;
  const max = Math.max(...data.map(d => d.transactions), 1);
  const slot = w / data.length;
  const bw = Math.max(Math.min(slot - 3, 28), 4);
  const peak = data.reduce((a, b) => (b.transactions > a.transactions ? b : a), data[0]!);
  const label = (hr: number) => (hr === 12 ? '12p' : hr > 12 ? `${hr - 12}p` : `${hr}a`);
  const hd = hover != null ? data[hover] : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Number of sales by hour of day"
          onPointerLeave={() => setHover(null)}
          onPointerMove={e => {
            const r = e.currentTarget.getBoundingClientRect();
            setHover(Math.min(Math.max(Math.floor((e.clientX - r.left - m.left) / slot), 0), data.length - 1));
          }}>
          {data.map((d, i) => {
            const bh = Math.max((d.transactions / max) * h, d.transactions ? 3 : 0);
            const cx = m.left + slot * i + slot / 2;
            const isPeak = d.hour === peak.hour;
            return (
              <g key={d.hour}>
                <path
                  d={`M${cx - bw / 2},${m.top + h} v${-Math.max(bh - 4, 0)} q0,-4 4,-4 h${bw - 8} q4,0 4,4 v${Math.max(bh - 4, 0)} z`}
                  fill={C.revenue}
                  opacity={hover === i ? 1 : isPeak ? 1 : 0.4}
                />
                {(i % 2 === 0 || isPeak) && (
                  <text x={cx} y={height - 6} textAnchor="middle" fontSize={11} fill={C.axis}>{label(d.hour)}</text>
                )}
              </g>
            );
          })}
          <line x1={m.left} x2={m.left + w} y1={m.top + h} y2={m.top + h} stroke={C.grid} />
        </svg>
      )}
      {hd && hover != null && (
        <Tooltip x={m.left + slot * hover + slot / 2} y={m.top + 10} width={width}>
          <p className="font-semibold text-ink">{label(hd.hour)} – {label(hd.hour + 1)}</p>
          <p className="text-ink/60">{hd.transactions} sales · {formatMoney(hd.revenue, 'UGX', { short: true })}</p>
        </Tooltip>
      )}
    </div>
  );
}

// ── Ranked horizontal bars ───────────────────────────────────────────────────
export function BarList({
  items, color, format = (n: number) => formatMoney(n, 'UGX', { short: true }),
}: {
  items: { label: string; value: number; note?: string }[];
  color?: string;
  format?: (n: number) => string;
}) {
  const C = useChartColors();
  const barColor = color ?? C.revenue;
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={it.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">{it.label}</span>
            <span className="flex-shrink-0 font-semibold tabular-nums text-ink">
              {format(it.value)}
              {it.note && <span className="ml-1.5 text-xs font-normal text-ink/45">{it.note}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sand-dark">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max((it.value / max) * 100, 2)}%`, background: barColor, opacity: hover == null || hover === i ? 1 : 0.45 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
