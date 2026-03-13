'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { supabase } from '@/lib/supabase';
import PricingCards from '@/components/PricingCards';
import ApiKeyManager from '@/components/ApiKeyManager';
import ApiDocsPreview from '@/components/ApiDocsPreview';
import type { User as AppUser, SubscriptionTier } from '@/types';

const STRIPE_PRICE_IDS: Record<string, string> = {
  starter: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? '',
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? '',
  personal: process.env.NEXT_PUBLIC_STRIPE_PERSONAL_PRICE_ID ?? '',
  team_starter: process.env.NEXT_PUBLIC_STRIPE_TEAM_STARTER_PRICE_ID ?? '',
  team_pro: process.env.NEXT_PUBLIC_STRIPE_TEAM_PRO_PRICE_ID ?? '',
};

const TIER_DISPLAY: Record<
  SubscriptionTier,
  { name: string; price: number; description: string; badge: string }
> = {
  free: {
    name: 'Free',
    price: 0,
    description: '2 scans/month, Tier 1 analysis',
    badge: 'bg-gray-100 text-gray-600',
  },
  personal: {
    name: 'Personal',
    price: 9,
    description: '10 scans/month, consumer bill auditing',
    badge: 'bg-purple-100 text-purple-700',
  },
  starter: {
    name: 'Starter',
    price: 29,
    description: '50 scans/month, dispute letters, email support',
    badge: 'bg-teal/10 text-teal',
  },
  pro: {
    name: 'Pro',
    price: 59,
    description:
      '150 scans/month, market benchmarking, savings reports, priority support',
    badge: 'bg-navy/10 text-navy',
  },
  team_starter: {
    name: 'Team Starter',
    price: 99,
    description: '200 scans/month, 5 team members, shared limits',
    badge: 'bg-blue-100 text-blue-700',
  },
  team_pro: {
    name: 'Team Pro',
    price: 199,
    description: '500 scans/month, 10 team members, API access, priority support',
    badge: 'bg-indigo-100 text-indigo-700',
  },
};

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse h-8 w-32 rounded bg-gray-200" />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-6"
        >
          <div className="animate-pulse h-6 w-40 rounded bg-gray-200 mb-4" />
          <div className="animate-pulse h-20 w-full rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function SettingsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Check for checkout=success query param
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw new Error('Failed to load profile');
      setProfile(data as AppUser);
      setEmailNotifications(data.email_notifications ?? true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchProfile();
    }
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, fetchProfile, router]);

  const handleManageBilling = async () => {
    setBillingLoading(true);
    try {
      const response = await fetch('/api/billing-portal', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to open billing portal');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to open billing portal'
      );
    } finally {
      setBillingLoading(false);
    }
  };

  const handleSelectPlan = async (tier: 'free' | 'starter' | 'pro') => {
    if (tier === 'free') return;

    const priceId = STRIPE_PRICE_IDS[tier];
    if (!priceId) {
      setError('Pricing configuration error. Please try again later.');
      return;
    }

    setCheckoutLoading(tier);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start checkout');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start checkout'
      );
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleToggleNotifications = async () => {
    const newValue = !emailNotifications;
    setEmailNotifications(newValue);

    if (user) {
      await supabase
        .from('users')
        .update({ email_notifications: newValue })
        .eq('id', user.id);
    }
  };

  if (authLoading || (user && loading)) {
    return <SettingsSkeleton />;
  }

  if (error && !profile) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center max-w-md">
            <svg
              className="mx-auto h-12 w-12 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-red-800">
              Failed to load settings
            </h3>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              onClick={fetchProfile}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const currentTier = profile.subscription_tier;
  const tierInfo = TIER_DISPLAY[currentTier];
  const isTopTier = currentTier === 'pro' || currentTier === 'team_pro';
  const isProOrTeam = ['pro', 'team_starter', 'team_pro'].includes(currentTier);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Settings</h1>

      {/* Checkout Success Banner */}
      {showSuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="h-6 w-6 shrink-0 text-green-600 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">
                Subscription activated successfully!
              </p>
              <p className="mt-0.5 text-sm text-green-700">
                Your plan has been upgraded. You now have access to all features
                included in your new tier.
              </p>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="shrink-0 text-green-600 hover:text-green-800 transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Inline Error Banner */}
      {error && profile && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="h-6 w-6 shrink-0 text-red-500 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="mt-0.5 text-sm text-red-600">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="shrink-0 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Section 1: Current Plan */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">Current Plan</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-navy">
                {tierInfo.name}
              </span>
              {tierInfo.price > 0 && (
                <span className="text-lg text-gray-500">
                  ${tierInfo.price}/mo
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600">{tierInfo.description}</p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tierInfo.badge}`}
          >
            {tierInfo.name} Plan
          </span>
        </div>
      </section>

      {/* Section 2: Upgrade Plans (hidden if already on top tier) */}
      {!isTopTier && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-navy">
            Upgrade Your Plan
          </h2>
          <PricingCards
            onSelectPlan={handleSelectPlan}
            currentTier={currentTier}
          />
          {checkoutLoading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              <svg
                className="h-5 w-5 animate-spin text-teal"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Redirecting to checkout...
            </div>
          )}
        </section>
      )}

      {/* Section 3: API Access (Pro and Team tiers only) */}
      {isProOrTeam && (
        <section id="api" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">API Access</h2>
          <p className="text-sm text-gray-600 mb-6">
            Integrate invoice auditing into your own applications with our REST API.
            Generate API keys below and use Bearer token authentication.
          </p>
          <div className="space-y-8">
            <ApiKeyManager userTier={currentTier} />
            <ApiDocsPreview />
          </div>
        </section>
      )}

      {/* Section 4: Billing */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">Billing</h2>
        {profile.stripe_customer_id ? (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Manage your subscription, update payment methods, and view
              invoices through the Stripe customer portal.
            </p>
            <button
              onClick={handleManageBilling}
              disabled={billingLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {billingLoading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Opening portal...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
                    />
                  </svg>
                  Manage Billing
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              No billing account yet. Subscribe to a paid plan to set up
              billing.
            </p>
          </div>
        )}
      </section>

      {/* Section 5: Account Info */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">
          Account Information
        </h2>
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Email
            </dt>
            <dd className="mt-1 text-sm text-navy">
              {user.email ?? 'No email on file'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Name
            </dt>
            <dd className="mt-1 text-sm text-navy">
              {profile.name ?? 'Not set'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Member Since
            </dt>
            <dd className="mt-1 text-sm text-navy">
              {new Date(profile.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Email Notifications
              </dt>
              <dd className="mt-1 text-sm text-gray-600">
                Receive email summaries after each scan
              </dd>
            </div>
            <button
              onClick={handleToggleNotifications}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                emailNotifications ? 'bg-teal' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </dl>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsPageContent />
    </Suspense>
  );
}
