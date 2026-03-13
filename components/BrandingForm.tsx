'use client';

import { useState } from 'react';
import type { WhiteLabelConfig } from '@/types';

interface BrandingFormProps {
  config: WhiteLabelConfig;
  onSave: (config: Partial<WhiteLabelConfig>) => void;
}

function isValidHex(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(value);
}

export default function BrandingForm({ config, onSave }: BrandingFormProps) {
  const [brandName, setBrandName] = useState(config.brand_name);
  const [logoUrl, setLogoUrl] = useState(config.logo_url ?? '');
  const [primaryColor, setPrimaryColor] = useState(config.primary_color);
  const [accentColor, setAccentColor] = useState(config.accent_color);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        brand_name: brandName,
        logo_url: logoUrl || null,
        primary_color: primaryColor,
        accent_color: accentColor,
      });
    } finally {
      setSaving(false);
    }
  };

  const previewPrimary = isValidHex(primaryColor) ? primaryColor : '#1B2A4A';
  const previewAccent = isValidHex(accentColor) ? accentColor : '#2A9D8F';

  return (
    <div className="space-y-8">
      {/* Branding Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Brand Name */}
        <div>
          <label
            htmlFor="brandName"
            className="block text-sm font-medium text-navy"
          >
            Brand Name
          </label>
          <input
            id="brandName"
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Your Brand"
            required
            className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-navy shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
          />
        </div>

        {/* Logo URL */}
        <div>
          <label
            htmlFor="logoUrl"
            className="block text-sm font-medium text-navy"
          >
            Logo URL
          </label>
          <input
            id="logoUrl"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-navy shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Recommended size: 200x48px. PNG or SVG with transparent background.
          </p>
        </div>

        {/* Primary Color */}
        <div>
          <label
            htmlFor="primaryColor"
            className="block text-sm font-medium text-navy"
          >
            Primary Color
          </label>
          <div className="mt-1.5 flex items-center gap-3">
            <div
              className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 shadow-sm"
              style={{
                backgroundColor: isValidHex(primaryColor)
                  ? primaryColor
                  : '#ccc',
              }}
            />
            <input
              id="primaryColor"
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#1B2A4A"
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-navy shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
            />
          </div>
          {primaryColor && !isValidHex(primaryColor) && (
            <p className="mt-1 text-xs text-red-500">
              Enter a valid hex color (e.g. #1B2A4A)
            </p>
          )}
        </div>

        {/* Accent Color */}
        <div>
          <label
            htmlFor="accentColor"
            className="block text-sm font-medium text-navy"
          >
            Accent Color
          </label>
          <div className="mt-1.5 flex items-center gap-3">
            <div
              className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 shadow-sm"
              style={{
                backgroundColor: isValidHex(accentColor)
                  ? accentColor
                  : '#ccc',
              }}
            />
            <input
              id="accentColor"
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              placeholder="#2A9D8F"
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-navy shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
            />
          </div>
          {accentColor && !isValidHex(accentColor) && (
            <p className="mt-1 text-xs text-red-500">
              Enter a valid hex color (e.g. #2A9D8F)
            </p>
          )}
        </div>

        {/* Custom Domain (readonly) */}
        <div>
          <label
            htmlFor="customDomain"
            className="block text-sm font-medium text-navy"
          >
            Custom Domain
          </label>
          <input
            id="customDomain"
            type="text"
            value={config.custom_domain ?? ''}
            readOnly
            placeholder="Not configured"
            className="mt-1.5 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 shadow-sm cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500">
            Contact support to configure a custom domain for your white-label
            portal.
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={
              saving ||
              !brandName.trim() ||
              !isValidHex(primaryColor) ||
              !isValidHex(accentColor)
            }
            className="rounded-lg bg-teal px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Branding'}
          </button>
        </div>
      </form>

      {/* Preview Section */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Live Preview
        </h3>
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          {/* Mini Navbar Preview */}
          <div
            className="flex h-14 items-center justify-between px-6"
            style={{ backgroundColor: previewPrimary }}
          >
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-8 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}
              <span className="text-lg font-bold text-white">
                {brandName || 'Your Brand'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/70">Dashboard</span>
              <div
                className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
                style={{ backgroundColor: previewAccent }}
              >
                Get Started
              </div>
            </div>
          </div>
          {/* Mini Content Preview */}
          <div className="bg-gray-50 p-6">
            <div className="mx-auto max-w-md space-y-3 text-center">
              <h4
                className="text-lg font-bold"
                style={{ color: previewPrimary }}
              >
                Invoice Analysis Dashboard
              </h4>
              <p className="text-sm text-gray-500">
                This is how your branded portal will appear to your clients.
              </p>
              <div
                className="inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: previewAccent }}
              >
                Upload Invoice
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
