-- Auditflow Database Schema
-- Run this in the Supabase SQL editor to set up your database

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro')),
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scans table
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  analysis_result JSONB,
  tier_used TEXT NOT NULL DEFAULT 'tier1' CHECK (tier_used IN ('tier1', 'tier2')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scan counts table (enforces hard caps)
CREATE TABLE IF NOT EXISTS scan_counts (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 0,
  "limit" INT NOT NULL DEFAULT 2,
  PRIMARY KEY (user_id, billing_period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_counts_user_period ON scan_counts(user_id, billing_period_start, billing_period_end);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_counts ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Scans policies
CREATE POLICY "Users can read own scans" ON scans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans" ON scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Scan counts policies
CREATE POLICY "Users can read own scan counts" ON scan_counts
  FOR SELECT USING (auth.uid() = user_id);

-- Service role bypass for server-side operations (webhooks, API routes)
-- The service role key bypasses RLS automatically

-- Function to create a user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Phase 2: Pricing Benchmarks, Vendor Trends, Email Preferences
-- ============================================================

-- Pricing benchmarks cache (Phase 2)
CREATE TABLE IF NOT EXISTS pricing_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_category TEXT NOT NULL,
  service_description TEXT NOT NULL,
  region TEXT,
  zip_code TEXT,
  average_rate NUMERIC NOT NULL,
  rate_range_low NUMERIC,
  rate_range_high NUMERIC,
  source TEXT,
  sample_count INT NOT NULL DEFAULT 1,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_service ON pricing_benchmarks(service_category, service_description);
CREATE INDEX IF NOT EXISTS idx_benchmarks_region ON pricing_benchmarks(region);
CREATE INDEX IF NOT EXISTS idx_benchmarks_updated ON pricing_benchmarks(last_updated);

-- No RLS needed on pricing_benchmarks - it's shared data accessed server-side only

-- Vendor trend tracking (Phase 2 - Pro)
CREATE TABLE IF NOT EXISTS vendor_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_name_normalized TEXT NOT NULL,
  service_category TEXT,
  rate NUMERIC NOT NULL,
  invoice_date TEXT,
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_trends_user ON vendor_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_trends_vendor ON vendor_trends(user_id, vendor_name_normalized);

ALTER TABLE vendor_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own vendor trends" ON vendor_trends
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vendor trends" ON vendor_trends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add email_notifications column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true;
