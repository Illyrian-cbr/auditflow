export type SubscriptionTier = 'free' | 'starter' | 'pro';

export interface User {
  id: string;
  email: string;
  name: string | null;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  created_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
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
};

export const TIER_PRICES: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 29,
  pro: 59,
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
