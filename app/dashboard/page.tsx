'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/providers';
import { supabase } from '@/lib/supabase';
import ScanCounter from '@/components/ScanCounter';
import FileUpload from '@/components/FileUpload';
import RiskBadge from '@/components/RiskBadge';
import type { User as AppUser, Scan, ScanCount, TIER_LIMITS } from '@/types';

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

// Skeleton loader components
function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 ${className ?? ''}`}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome skeleton */}
      <SkeletonBlock className="h-8 w-64" />

      {/* Scan counter skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <SkeletonBlock className="h-5 w-48 mb-3" />
        <SkeletonBlock className="h-2.5 w-full max-w-sm" />
      </div>

      {/* Upload area skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <SkeletonBlock className="h-6 w-40 mb-4" />
        <SkeletonBlock className="h-40 w-full" />
      </div>

      {/* Recent scans skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <SkeletonBlock className="h-6 w-36 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<AppUser | null>(null);
  const [scanCount, setScanCount] = useState<ScanCount | null>(null);
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    setDataLoading(true);
    setError(null);

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw new Error('Failed to load profile');
      setProfile(profileData as AppUser);

      // Fetch scan count for current billing period
      const { data: scanCountData, error: scanCountError } = await supabase
        .from('scan_counts')
        .select('*')
        .eq('user_id', user.id)
        .order('billing_period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scanCountError) throw new Error('Failed to load scan counts');

      if (scanCountData) {
        setScanCount(scanCountData as ScanCount);
      } else {
        // No scan count record yet - default to 0 used
        const tierLimits: Record<string, number> = {
          free: 2,
          starter: 50,
          pro: 150,
        };
        setScanCount({
          user_id: user.id,
          billing_period_start: new Date().toISOString(),
          billing_period_end: new Date().toISOString(),
          count: 0,
          limit: tierLimits[profileData?.subscription_tier ?? 'free'] ?? 2,
        });
      }

      // Fetch recent scans
      const { data: scansData, error: scansError } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (scansError) throw new Error('Failed to load recent scans');
      setRecentScans((scansData as Scan[]) ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
    }
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, fetchDashboardData, router]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setAnalyzeError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Analysis failed (${response.status})`
        );
      }

      const data = await response.json();
      const scanId = data.scanId || data.scan_id || data.id;

      if (scanId) {
        router.push(`/dashboard/scan/${scanId}`);
      } else {
        throw new Error('No scan ID returned from analysis');
      }
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : 'Analysis failed. Please try again.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // Show loading while auth is resolving or data is loading
  if (authLoading || (user && dataLoading)) {
    return <DashboardSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
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
            Something went wrong
          </h3>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const atLimit = scanCount ? scanCount.count >= scanCount.limit : false;
  const isFree = profile.subscription_tier === 'free';

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div>
        <h1 className="text-2xl font-bold text-navy">
          Welcome back, {profile.name || user.email?.split('@')[0] || 'there'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload an invoice to get started with your analysis.
        </p>
      </div>

      {/* Scan Counter */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Monthly Usage
        </h2>
        <ScanCounter
          used={scanCount?.count ?? 0}
          limit={scanCount?.limit ?? 2}
        />
      </div>

      {/* Free Tier Upgrade Banner */}
      {isFree && (
        <div className="rounded-xl border border-teal/20 bg-teal/5 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-navy">
                Unlock more with a paid plan
              </p>
              <p className="mt-0.5 text-sm text-gray-600">
                Upgrade to unlock dispute letters and market benchmarking
              </p>
            </div>
            <Link
              href="/dashboard/settings"
              className="shrink-0 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark transition-colors text-center"
            >
              View Plans
            </Link>
          </div>
        </div>
      )}

      {/* File Upload Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">
          Upload Invoice
        </h2>
        <FileUpload
          onFileSelect={handleFileSelect}
          disabled={atLimit}
          isUploading={analyzing}
        />

        {/* Analyze Button */}
        {selectedFile && !analyzing && !atLimit && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleAnalyze}
              className="rounded-lg bg-teal px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark transition-colors cursor-pointer"
            >
              Analyze Invoice
            </button>
            <span className="text-sm text-gray-500">
              {selectedFile.name}
            </span>
          </div>
        )}

        {/* Analyze Error */}
        {analyzeError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{analyzeError}</p>
          </div>
        )}
      </div>

      {/* Recent Scans */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">Recent Scans</h2>

        {recentScans.length === 0 ? (
          <div className="py-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <p className="mt-3 text-sm font-medium text-gray-500">
              No scans yet
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Upload your first invoice above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-gray-100">
            {recentScans.map((scan) => {
              const flags = scan.analysis_result?.flags ?? [];
              const riskScore = scan.analysis_result?.overall_risk_score;

              return (
                <div
                  key={scan.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">
                      {scan.file_name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>{formatDate(scan.created_at)}</span>
                      <span className="text-gray-300">|</span>
                      <span>
                        {flags.length} flag{flags.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {riskScore && <RiskBadge score={riskScore} />}
                    <Link
                      href={`/dashboard/scan/${scan.id}`}
                      className="shrink-0 rounded-md bg-navy/5 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/10 transition-colors"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Link to full history */}
        {recentScans.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <Link
              href="/dashboard/history"
              className="text-sm font-medium text-teal hover:text-teal-dark transition-colors"
            >
              View all scans &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
