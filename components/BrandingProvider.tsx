'use client';

import { createContext, useContext } from 'react';

interface BrandingContextType {
  brandName: string | null;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  isPartnerBranded: boolean;
}

const defaultBranding: BrandingContextType = {
  brandName: null,
  logoUrl: null,
  primaryColor: '#1B2A4A',
  accentColor: '#2A9D8F',
  isPartnerBranded: false,
};

const BrandingContext = createContext<BrandingContextType>(defaultBranding);

interface BrandingProviderProps {
  children: React.ReactNode;
  branding?: {
    brandName: string | null;
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
  } | null;
}

export function BrandingProvider({ children, branding }: BrandingProviderProps) {
  const value: BrandingContextType = branding
    ? {
        brandName: branding.brandName,
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor || defaultBranding.primaryColor,
        accentColor: branding.accentColor || defaultBranding.accentColor,
        isPartnerBranded: true,
      }
    : defaultBranding;

  return (
    <BrandingContext.Provider value={value}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root {
              --brand-primary: ${value.primaryColor};
              --brand-accent: ${value.accentColor};
            }
          `,
        }}
      />
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextType {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
