'use client';

interface PricingCardsProps {
  onSelectPlan?: (tier: 'free' | 'starter' | 'pro') => void;
  currentTier?: string;
}

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  tier: 'free' | 'starter' | 'pro';
  name: string;
  price: number;
  scansPerMonth: string;
  cta: string;
  popular: boolean;
  features: PlanFeature[];
}

const plans: Plan[] = [
  {
    tier: 'free',
    name: 'Free',
    price: 0,
    scansPerMonth: '2 scans/month',
    cta: 'Start Free',
    popular: false,
    features: [
      { text: 'Tier 1 analysis', included: true },
      { text: 'Line item extraction', included: true },
      { text: 'Math verification', included: true },
      { text: 'AI dispute letters', included: false },
      { text: 'Market rate benchmarking', included: false },
      { text: 'Savings reports', included: false },
      { text: 'Trend tracking', included: false },
      { text: 'Email support', included: false },
    ],
  },
  {
    tier: 'starter',
    name: 'Starter',
    price: 29,
    scansPerMonth: '50 scans/month',
    cta: 'Get Started',
    popular: true,
    features: [
      { text: 'Full Tier 1 analysis', included: true },
      { text: 'Line item extraction', included: true },
      { text: 'Math verification', included: true },
      { text: 'AI dispute letters', included: true },
      { text: 'Email support', included: true },
      { text: 'Market rate benchmarking', included: false },
      { text: 'Savings reports', included: false },
      { text: 'Trend tracking', included: false },
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 59,
    scansPerMonth: '150 scans/month',
    cta: 'Go Pro',
    popular: false,
    features: [
      { text: 'Everything in Starter', included: true },
      { text: 'Market rate benchmarking', included: true },
      { text: 'Savings reports', included: true },
      { text: 'Trend tracking', included: true },
      { text: 'Priority support', included: true },
      { text: 'Line item extraction', included: true },
      { text: 'Math verification', included: true },
      { text: 'AI dispute letters', included: true },
    ],
  },
];

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-green-600"
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

function XIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-red-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2.5"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export default function PricingCards({
  onSelectPlan,
  currentTier,
}: PricingCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 max-w-6xl mx-auto">
      {plans.map((plan) => {
        const isCurrentPlan = currentTier === plan.tier;
        const isPopular = plan.popular;

        return (
          <div
            key={plan.tier}
            className={`relative flex flex-col rounded-2xl bg-white p-6 shadow-md transition-shadow hover:shadow-lg ${
              isPopular
                ? 'border-2 border-teal ring-1 ring-teal/20'
                : 'border border-gray-200'
            }`}
          >
            {/* Most Popular Badge */}
            {isPopular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-block rounded-full bg-teal px-4 py-1 text-xs font-semibold text-white uppercase tracking-wide">
                  Most Popular
                </span>
              </div>
            )}

            {/* Plan Header */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-navy">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-navy">
                  ${plan.price}
                </span>
                <span className="text-sm text-gray-500">/mo</span>
              </div>
              <p className="mt-2 text-sm text-gray-600">{plan.scansPerMonth}</p>
            </div>

            {/* Features List */}
            <ul className="mb-8 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature.text} className="flex items-start gap-2.5">
                  {feature.included ? <CheckIcon /> : <XIcon />}
                  <span
                    className={`text-sm ${
                      feature.included ? 'text-navy' : 'text-gray-400'
                    }`}
                  >
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            {isCurrentPlan ? (
              <button
                disabled
                className="w-full rounded-lg bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-500 cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => onSelectPlan?.(plan.tier)}
                className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${
                  isPopular
                    ? 'bg-teal text-white hover:bg-teal-dark'
                    : 'bg-navy text-white hover:bg-navy-light'
                }`}
              >
                {plan.cta}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
