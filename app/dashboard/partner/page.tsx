'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PartnerDashboard from '@/components/PartnerDashboard';

interface Client {
  userId: string;
  email: string;
  scansCount: number;
  joinedAt: string;
}

interface RevenueData {
  totalRevenue: number;
  totalShare: number;
  monthlyBreakdown: Array<{ month: string; revenue: number; share: number }>;
}

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Check if user has a partner config first
        const configRes = await fetch('/api/partners/config');
        if (configRes.status === 404) {
          router.push('/partners/apply');
          return;
        }
        const config = await configRes.json();
        if (!config || configRes.status !== 200) {
          router.push('/partners/apply');
          return;
        }

        // Fetch clients and revenue in parallel
        const [clientsRes, revenueRes] = await Promise.all([
          fetch('/api/partners/clients'),
          fetch('/api/partners/revenue'),
        ]);

        if (!clientsRes.ok || !revenueRes.ok) {
          throw new Error('Failed to load partner data');
        }

        const [clientsData, revenueData] = await Promise.all([
          clientsRes.json(),
          revenueRes.json(),
        ]);

        setClients(clientsData.clients ?? []);
        setRevenue(revenueData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8 animate-pulse" />
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-teal text-white px-4 py-2 rounded-lg hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-navy">Partner Dashboard</h1>
          <Link
            href="/dashboard/partner/branding"
            className="bg-teal text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            Configure Branding
          </Link>
        </div>

        <PartnerDashboard clients={clients} revenue={revenue ?? { totalRevenue: 0, totalShare: 0, monthlyBreakdown: [] }} />
      </div>
    </div>
  );
}
