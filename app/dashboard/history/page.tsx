'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/providers';
import { supabase } from '@/lib/supabase';
import RiskBadge from '@/components/RiskBadge';
import type { Scan } from '@/types';

interface VendorInsight {
  vendor_name: string;
  scan_count: number;
  services: {
    category: string;
    rates: { rate: number; date: string; scan_id: string }[];
    trend: 'increasing' | 'decreasing' | 'stable';
    latestIncrease?: number;
  }[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function TrendBadge({ trend, increase }: { trend: string; increase?: number }) {
  if (trend === 'increasing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
        </svg>
        {increase ? `+${increase.toFixed(1)}%` : 'Rising'}
      </span>
    );
  }
  if (trend === 'decreasing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
        </svg>
        Decreasing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
      Stable
    </span>
  );
}

function MiniChart({ rates }: { rates: { rate: number; date: string }[] }) {
  if (rates.length < 2) return null;

  const max = Math.max(...rates.map((r) => r.rate));
  const min = Math.min(...rates.map((r) => r.rate));
  const range = max - min || 1;
  const chartW = 120;
  const chartH = 36;

  const points = rates.map((r, i) => {
    const x = (i / (rates.length - 1)) * chartW;
    const y = chartH - ((r.rate - min) / range) * (chartH - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg
      width={chartW}
      height={chartH}
      className="inline-block"
      viewBox={`0 0 ${chartW} ${chartH}`}
    >
      <polyline
        fill="none"
        stroke="#2A9D8F"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
      {rates.map((r, i) => {
        const x = (i / (rates.length - 1)) * chartW;
        const y = chartH - ((r.rate - min) / range) * (chartH - 4) - 2;
        return (
          <circle key={i} cx={x} cy={y} r="3" fill="#2A9D8F" />
        );
      })}
    </svg>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse h-8 w-48 rounded bg-gray-200" />
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse h-14 w-full rounded bg-gray-200" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<VendorInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [userTier, setUserTier] = useState<string>('free');
  const [activeTab, setActiveTab] = useState<'history' | 'insights'>('history');

  const fetchScans = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error('Failed to load scan history');
      setScans((data as Scan[]) ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUserTier = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    if (data) setUserTier(data.subscription_tier || 'free');
  }, [user]);

  const fetchInsights = useCallback(async () => {
    if (!user || userTier !== 'pro') return;

    setInsightsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('vendor_trends')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (fetchError || !data || data.length === 0) {
        setInsights([]);
        return;
      }

      // Group by vendor
      const vendorMap = new Map<string, typeof data>();
      for (const row of data) {
        const key = row.vendor_name_normalized;
        if (!vendorMap.has(key)) vendorMap.set(key, []);
        vendorMap.get(key)!.push(row);
      }

      const result: VendorInsight[] = [];
      for (const [vendorName, rows] of vendorMap) {
        const serviceMap = new Map<string, typeof rows>();
        for (const row of rows) {
          const cat = row.service_category || 'General';
          if (!serviceMap.has(cat)) serviceMap.set(cat, []);
          serviceMap.get(cat)!.push(row);
        }

        const services: VendorInsight['services'] = [];
        for (const [category, serviceRows] of serviceMap) {
          const rates = serviceRows.map((r) => ({
            rate: parseFloat(r.rate),
            date: r.invoice_date || r.created_at,
            scan_id: r.scan_id || '',
          }));

          let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
          let latestIncrease: number | undefined;

          if (rates.length >= 2) {
            const last = rates[rates.length - 1].rate;
            const prev = rates[rates.length - 2].rate;
            const change = ((last - prev) / prev) * 100;
            if (change > 5) {
              trend = 'increasing';
              latestIncrease = change;
            } else if (change < -5) {
              trend = 'decreasing';
            }
          }

          services.push({ category, rates, trend, latestIncrease });
        }

        const uniqueScans = new Set(rows.map((r) => r.scan_id).filter(Boolean));
        result.push({
          vendor_name: vendorName,
          scan_count: uniqueScans.size,
          services,
        });
      }

      result.sort((a, b) => b.scan_count - a.scan_count);
      setInsights(result);
    } catch (err) {
      console.error('Failed to fetch vendor insights:', err);
    } finally {
      setInsightsLoading(false);
    }
  }, [user, userTier]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchScans();
      fetchUserTier();
    }
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, fetchScans, fetchUserTier, router]);

  useEffect(() => {
    if (userTier === 'pro' && activeTab === 'insights') {
      fetchInsights();
    }
  }, [userTier, activeTab, fetchInsights]);

