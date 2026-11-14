const POINTS = [
  'Track stock across every branch in real time',
  'Sell, take mobile money and print receipts',
  'See your profit and what to reorder each day',
];

function Wordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sunset font-display text-lg font-bold text-white shadow-sm">
        S
      </div>
      <span className="font-display text-xl font-bold tracking-tight">SokoOS</span>
    </div>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sand lg:grid lg:grid-cols-2">
      {/* Brand panel — desktop only */}
      <aside className="relative hidden overflow-hidden bg-soil p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sunset/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-ochre/10 blur-3xl" />

        <Wordmark className="relative" />

        <div className="relative">
          <h1 className="max-w-md font-display text-4xl font-bold leading-[1.15] tracking-tight">
            Run your whole business from one screen.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/65">
            Stock, sales, purchasing and finance — built for businesses in Uganda.
          </p>
          <ul className="mt-10 space-y-4">
            {POINTS.map(point => (
              <li key={point} className="flex items-start gap-3 text-[15px] text-white/85">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sunset/25 text-sunset">
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2.5 6.2 5 8.7l4.5-5" />
                  </svg>
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/35">© 2026 SokoOS · Business operating platform</p>
      </aside>

      {/* Form column */}
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sand via-white to-peach/40 px-5 py-10 lg:px-10">
        <div className="w-full max-w-[420px]">
          <Wordmark className="mb-9 justify-center text-soil lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}