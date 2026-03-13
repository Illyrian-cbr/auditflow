'use client';

import type { IntegrationProvider } from '@/types';

interface IntegrationCardProps {
  provider: IntegrationProvider;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onImport?: () => void;
  isLoading?: boolean;
}

const PROVIDER_CONFIG: Record<
  IntegrationProvider,
  {
    name: string;
    description: string;
    accentColor: string;
    accentBg: string;
    accentBorder: string;
    accentText: string;
    iconLetter: string;
    iconBg: string;
  }
> = {
  quickbooks: {
    name: 'QuickBooks',
    description:
      'Import invoices from QuickBooks Online. Syncs vendor bills, expenses, and payment records for automated audit analysis.',
    accentColor: '#2CA01C',
    accentBg: 'bg-green-50',
    accentBorder: 'border-green-200',
    accentText: 'text-green-700',
    iconLetter: 'QB',
    iconBg: 'bg-green-600',
  },
  xero: {
    name: 'Xero',
    description:
      'Import invoices from Xero. Syncs accounts payable invoices and bill data for automated audit analysis.',
    accentColor: '#13B5EA',
    accentBg: 'bg-blue-50',
    accentBorder: 'border-blue-200',
    accentText: 'text-blue-700',
    iconLetter: 'X',
    iconBg: 'bg-blue-600',
  },
};

export default function IntegrationCard({
  provider,
  isConnected,
  onConnect,
  onDisconnect,
  onImport,
  isLoading = false,
}: IntegrationCardProps) {
  const config = PROVIDER_CONFIG[provider];

  return (
    <div
      className={`rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${
        isConnected ? config.accentBorder : 'border-gray-200'
      }`}
    >
      {/* Header: icon + name + status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Provider icon placeholder */}
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg text-white font-bold text-sm ${config.iconBg}`}
          >
            {config.iconLetter}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-navy">{config.name}</h3>
            {isConnected ? (
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium ${config.accentText}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Connected
              </span>
            ) : (
              <span className="text-xs font-medium text-gray-400">
                Not connected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="mt-4 text-sm leading-relaxed text-gray-500">
        {config.description}
      </p>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {isConnected ? (
          <>
            {/* Import Invoices button */}
            {onImport && (
              <button
                type="button"
                onClick={onImport}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal/90 disabled:opacity-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                Import Invoices
              </button>
            )}

            {/* Disconnect button */}
            <button
              type="button"
              onClick={onDisconnect}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
            >
              {isLoading ? (
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.181 8.68a4.503 4.503 0 011.903 6.405m-9.768-2.782L3.56 14.06a4.5 4.5 0 006.364 6.365l.768-.768m7.5-7.5l.768-.768a4.5 4.5 0 00-6.364-6.364l-1.757 1.757m0 0l9.07 9.07"
                  />
                </svg>
              )}
              Disconnect
            </button>
          </>
        ) : (
          /* Connect button */
          <button
            type="button"
            onClick={onConnect}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
          >
            {isLoading ? (
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07l-.768.768a4.5 4.5 0 00.475 6.818"
                />
              </svg>
            )}
            {isLoading ? 'Connecting...' : `Connect ${config.name}`}
          </button>
        )}
      </div>
    </div>
  );
}
