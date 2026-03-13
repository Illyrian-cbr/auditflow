'use client';

import { useEffect, useState } from 'react';
import BrandingForm from '@/components/BrandingForm';
import type { WhiteLabelConfig } from '@/types';

export default function PartnerBrandingPage() {
  const [config, setConfig] = useState<WhiteLabelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/partners/config')
      .then((r) => r.json())
      .then((data) => {
        setConfig(data.config ?? data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  async function handleSave(updates: Partial<WhiteLabelConfig>) {
    const res = await fetch('/api/partners/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Failed to save branding');
    }
    const data = await res.json();
    setConfig(data.config ?? data);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8 animate-pulse" />
          <div className="bg-white rounded-xl shadow-sm p-8 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="mb-6">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-red-600">{error ?? 'No branding configuration found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-navy mb-8">Branding Configuration</h1>
        <BrandingForm config={config} onSave={handleSave} />
      </div>
    </div>
  );
}
