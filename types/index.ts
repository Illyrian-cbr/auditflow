export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'personal' | 'team_starter' | 'team_pro';

export interface User {
  id: string;
  email: string;
  name: string | null;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  team_id: string | null;
  partner_id: string | null;
  created_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
  team_id: string | null;
  file_name: string;
  file_url: string | null;
  analysis_result: AnalysisResult | null;
  tier_used: 'tier1' | 'tier2';
  created_at: string;
}

export interface ScanCount {
  user_id: string;
  billing_period_start: string;
  billing_period_end: string;
  count: number;
  limit: number;
}

export interface LineItem {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  total: number;
}

export interface Flag {
  type: 'vague_charge' | 'duplicate' | 'phantom_fee' | 'math_error' | 'formatting_trick' | 'overpriced';
  description: string;
  severity: 'low' | 'medium' | 'high';
  amount: number | null;
}

export interface MathCheck {
  status: 'pass' | 'fail';
  expected_total: number | null;
  actual_total: number | null;
  details: string;
}

export interface Benchmark {
  service_description: string;
  invoiced_rate: number;
  market_average: number;
  difference_percent: number;
  source: string;
}

export interface AnalysisResult {
  vendor_name: string;
  invoice_date: string;
  invoice_total: number;
  line_items: LineItem[];
  flags: Flag[];
  math_check: MathCheck;
  overall_risk_score: 'low' | 'medium' | 'high';
  // Tier 2 fields (Pro only)
  benchmarks?: Benchmark[];
  total_potential_savings?: number;
  benchmark_summary?: string;
}

export const TIER_LIMITS: Record<SubscriptionTier, number> = {
  free: 2,
  starter: 50,
  pro: 150,
  personal: 10,
  team_starter: 200,
  team_pro: 500,
};

export const TIER_PRICES: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 29,
  pro: 59,
  personal: 9,
  team_starter: 99,
  team_pro: 199,
};

export interface VendorTrend {
  id: string;
  user_id: string;
  vendor_name_normalized: string;
  service_category: string | null;
  rate: number;
  invoice_date: string | null;
  scan_id: string | null;
  created_at: string;
}

export interface PricingBenchmarkCache {
  id: string;
  service_category: string;
  service_description: string;
  region: string | null;
  zip_code: string | null;
  average_rate: number;
  rate_range_low: number | null;
  rate_range_high: number | null;
  source: string | null;
  sample_count: number;
  last_updated: string;
}

// Phase 3: Team types
export type TeamRole = 'owner' | 'admin' | 'member';

export interface Team {
  id: string;
  name: string;
  owner_user_id: string;
  stripe_customer_id: string | null;
  subscription_tier: 'team_starter' | 'team_pro';
  max_members: number;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  invited_at: string;
  joined_at: string | null;
  // Joined fields
  email?: string;
  name?: string | null;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  email: string;
  role: TeamRole;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

// Phase 3: API Access types
export interface ApiKey {
  id: string;
  user_id: string;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

// Phase 3: Integration types
export type IntegrationProvider = 'quickbooks' | 'xero';

export interface Integration {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  realm_id?: string; // QuickBooks company ID
  tenant_id?: string; // Xero organization ID
  is_active: boolean;
  created_at: string;
}

// Phase 3: White-label types
export interface WhiteLabelConfig {
  id: string;
  partner_user_id: string;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  custom_domain: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PartnerReferral {
  id: string;
  partner_id: string;
  client_user_id: string;
  scan_id: string | null;
  revenue_amount: number;
  revenue_share_amount: number;
  created_at: string;
}
