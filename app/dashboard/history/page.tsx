'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/providers';
import { supabase } from '@/lib/supabase';
import RiskBadge from '@/components/RiskBadge';
import type { Scan } from '@/types';

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

  useEffect(() => {
    if (!authLoading && user) {
      fetchScans();
    }
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, fetchScans, router]);

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
    </div>
  );
}
