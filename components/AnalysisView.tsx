'use client';

import { useState, useCallback } from 'react';
import RiskBadge from '@/components/RiskBadge';
import SavingsReport from '@/components/SavingsReport';
import type { AnalysisResult, Flag } from '@/types';

interface AnalysisViewProps {
  result: AnalysisResult;
  scanId: string;
  userTier: string;
  fileName?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function SeverityBadge({ severity }: { severity: Flag['severity'] }) {
  const config = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${config[severity]}`}
    >
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

function FlagTypeIcon({ type }: { type: Flag['type'] }) {
  const icons: Record<Flag['type'], { icon: string; label: string }> = {
    vague_charge: { icon: '?', label: 'Vague Charge' },
    duplicate: { icon: '2x', label: 'Duplicate' },
    phantom_fee: { icon: '!', label: 'Phantom Fee' },
    math_error: { icon: '#', label: 'Math Error' },
    formatting_trick: { icon: 'Aa', label: 'Formatting Trick' },
    overpriced: { icon: '$', label: 'Overpriced' },
  };

  const { icon, label } = icons[type];

  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-navy/10 text-xs font-bold text-navy"
      title={label}
    >
      {icon}
    </span>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-white"
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
  );
}

export default function AnalysisView({
  result,
  scanId,
  userTier,
  fileName = 'invoice',
}: AnalysisViewProps) {
  const [disputeLetter, setDisputeLetter] = useState<string>('');
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const canGenerateLetter = userTier === 'starter' || userTier === 'pro';
  const showBenchmarks =
    userTier === 'pro' && result.benchmarks && result.benchmarks.length > 0;

  const handleGenerateDisputeLetter = useCallback(async () => {
    setLetterLoading(true);
    setLetterError(null);

    try {
      const response = await fetch('/api/dispute-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to generate dispute letter (${response.status})`
        );
      }

      const data = await response.json();
      setDisputeLetter(data.letter || data.dispute_letter || '');
    } catch (err) {
      setLetterError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setLetterLoading(false);
    }
  }, [scanId]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(disputeLetter);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = disputeLetter;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [disputeLetter]);

  const handleDownloadPDF = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download the letter as PDF.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dispute Letter - ${result.vendor_name}</title>
          <style>
            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              max-width: 700px;
              margin: 40px auto;
              padding: 20px;
              color: #1a1a1a;
              line-height: 1.7;
              font-size: 14px;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: inherit;
              font-size: inherit;
              line-height: inherit;
            }
            @media print {
              body { margin: 0; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <pre>${disputeLetter.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  }, [disputeLetter, result.vendor_name]);

  return (
    <div className="space-y-6">
      {/* Section 1: Invoice Summary */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">
          Invoice Summary
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Vendor
            </dt>
            <dd className="mt-1 text-sm font-semibold text-navy">
              {result.vendor_name}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Invoice Date
            </dt>
            <dd className="mt-1 text-sm font-semibold text-navy">
              {result.invoice_date}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Total
            </dt>
            <dd className="mt-1 text-sm font-semibold text-navy">
              {formatCurrency(result.invoice_total)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Section 2: Line Items */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">Line Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 pr-4 text-left font-medium text-gray-500">
                  Description
                </th>
                <th className="pb-3 px-4 text-right font-medium text-gray-500">
                  Qty
                </th>
                <th className="pb-3 px-4 text-right font-medium text-gray-500">
                  Unit Price
                </th>
                <th className="pb-3 pl-4 text-right font-medium text-gray-500">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.line_items.map((item, index) => {
                // Determine if this line item is flagged
                const relatedFlags = result.flags.filter((flag) =>
                  flag.description
                    .toLowerCase()
                    .includes(item.description.toLowerCase().slice(0, 20))
                );
                const highestSeverity = relatedFlags.reduce<
                  Flag['severity'] | null
                >((max, flag) => {
                  if (!max) return flag.severity;
                  const order = { low: 0, medium: 1, high: 2 };
                  return order[flag.severity] > order[max]
                    ? flag.severity
                    : max;
                }, null);

                let rowClassName = '';
                if (highestSeverity === 'high') {
                  rowClassName = 'bg-red-50';
                } else if (highestSeverity === 'medium') {
                  rowClassName = 'bg-yellow-50';
                } else if (highestSeverity === null) {
                  rowClassName = '';
                }

                return (
                  <tr key={index} className={rowClassName}>
                    <td className="py-3 pr-4 text-navy">
                      {item.description}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {item.quantity ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {item.unit_price != null
                        ? formatCurrency(item.unit_price)
                        : '-'}
                    </td>
                    <td className="py-3 pl-4 text-right font-medium text-navy">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Flags */}
      {result.flags.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">
            Flags ({result.flags.length})
          </h2>
          <ul className="space-y-3">
            {result.flags.map((flag, index) => (
              <li
                key={index}
                className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <FlagTypeIcon type={flag.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <SeverityBadge severity={flag.severity} />
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {flag.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-navy">{flag.description}</p>
                </div>
                {flag.amount != null && (
                  <span className="shrink-0 text-sm font-semibold text-navy">
                    {formatCurrency(flag.amount)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Section 4: Math Check */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">Math Check</h2>
        <div className="flex items-start gap-3">
          {result.math_check.status === 'pass' ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-navy">
              {result.math_check.status === 'pass'
                ? 'Math checks out'
                : 'Math discrepancy detected'}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {result.math_check.details}
            </p>
            {result.math_check.expected_total != null &&
              result.math_check.actual_total != null && (
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span>
                    Expected: {formatCurrency(result.math_check.expected_total)}
                  </span>
                  <span>
                    Actual: {formatCurrency(result.math_check.actual_total)}
                  </span>
                </div>
              )}
          </div>
        </div>
      </section>

      {/* Section 5: Risk Score */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">
          Overall Risk Score
        </h2>
        <RiskBadge score={result.overall_risk_score} />
      </section>

      {/* Section 6: Benchmarks (Pro only) */}
      {showBenchmarks && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">
            Market Rate Benchmarks
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 pr-4 text-left font-medium text-gray-500">
                    Service
                  </th>
                  <th className="pb-3 px-4 text-right font-medium text-gray-500">
                    Invoiced Rate
                  </th>
                  <th className="pb-3 px-4 text-right font-medium text-gray-500">
                    Market Avg
                  </th>
                  <th className="pb-3 px-4 text-right font-medium text-gray-500">
                    Difference
                  </th>
                  <th className="pb-3 pl-4 text-left font-medium text-gray-500">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.benchmarks!.map((benchmark, index) => {
                  const isOverpriced = benchmark.difference_percent > 20;
                  return (
                    <tr
                      key={index}
                      className={isOverpriced ? 'bg-red-50' : ''}
                    >
                      <td className="py-3 pr-4 text-navy">
                        {benchmark.service_description}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {formatCurrency(benchmark.invoiced_rate)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {formatCurrency(benchmark.market_average)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium ${
                          isOverpriced ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {benchmark.difference_percent > 0 ? '+' : ''}
                        {benchmark.difference_percent.toFixed(1)}%
                      </td>
                      <td className="py-3 pl-4 text-xs text-gray-500">
                        {benchmark.source}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {result.total_potential_savings != null && (
            <div className="mt-4 rounded-lg bg-teal/10 border border-teal/20 p-4">
              <p className="text-sm text-navy">
                <span className="font-medium">Total Potential Savings: </span>
                <span className="text-lg font-bold text-teal">
                  {formatCurrency(result.total_potential_savings)}
                </span>
              </p>
              {result.benchmark_summary && (
                <p className="mt-1 text-xs text-gray-600">
                  {result.benchmark_summary}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Section 7: Savings Report PDF (Pro only) */}
      {userTier === 'pro' && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">
            Savings Report
          </h2>
          <p className="mb-3 text-sm text-gray-600">
            Download a professional PDF report with your analysis results, flagged items, benchmark comparisons, and recommendations.
          </p>
          <SavingsReport
            result={result}
            scanId={scanId}
            fileName={fileName}
            userTier={userTier}
          />
        </section>
      )}

      {/* Section 8: Dispute Letter */}
      {canGenerateLetter && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">
            Dispute Letter
          </h2>

          {!disputeLetter ? (
            <div>
              <button
                onClick={handleGenerateDisputeLetter}
                disabled={letterLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {letterLoading ? (
                  <>
                    <Spinner />
                    Generating...
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
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                    Generate Dispute Letter
                  </>
                )}
              </button>
              {letterError && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {letterError}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={disputeLetter}
                onChange={(e) => setDisputeLetter(e.target.value)}
                rows={16}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm text-navy font-mono leading-relaxed focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none resize-y"
                aria-label="Dispute letter content"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleCopyToClipboard}
                  className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition-colors cursor-pointer"
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
                      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                    />
                  </svg>
                  {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center gap-2 rounded-lg border border-navy bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:bg-gray-50 transition-colors cursor-pointer"
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
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  Download as PDF
                </button>
                <button
                  onClick={() => {
                    setDisputeLetter('');
                    setLetterError(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
