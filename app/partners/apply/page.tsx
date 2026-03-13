'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';

export default function PartnerApplyPage() {
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [expectedClients, setExpectedClients] = useState('1-10');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/partners/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, websiteUrl, expectedClients, message }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Application failed');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-cream py-20 px-6">
        <div className="max-w-lg mx-auto">
          {submitted ? (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-navy mb-2">Application Submitted!</h2>
              <p className="text-gray-600">{"We'll review within 48 hours and reach out to the email on your account."}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-10">
              <h1 className="text-3xl font-bold text-navy mb-2">Apply to Partner Program</h1>
              <p className="text-gray-600 mb-8">Join our white-label program and earn 20% revenue share.</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">
                    Brand Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Acme Invoice Audit"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-1">
                    Website URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://acme.com"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-1">
                    Expected Client Count
                  </label>
                  <select
                    value={expectedClients}
                    onChange={(e) => setExpectedClients(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                  >
                    <option value="1-10">1–10 clients</option>
                    <option value="11-50">11–50 clients</option>
                    <option value="51-200">51–200 clients</option>
                    <option value="200+">200+ clients</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-1">
                    Message (optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Tell us about your business and how you plan to use Auditflow..."
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !brandName || !websiteUrl}
                  className="w-full bg-teal text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting…' : 'Submit Application'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
