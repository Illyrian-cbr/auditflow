'use client';

import { useEffect, useRef } from 'react';
import type { IntegrationProvider } from '@/types';

interface ImportInvoiceModalProps {
  provider: IntegrationProvider;
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_NAMES: Record<IntegrationProvider, string> = {
  quickbooks: 'QuickBooks',
  xero: 'Xero',
};

export default function ImportInvoiceModal({
  provider,
  isOpen,
  onClose,
}: ImportInvoiceModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const providerName = PROVIDER_NAMES[provider];

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs font-bold ${
                provider === 'quickbooks' ? 'bg-green-600' : 'bg-blue-600'
              }`}
            >
              {provider === 'quickbooks' ? 'QB' : 'X'}
            </div>
            <h2 className="text-lg font-semibold text-navy">
              Import from {providerName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close modal"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
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

        {/* Body */}
        <div className="px-6 py-8">
          <div className="flex flex-col items-center text-center">
            {/* Placeholder illustration */}
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>

            <h3 className="text-base font-medium text-navy">
              Coming Soon
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Invoice import will be available once the {providerName} integration
              is fully configured. This requires a {providerName} developer account
              and API credentials to be set up.
            </p>

            {/* What will be available */}
            <div className="mt-6 w-full rounded-lg bg-cream p-4 text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                When available, you will be able to:
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                  Browse and select invoices from {providerName}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                  Import invoices directly for AI audit analysis
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                  Automatically detect overcharges and hidden fees
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy/90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
