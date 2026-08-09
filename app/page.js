'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Manrope, Fraunces } from 'next/font/google';
import { Logo } from '@/components/ui';
import {
  FiTruck, FiBookOpen, FiUsers, FiSmartphone, FiPrinter, FiShield, FiArrowRight,
} from 'react-icons/fi';

const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '700', '800'], variable: '--font-manrope' });
const fraunces = Fraunces({ subsets: ['latin'], weight: ['500', '600'], style: ['normal', 'italic'], variable: '--font-fraunces' });

const ROLES = [
  { label: 'Owner', body: 'Sees the whole business, unlocks everything.' },
  { label: 'GSM Manager', body: 'Runs daily sales, customers, and pricing.' },
  { label: 'ATC Handler', body: 'Assigns, loads, and closes out trucks.' },
  { label: 'Auditor', body: 'Read-only oversight across every record.' },
];

const FEATURES = [
  {
    icon: FiTruck,
    title: 'From ATC to delivery',
    body: 'Track every authorization to collect from issue to closed, so nothing sits waiting on the yard unnoticed.',
    accent: 'var(--amber)', glow: 'var(--amber-glow)',
  },
  {
    icon: FiBookOpen,
    title: 'One ledger, always right',
    body: 'Customer balances, payments, and statements reconcile automatically — no separate books to keep in sync.',
    accent: 'var(--slate)', glow: 'var(--slate-glow)',
  },
  {
    icon: FiUsers,
    title: 'Access that matches the job',
    body: 'Owners, managers, ATC handlers, and auditors each see exactly what their role needs, nothing more.',
    accent: 'var(--rust)', glow: 'var(--rust-glow)',
  },
  {
    icon: FiSmartphone,
    title: 'A portal for your customers',
    body: 'Customers check their own balance and statement any time, without a call to the office.',
    accent: 'var(--slate)', glow: 'var(--slate-glow)',
  },
  {
    icon: FiPrinter,
    title: 'Paperwork that prints true',
    body: 'Statements, invoices, and receipts lay out at true A4 — the paper your customers already expect.',
    accent: 'var(--amber)', glow: 'var(--amber-glow)',
  },
  {
    icon: FiShield,
    title: 'A full audit trail',
    body: 'Every edit, delete, and price change is logged, so you always know who did what, and when.',
    accent: 'var(--rust)', glow: 'var(--rust-glow)',
  },
];

const STEPS = [
  { n: '01', title: 'Record', body: 'Log sales, ATCs, and payments right as they happen on the yard.' },
  { n: '02', title: 'Reconcile', body: 'Stock and customer balances update on their own — no manual double-entry.' },
  { n: '03', title: 'Report', body: 'Pull statements, balances, and per-product reports whenever you need them.' },
];

function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const nodes = ref.current?.querySelectorAll('.scroll-reveal') || [];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

function Badge({ children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] px-3 py-1.5 rounded-full"
      style={{ backgroundColor: 'var(--amber-glow)', color: 'var(--amber)' }}
    >
      {children}
    </span>
  );
}

