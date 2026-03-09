import { createServerClient } from './supabase';
import type { AnalysisResult } from '@/types';

function normalizeVendorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract vendor data from analysis result and store in vendor_trends table.
 */
export async function trackVendorTrend(
  userId: string,
  scanId: string,
  result: AnalysisResult
): Promise<void> {
  const supabase = createServerClient();
  const vendorNormalized = normalizeVendorName(result.vendor_name);

  if (!vendorNormalized) return;

  // Extract key rates from line items (take the top items by total)
  const significantItems = result.line_items
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const records = significantItems.map((item) => ({
    user_id: userId,
    vendor_name_normalized: vendorNormalized,
    service_category: item.description.substring(0, 100),
    rate: item.total,
    invoice_date: result.invoice_date,
    scan_id: scanId,
  }));

  if (records.length > 0) {
    await supabase.from('vendor_trends').insert(records);
  }
}

export interface VendorInsight {
  vendor_name: string;
  scan_count: number;
  services: {
    category: string;
    rates: { rate: number; date: string; scan_id: string }[];
    trend: 'increasing' | 'decreasing' | 'stable';
    latestIncrease?: number; // percentage increase from previous invoice
  }[];
}

/**
 * Get vendor insights for a user - aggregated trend data.
 */
export async function getVendorInsights(userId: string): Promise<VendorInsight[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('vendor_trends')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) return [];

  // Group by vendor
  const vendorMap = new Map<string, typeof data>();
  for (const row of data) {
    const key = row.vendor_name_normalized;
    if (!vendorMap.has(key)) vendorMap.set(key, []);
    vendorMap.get(key)!.push(row);
  }

  const insights: VendorInsight[] = [];

  for (const [vendorName, rows] of vendorMap) {
    // Group by service category within this vendor
    const serviceMap = new Map<string, typeof rows>();
    for (const row of rows) {
      const cat = row.service_category || 'General';
      if (!serviceMap.has(cat)) serviceMap.set(cat, []);
      serviceMap.get(cat)!.push(row);
    }

    const services: VendorInsight['services'] = [];
    for (const [category, serviceRows] of serviceMap) {
      const rates = serviceRows.map((r) => ({
        rate: parseFloat(r.rate),
        date: r.invoice_date || r.created_at,
        scan_id: r.scan_id || '',
      }));

      // Determine trend
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      let latestIncrease: number | undefined;

      if (rates.length >= 2) {
        const last = rates[rates.length - 1].rate;
        const prev = rates[rates.length - 2].rate;
        const change = ((last - prev) / prev) * 100;

        if (change > 5) {
          trend = 'increasing';
          latestIncrease = change;
        } else if (change < -5) {
          trend = 'decreasing';
        }
      }

      services.push({ category, rates, trend, latestIncrease });
    }

    // Count unique scan_ids
    const uniqueScans = new Set(rows.map((r) => r.scan_id).filter(Boolean));

    insights.push({
      vendor_name: vendorName,
      scan_count: uniqueScans.size,
      services,
    });
  }

  // Sort by scan count descending
  insights.sort((a, b) => b.scan_count - a.scan_count);

  return insights;
}
