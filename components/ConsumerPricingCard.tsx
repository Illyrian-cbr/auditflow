'use client';

import Link from 'next/link';

const features = [
  '10 scans/month',
  'AI-powered analysis',
  'Flag hidden fees & overcharges',
  'Math verification',
  'Consumer-friendly reports',
];

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-teal"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2.5"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

export default function ConsumerPricingCard() {
  return (
    <div className="mx-auto max-w-sm rounded-xl bg-white p-8 shadow-lg border border-gray-200">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-navy">Personal</h3>
        <div className="mt-4 flex items-baseline justify-center gap-1">
          <span className="text-5xl font-bold text-navy">$9</span>
          <span className="text-base text-gray-500">/month</span>
        </div>
        <p className="mt-2 text-sm text-gray-500">Cancel anytime. No contracts.</p>
      </div>

      {/* Divider */}
      <div className="my-6 h-px bg-gray-200" />

      {/* Features */}
      <ul className="space-y-4">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <CheckIcon />
            <span className="text-sm text-navy">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href="/signup?tier=personal"
        className="mt-8 block w-full rounded-lg bg-teal px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
      >
        Get Started
      </Link>
    </div>
  );
}
