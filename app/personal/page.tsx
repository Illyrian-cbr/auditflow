import Link from 'next/link';
import ConsumerPricingCard from '@/components/ConsumerPricingCard';

/* ───────────────────────────────────────────────
   Inline SVG Icons
   ─────────────────────────────────────────────── */

function UploadIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function ScanIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function ReportIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function BoltIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function WrenchIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.658 5.659a2.122 2.122 0 01-3-3l5.659-5.658A8.003 8.003 0 0112 3.75a8.003 8.003 0 01-3.58 11.42zM16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

function HeartIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function CogIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495" />
    </svg>
  );
}

/* ───────────────────────────────────────────────
   Data
   ─────────────────────────────────────────────── */

const steps = [
  {
    icon: UploadIcon,
    title: 'Upload Your Bill',
    description: 'Snap a photo or upload a PDF of any utility, contractor, medical, or auto repair bill.',
  },
  {
    icon: ScanIcon,
    title: 'AI Scans for Issues',
    description: 'Our AI analyzes every line item for hidden fees, math errors, and overcharges.',
  },
  {
    icon: ReportIcon,
    title: 'Get a Clear Report',
    description: 'Receive a plain-language report with every suspicious charge flagged and explained.',
  },
];

const categories = [
  {
    icon: BoltIcon,
    title: 'Utility Bills',
    description: 'Mystery surcharges, estimated vs actual readings, duplicate fees, and rate tier mistakes.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: WrenchIcon,
    title: 'Contractor Quotes',
    description: 'Inflated labor rates, phantom materials, vague "misc" charges, and padding on estimates.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: HeartIcon,
    title: 'Medical Bills',
    description: 'Duplicate procedure codes, unbundled charges, facility fee surprises, and coding errors.',
    color: 'bg-rose-50 text-rose-600',
  },
  {
    icon: CogIcon,
    title: 'Auto Repair',
    description: 'Unnecessary upsells, inflated parts pricing, phantom diagnostics, and labor hour padding.',
    color: 'bg-emerald-50 text-emerald-600',
  },
];

/* ───────────────────────────────────────────────
   Page Component
   ─────────────────────────────────────────────── */

export default function PersonalPage() {
  return (
    <div className="scroll-smooth">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-navy">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Gradient orbs */}
        <div className="absolute -top-24 right-0 h-[500px] w-[500px] rounded-full bg-teal/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-[400px] w-[400px] rounded-full bg-teal/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-light">
              For Individuals
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Stop Overpaying{' '}
              <span className="text-teal-light">on Your Bills</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300 sm:text-xl">
              AI-powered bill auditing for everyday expenses. Upload a bill, get instant
              flags on hidden fees and overcharges.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup?tier=personal"
                className="inline-flex items-center justify-center rounded-lg bg-teal px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal/25 transition-all hover:bg-teal-dark hover:shadow-teal/30 hover:-translate-y-0.5"
              >
                Start Auditing &mdash; $9/mo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              Just 10 scans/month. Cancel anytime.
            </p>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-cream to-transparent" />
      </section>

      {/* ── How It Works ── */}
      <section className="bg-cream py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal">
              How It Works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Three steps to savings
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Upload any bill and get answers in under 30 seconds.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
            {steps.map((step, i) => (
              <div key={step.title} className="relative text-center">
                {/* Connector line (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="absolute left-1/2 top-10 hidden h-px w-full bg-gray-300/60 md:block" />
                )}
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-teal/10 text-teal">
                  <step.icon className="h-9 w-9" />
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-navy">{step.title}</h3>
                <p className="mt-2 text-base text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What We Catch ── */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal">
              What We Catch
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Built for the bills you deal with
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Our AI is trained to find the charges that slip past everyone else.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
            {categories.map((category) => (
              <div
                key={category.title}
                className="group rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${category.color}`}>
                  <category.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-navy">{category.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {category.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Section ── */}
      <section className="bg-cream py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal">
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              One simple plan
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Everything you need to audit your personal bills. No hidden fees &mdash; we would know.
            </p>
          </div>

          <div className="mt-16">
            <ConsumerPricingCard />
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="relative overflow-hidden bg-navy">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[300px] w-[600px] rounded-full bg-teal/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Businesses? We have you covered too.
            </h2>
            <p className="mt-4 text-lg text-gray-300">
              Auditflow offers powerful plans for teams and businesses that process vendor invoices at scale.
            </p>
            <div className="mt-8">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-lg border border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-all hover:border-white/60 hover:bg-white/5"
              >
                Check out our business plans
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