export default function LandingPage() {
  const scopeRef = useScrollReveal();

  return (
    <div
      ref={scopeRef}
      className={`landing ${manrope.variable} ${fraunces.variable}`}
      style={{ fontFamily: 'var(--font-manrope)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }}
    >
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur border-b" style={{ backgroundColor: 'rgba(251,249,244,0.82)', borderColor: 'var(--line)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 font-extrabold tracking-tight text-lg">
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg shrink-0" style={{ backgroundColor: 'var(--ink)' }}>
              <Logo className="h-6 w-6" />
            </span>
            GS&amp;M
          </span>
          <nav className="hidden sm:flex items-center gap-8 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            <a href="#features" className="hover:opacity-70 transition-opacity">Features</a>
            <a href="#how-it-works" className="hover:opacity-70 transition-opacity">How it works</a>
          </nav>
          <Link
            href="/login"
            className="text-sm font-semibold px-5 py-2.5 rounded-full transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: 'var(--green)', color: 'white' }}
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="glow" />
        <div className="grain" />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-24 lg:pt-24 lg:pb-32 grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
          <div>
            <p className="reveal mb-6" style={{ animationDelay: '60ms' }}>
              <Badge>For building-materials distributors</Badge>
            </p>
            <h1
              className="reveal font-semibold leading-[1.08] text-4xl sm:text-5xl lg:text-[3.4rem] tracking-tight"
              style={{ fontFamily: 'var(--font-fraunces)', animationDelay: '140ms' }}
            >
              Every bag, every tonne, every naira —{' '}
              <em className="not-italic" style={{ fontStyle: 'italic', color: 'var(--green)' }}>one</em> ledger.
            </h1>
            <p
              className="reveal mt-6 text-lg leading-relaxed max-w-lg"
              style={{ color: 'var(--muted)', animationDelay: '240ms' }}
            >
              GS&amp;M tracks ATCs, sales, and customer balances across cement, aggregate, and shop stock —
              so your books are always right and every role on your team sees exactly what it needs.
            </p>
            <div className="reveal mt-9 flex flex-wrap items-center gap-5" style={{ animationDelay: '340ms' }}>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 font-semibold rounded-full transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: 'var(--green)', color: 'white' }}
              >
                Sign In <FiArrowRight />
              </Link>
              <a href="#features" className="text-sm font-semibold hover:opacity-70 transition-opacity" style={{ color: 'var(--ink)' }}>
                See what&apos;s inside ↓
              </a>
            </div>
          </div>

          {/* Illustrative product mockup — generic placeholder content, not a real customer's data. */}
          <div className="reveal relative h-[400px] sm:h-[420px]" style={{ animationDelay: '420ms' }}>
            <div
              className="absolute top-6 right-2 w-[78%] rounded-2xl border p-4"
              style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--line)', transform: 'rotate(4deg)', boxShadow: '0 20px 45px -20px rgba(11,79,58,0.28)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--amber)' }}>ATC #0142</p>
              <p className="text-sm font-bold mt-1">Loaded — awaiting dispatch</p>
              <div className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: 'var(--line)' }}>
                <div className="h-full rounded-full" style={{ width: '70%', backgroundColor: 'var(--amber)' }} />
              </div>
            </div>
            <div
              className="absolute bottom-0 left-0 w-[86%] rounded-2xl border p-6"
              style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--line)', transform: 'rotate(-3deg)', boxShadow: '0 30px 60px -20px rgba(11,79,58,0.3)' }}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: 'var(--line)' }}>
                <p className="text-sm font-extrabold">Customer Statement</p>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--slate-glow)', color: 'var(--slate)' }}>Auto-reconciled</span>
              </div>
              {[
                ['Cement — 50kg bag', '₦8,500'],
                ['Aggregate — per tonne', '₦42,000'],
              ].map(([label, amt]) => (
                <div key={label} className="flex items-center justify-between py-1.5 text-sm">
                  <span style={{ color: 'var(--muted)' }}>{label}</span>
                  <span className="font-semibold">{amt}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 mt-2 border-t" style={{ borderColor: 'var(--line)' }}>
                <span className="text-sm font-bold">Balance due</span>
                <span className="text-lg font-extrabold" style={{ color: 'var(--green)' }}>₦12,300</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-y" style={{ borderColor: 'var(--line)' }}>
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
          {ROLES.map((r) => (
            <div key={r.label} className="scroll-reveal">
              <p className="text-sm font-extrabold">{r.label}</p>
              <p className="text-sm mt-1 leading-snug" style={{ color: 'var(--muted)' }}>{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24 scroll-mt-20">
        <div className="scroll-reveal max-w-lg mb-14">
          <p className="text-xs font-bold uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--amber)' }}>What&apos;s inside</p>
          <h2 className="font-semibold text-3xl sm:text-4xl tracking-tight" style={{ fontFamily: 'var(--font-fraunces)' }}>
            Built around how a yard actually runs.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {FEATURES.map((f) => (
            <div key={f.title} className="scroll-reveal">
              <div className="h-11 w-11 rounded-xl mb-4 flex items-center justify-center" style={{ backgroundColor: f.glow }}>
                <f.icon size={19} style={{ color: f.accent }} />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--surface-card)' }}>
        <div className="max-w-6xl mx-auto px-6 py-24 scroll-mt-20">
          <div className="scroll-reveal max-w-lg mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--slate)' }}>How it works</p>
            <h2 className="font-semibold text-3xl sm:text-4xl tracking-tight" style={{ fontFamily: 'var(--font-fraunces)' }}>
              Three steps. No spreadsheets.
            </h2>
          </div>
          <div className="relative grid sm:grid-cols-3 gap-10 sm:gap-8">
            <div className="hidden sm:block absolute top-6 left-0 right-0 h-px" style={{ backgroundColor: 'var(--line)' }} />
            {STEPS.map((s) => (
              <div key={s.n} className="scroll-reveal relative">
                <div
                  className="relative z-10 h-12 w-12 rounded-full flex items-center justify-center font-extrabold text-sm mb-5"
                  style={{ backgroundColor: 'var(--surface-card)', border: '2px solid var(--green)', color: 'var(--green)' }}
                >
                  {s.n}
                </div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — dark band for contrast */}
      <section style={{ backgroundColor: 'var(--green-deep)' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 scroll-reveal">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8 text-center sm:text-left">
            <h2 className="font-semibold text-2xl sm:text-3xl tracking-tight text-white max-w-md" style={{ fontFamily: 'var(--font-fraunces)' }}>
              Already a subscriber? Your ledger is waiting.
            </h2>
            <Link
              href="/login"
              className="shrink-0 inline-flex items-center gap-2 px-7 py-3.5 font-semibold rounded-full transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--amber)', color: 'white' }}
            >
              Sign In <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-xs" style={{ color: 'var(--muted)' }}>
        <span>© 2026 GS&amp;M — Goods Sales and Management</span>
        <span>Built for cement, aggregate, and building-materials distributors.</span>
      </footer>
    </div>
  );
}
