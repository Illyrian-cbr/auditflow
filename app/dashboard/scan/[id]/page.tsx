'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/providers';
import { supabase } from '@/lib/supabase';
import AnalysisView from '@/components/AnalysisView';
import type { Scan, User as AppUser } from '@/types';

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back link skeleton */}
      <div className="animate-pulse h-5 w-36 rounded bg-gray-200" />

      {/* Title skeleton */}
      <div className="animate-pulse h-8 w-72 rounded bg-gray-200" />

      {/* Summary section skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="animate-pulse h-6 w-40 rounded bg-gray-200 mb-4" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="animate-pulse h-3 w-20 rounded bg-gray-200 mb-2" />
              <div className="animate-pulse h-5 w-32 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      {/* Line items skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="animate-pulse h-6 w-32 rounded bg-gray-200 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse h-10 w-full rounded bg-gray-200" />
          ))}
        </div>
      </div>

      {/* Flags skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="animate-pulse h-6 w-24 rounded bg-gray-200 mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-20 w-full rounded bg-gray-200" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ScanResultPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const id = params.id as string;

  const [scan, setScan] = useState<Scan | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScan = useCallback(async () => {
    if (!user || !id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch the scan, ensuring it belongs to the current user
      const { data: scanData, error: scanError } = await supabase
        .from('scans')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (scanError || !scanData) {
        throw new Error('Scan not found or you do not have permission to view it.');
      }

      setScan(scanData as Scan);

      // Fetch user profile for tier info
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Failed to load user profile.');
      }

      setProfile(profileData as AppUser);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchScan();
    }
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, fetchScan, router]);

  // Auth loading or data loading
  if (authLoading || (user && loading)) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal hover:text-teal-dark transition-colors"
        >
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
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to Dashboard
        </Link>

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
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-red-800">
              Scan Not Found
            </h3>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              onClick={fetchScan}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!scan || !scan.analysis_result || !profile) return null;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal hover:text-teal-dark transition-colors"
      >
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
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        Back to Dashboard
      </Link>

      {/* Scan Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">
          Scan Results
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {scan.file_name} &middot; Scanned{' '}
          {new Date(scan.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Analysis Results */}
      <AnalysisView
        result={scan.analysis_result}
        scanId={scan.id}
        userTier={profile.subscription_tier}
        fileName={scan.file_name}
      />
    </div>
  );
}
