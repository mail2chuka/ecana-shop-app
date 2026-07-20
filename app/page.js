import Link from 'next/link';
import { Big_Shoulders_Display, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { Logo } from '@/components/ui';

const display = Big_Shoulders_Display({ subsets: ['latin'], weight: ['600', '700', '900'], variable: '--font-display' });
const body = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

const FEATURES = [
  {
    code: '01 / CEMENT',
    title: 'ATC lifecycle, start to close',
    body: "Every Authorization to Collect tracked bag-by-bag: pending, assigned, loaded, arrived, closed. No spreadsheet ever caught a truck sitting on a half-loaded ATC for three days.",
  },
  {
    code: '02 / AGGREGATE',
    title: 'Quarry tonnage, priced right',
    body: 'Stonedust and aggregate sales by the tonne, tied to the quarry purchase that supplied them, with margins that stay visible instead of buried in a notebook.',
  },
  {
    code: '03 / CREDIT',
    title: 'A ledger that never loses a kobo',
    body: 'Running customer balances, full statements, and audited surcharges or refunds behind a PIN — not an admin\'s memory of who owes what.',
  },
  {
    code: '04 / FLEET',
    title: 'Trucks that know where they are',
    body: "A truck locked to an ATC or a quarry delivery can't be double-booked. Availability is a fact, not a phone call to the yard.",
  },
  {
    code: '05 / ACCESS',
    title: 'The right seat for every role',
    body: 'Owners see everything. Managers run the floor. ATC handlers get exactly their queue. Auditors get read-only reports and nothing else.',
  },
  {
    code: '06 / REPORTS',
    title: 'Numbers your accountant trusts',
    body: 'Sales, balances, quarry purchases, per-customer and per-product breakdowns, truck utilization — generated from the same ledger, always reconciled.',
  },
];

const TICKER_ITEMS = ['AUTHORIZATION TO COLLECT', 'TONNE', 'CUSTOMER LEDGER', 'QUARRY REFERENCE', 'BAG COUNT', 'TRUCK MANIFEST', 'CREDIT BALANCE', 'DISPATCH'];

export default function LandingPage() {
  return (
    <div className={`landing ${display.variable} ${body.variable} ${mono.variable}`} style={{ fontFamily: 'var(--font-body)', backgroundColor: 'var(--paper)', color: 'var(--ink)' }}>
      {/* Nav */}
      <header className="relative z-10 max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2 font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
          <span className="inline-flex items-center justify-center h-8 w-8 rounded" style={{ backgroundColor: 'var(--ink)' }}>
            <Logo className="h-5 w-5" />
          </span>
          GS&amp;M
        </span>
        <Link
          href="/login"
          className="text-sm font-medium px-4 py-2 rounded-sm border transition-colors"
          style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }}
        >
          Sign In →
        </Link>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden diagonal-down pb-24 pt-8" style={{ backgroundColor: 'var(--ink)' }}>
        <div className="grain" />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-8">
          <p
            className="reveal text-xs tracking-[0.3em] uppercase mb-6"
            style={{ color: 'var(--rust)', fontFamily: 'var(--font-mono)', animationDelay: '80ms' }}
          >
            Built for building-materials distributors
          </p>
          <h1
            className="reveal font-black leading-[0.92] text-[13vw] sm:text-[9vw] lg:text-[6.5rem]"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--paper)', animationDelay: '180ms' }}
          >
            RUN THE
            <br />
            <span style={{ color: 'var(--rust)' }}>YARD</span>, NOT
            <br />
            THE SPREADSHEET
          </h1>
          <p
            className="reveal mt-8 max-w-xl text-lg leading-relaxed"
            style={{ color: 'var(--concrete)', animationDelay: '320ms' }}
          >
            GS&amp;M is the operating system for cement, aggregate, and shop distribution —
            from the ATC that authorizes a truck to the report that closes your books.
          </p>
          <div className="reveal mt-10 flex items-center gap-5" style={{ animationDelay: '440ms' }}>
            <Link
              href="/login"
              className="inline-block px-7 py-3.5 font-semibold rounded-sm transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--rust)', color: 'var(--paper)' }}
            >
              Sign In
            </Link>
            <p className="text-sm" style={{ color: 'var(--concrete)' }}>
              New to GS&amp;M? Organizations are onboarded directly by our team.
            </p>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="overflow-hidden border-y py-3" style={{ borderColor: 'var(--ink)', backgroundColor: 'var(--paper)' }}>
        <div className="ticker-track flex whitespace-nowrap" style={{ fontFamily: 'var(--font-mono)' }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="text-xs tracking-widest mx-6" style={{ color: 'var(--rust-dim)' }}>
              {item} <span style={{ color: 'var(--concrete)' }}>／</span>
            </span>
          ))}
        </div>
      </div>

      {/* Positioning */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-5 gap-10">
        <div className="md:col-span-2">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: 'var(--rust-dim)', fontFamily: 'var(--font-mono)' }}>
            Why generic tools fail here
          </p>
          <h2 className="font-black text-4xl leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Your business isn't a widget shop.
          </h2>
        </div>
        <div className="md:col-span-3 space-y-4 text-base leading-relaxed" style={{ color: '#3a352c' }}>
          <p>
            Off-the-shelf inventory software doesn't know what an ATC is. It has no idea that a truck
            can be locked to a quarry delivery for thirty minutes, or that a cement sale needs a bag
            count reconciled against what actually left the depot.
          </p>
          <p>
            GS&amp;M was built inside a real distribution yard, for the exact workflow that runs
            one — cement, aggregate, and retail shop, under one ledger, one customer base, one set of books.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="relative diagonal-up py-24" style={{ backgroundColor: 'var(--ink)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="font-black text-4xl sm:text-5xl mb-14 max-w-lg"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--paper)' }}
          >
            EVERYTHING THE YARD RUNS ON.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ backgroundColor: 'rgba(242,237,225,0.12)' }}>
            {FEATURES.map((f) => (
              <div key={f.code} className="p-7 transition-colors hover:bg-white/[0.03]" style={{ backgroundColor: 'var(--ink)' }}>
                <p className="text-xs tracking-widest mb-4" style={{ color: 'var(--rust)', fontFamily: 'var(--font-mono)' }}>{f.code}</p>
                <h3 className="font-bold text-xl mb-3" style={{ color: 'var(--paper)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--concrete)' }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Manifest / trust strip */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="border-2 p-8 sm:p-10" style={{ borderColor: 'var(--ink)' }}>
          <p className="text-xs tracking-[0.3em] uppercase mb-6" style={{ color: 'var(--rust-dim)', fontFamily: 'var(--font-mono)' }}>
            Manifest — what's under the hood
          </p>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4" style={{ fontFamily: 'var(--font-mono)' }}>
            {[
              'Multi-tenant, one login per person',
              'Role-based access down to the page',
              'Reversible edits on every financial record',
              'PIN-gated surcharges & refunds',
              'Full audit log of every change',
              'Reports reconciled to the same ledger',
            ].map((line) => (
              <div key={line} className="flex items-center gap-3 text-sm py-2 border-b" style={{ borderColor: '#00000014' }}>
                <span style={{ color: 'var(--rust)' }}>▪</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 border-t pt-14" style={{ borderColor: 'var(--ink)' }}>
          <h2 className="font-black text-3xl sm:text-4xl max-w-md leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Already a subscriber? Your ledger is waiting.
          </h2>
          <Link
            href="/login"
            className="shrink-0 inline-block px-8 py-4 font-semibold rounded-sm transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: 'var(--ink)', color: 'var(--paper)' }}
          >
            Sign In →
          </Link>
        </div>
      </section>

      <footer className="px-6 pb-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between gap-2 text-xs" style={{ color: 'var(--rust-dim)', fontFamily: 'var(--font-mono)' }}>
          <span>© 2026 GS&amp;M — GOODS SALES &amp; MANAGEMENT</span>
          <span>BUILT FOR THE YARD</span>
        </div>
      </footer>
    </div>
  );
}