  if (authLoading || (user && loading)) {
    return <HistorySkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-navy">Scan History</h1>
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
              Failed to load history
            </h3>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              onClick={fetchScans}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Scan History</h1>
        <p className="mt-1 text-sm text-gray-500">
          All your past invoice analyses in one place.
        </p>
      </div>

      {/* Tabs for Pro users */}
      {userTier === 'pro' && (
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Scan History
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'insights'
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Vendor Insights
          </button>
        </div>
      )}

      {/* Vendor Insights Tab (Pro only) */}
      {activeTab === 'insights' && userTier === 'pro' && (
        <div className="space-y-4">
          {insightsLoading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-20 w-full rounded bg-gray-200" />
                ))}
              </div>
            </div>
          ) : insights.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <svg
                className="mx-auto h-16 w-16 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-gray-600">
                No vendor data yet
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Vendor trends will appear here after you scan multiple invoices from the same vendor.
              </p>
            </div>
          ) : (
            insights.map((vendor) => (
              <div
                key={vendor.vendor_name}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-navy capitalize">
                      {vendor.vendor_name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {vendor.scan_count} invoice{vendor.scan_count !== 1 ? 's' : ''} analyzed
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {vendor.services.slice(0, 5).map((service) => (
                    <div
                      key={service.category}
                      className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-navy truncate">
                            {service.category}
                          </p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                            <span>
                              Latest: {formatCurrency(service.rates[service.rates.length - 1]?.rate || 0)}
                            </span>
                            {service.rates.length >= 2 && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span>
                                  Previous: {formatCurrency(service.rates[service.rates.length - 2]?.rate || 0)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <TrendBadge
                            trend={service.trend}
                            increase={service.latestIncrease}
                          />
                        </div>
                      </div>
                      {service.rates.length >= 2 && (
                        <div className="mt-3">
                          <MiniChart rates={service.rates} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <>
          {scans.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <svg
                className="mx-auto h-16 w-16 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-gray-600">
                No scans yet
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Your invoice scan history will appear here once you analyze your
                first invoice.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-block rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark transition-colors"
              >
                Upload Your First Invoice
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-3 text-left font-medium text-gray-500">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-gray-500">
                          File Name
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-gray-500">
                          Vendor
                        </th>
                        <th className="px-6 py-3 text-right font-medium text-gray-500">
                          Flagged Amount
                        </th>
                        <th className="px-6 py-3 text-center font-medium text-gray-500">
                          Risk
                        </th>
                        <th className="px-6 py-3 text-right font-medium text-gray-500">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {scans.map((scan) => {
                        const result = scan.analysis_result;
                        const vendorName = result?.vendor_name ?? 'Unknown';
                        const flags = result?.flags ?? [];
                        const totalFlagged = flags.reduce(
                          (sum, flag) => sum + (flag.amount ?? 0),
                          0
                        );
                        const riskScore = result?.overall_risk_score;

                        return (
                          <tr
                            key={scan.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                              {formatDate(scan.created_at)}
                            </td>
                            <td className="px-6 py-4 font-medium text-navy max-w-[200px] truncate">
                              {scan.file_name}
                            </td>
                            <td className="px-6 py-4 text-gray-600 max-w-[160px] truncate">
                              {vendorName}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-navy whitespace-nowrap">
                              {totalFlagged > 0
                                ? formatCurrency(totalFlagged)
                                : '--'}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {riskScore ? (
                                <RiskBadge score={riskScore} />
                              ) : (
                                <span className="text-gray-400 text-xs">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link
                                href={`/dashboard/scan/${scan.id}`}
                                className="rounded-md bg-navy/5 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/10 transition-colors"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3">
                {scans.map((scan) => {
                  const result = scan.analysis_result;
                  const vendorName = result?.vendor_name ?? 'Unknown';
                  const flags = result?.flags ?? [];
                  const totalFlagged = flags.reduce(
                    (sum, flag) => sum + (flag.amount ?? 0),
                    0
                  );
                  const riskScore = result?.overall_risk_score;

                  return (
                    <div
                      key={scan.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-navy truncate">
                            {scan.file_name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {vendorName}
                          </p>
                        </div>
                        {riskScore && <RiskBadge score={riskScore} />}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{formatDate(scan.created_at)}</span>
                          {totalFlagged > 0 && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span className="font-medium text-navy">
                                {formatCurrency(totalFlagged)} flagged
                              </span>
                            </>
                          )}
                        </div>
                        <Link
                          href={`/dashboard/scan/${scan.id}`}
                          className="rounded-md bg-navy/5 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/10 transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
