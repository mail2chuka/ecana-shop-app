import Link from 'next/link';
import { Manrope } from 'next/font/google';
import { Logo } from '@/components/ui';

const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '700', '800'], variable: '--font-manrope' });

const FEATURES = [
  {
    title: 'From ATC to delivery',
    body: 'Track every authorization to collect from issue to closed, so nothing sits waiting on the yard unnoticed.',
    accent: 'var(--amber)', glow: 'var(--amber-glow)',
  },
  {
    title: 'One ledger, always right',
    body: 'Customer balances, payments, and statements reconcile automatically — no separate books to keep in sync.',
    accent: 'var(--slate)', glow: 'var(--slate-glow)',
  },
  {
    title: 'Access that matches the job',
    body: 'Owners, managers, ATC handlers, and auditors each see exactly what their role needs, nothing more.',
    accent: 'var(--rust)', glow: 'var(--rust-glow)',
  },
];

export default function LandingPage() {
  return (
    <div className={`landing ${manrope.variable}`} style={{ fontFamily: 'var(--font-manrope)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }}>
      {/* Nav */}
      <header className="max-w-5xl mx-auto flex items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2 font-extrabold tracking-tight text-lg">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg shrink-0" style={{ backgroundColor: 'var(--ink)' }}>
            <Logo className="h-6 w-6" />
          </span>
          GS&amp;M
        </span>
        <Link
          href="/login"
          className="text-sm font-semibold px-5 py-2.5 rounded-full transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: 'var(--green)', color: 'white' }}
        >
          Sign In
        </Link>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="glow" />
        <div className="relative max-w-3xl mx-auto px-6 pt-20 pb-24 text-center">
          <p
            className="reveal text-xs font-semibold tracking-widest uppercase mb-5"
            style={{ color: 'var(--amber)', animationDelay: '60ms' }}
          >
            For building-materials distributors
          </p>
          <h1
            className="reveal font-extrabold leading-[1.05] text-4xl sm:text-5xl lg:text-6xl tracking-tight"
            style={{ animationDelay: '140ms' }}
          >
            One system for your whole distribution business.
          </h1>
          <p
            className="reveal mt-6 text-lg leading-relaxed max-w-xl mx-auto"
            style={{ color: 'var(--muted)', animationDelay: '240ms' }}
          >
            Cement, aggregate, and shop sales on one ledger — with the right access for every person on your team.
          </p>
          <div className="reveal mt-9" style={{ animationDelay: '340ms' }}>
            <Link
              href="/login"
              className="inline-block px-7 py-3.5 font-semibold rounded-full transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--green)', color: 'white' }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-3 gap-8 sm:gap-10">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <div className="h-9 w-9 rounded-lg mb-4" style={{ backgroundColor: f.glow }}>
                <div className="h-full w-full rounded-lg" style={{ border: `2px solid ${f.accent}`, opacity: 0.55 }} />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t" style={{ borderColor: 'var(--line)' }}>
        <div className="max-w-5xl mx-auto px-6 py-16 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <h2 className="font-extrabold text-2xl sm:text-3xl tracking-tight">Already a subscriber?</h2>
          <Link
            href="/login"
            className="shrink-0 inline-block px-7 py-3.5 font-semibold rounded-full transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: 'var(--green)', color: 'white' }}
          >
            Sign In
          </Link>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>
        © 2026 GS&amp;M — Goods Sales and Management
      </footer>
    </div>
  );
}
