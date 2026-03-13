'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import IntegrationCard from '@/components/IntegrationCard';
import ImportInvoiceModal from '@/components/ImportInvoiceModal';
import type { Integration, IntegrationProvider } from '@/types';

export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsContent />
    </Suspense>
  );
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal state
  const [importModalProvider, setImportModalProvider] = useState<IntegrationProvider | null>(null);

  // Success/error banners from URL params (after OAuth redirects)
  const connectedProvider = searchParams.get('connected');
  const urlError = searchParams.get('error');

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Please sign in to manage integrations.');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id);

      if (fetchError) {
        throw fetchError;
      }

      setIntegrations(data ?? []);
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
      setError('Failed to load integrations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const getIntegration = (provider: IntegrationProvider): Integration | undefined => {
    return integrations.find((i) => i.provider === provider && i.is_active);
  };

  const handleConnect = async (provider: IntegrationProvider) => {
    try {
      setActionLoading(provider);
      setError(null);

      const response = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate connection');
      }

      // Redirect user to the provider's OAuth consent page
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (provider: IntegrationProvider) => {
    try {
      setActionLoading(provider);
      setError(null);

      const response = await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect');
      }

      // Refresh the integrations list
      await fetchIntegrations();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Disconnection failed';
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleImport = (provider: IntegrationProvider) => {
    setImportModalProvider(provider);
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Connect your accounting software to import invoices directly into AuditFlow for analysis.
        </p>
      </div>

      {/* Success banner after OAuth redirect */}
      {connectedProvider && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-green-800">
              {connectedProvider === 'quickbooks' ? 'QuickBooks' : 'Xero'} connected
              successfully.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {(error || urlError) && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-red-600"
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
            <p className="text-sm font-medium text-red-800">
              {error || decodeURIComponent(urlError || '')}
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-gray-400">
            <svg
              className="h-5 w-5 animate-spin"
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm">Loading integrations...</span>
          </div>
        </div>
      ) : (
        /* Integration cards grid */
        <div className="grid gap-6 sm:grid-cols-2">
          <IntegrationCard
            provider="quickbooks"
            isConnected={!!getIntegration('quickbooks')}
            onConnect={() => handleConnect('quickbooks')}
            onDisconnect={() => handleDisconnect('quickbooks')}
            onImport={() => handleImport('quickbooks')}
            isLoading={actionLoading === 'quickbooks'}
          />
          <IntegrationCard
            provider="xero"
            isConnected={!!getIntegration('xero')}
            onConnect={() => handleConnect('xero')}
            onDisconnect={() => handleDisconnect('xero')}
            onImport={() => handleImport('xero')}
            isLoading={actionLoading === 'xero'}
          />
        </div>
      )}

      {/* Import Invoice Modal */}
      <ImportInvoiceModal
        provider={importModalProvider ?? 'quickbooks'}
        isOpen={importModalProvider !== null}
        onClose={() => setImportModalProvider(null)}
      />
    </div>
  );
}
