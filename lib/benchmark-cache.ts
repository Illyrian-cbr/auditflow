import { createServerClient } from './supabase';

interface CachedBenchmark {
  service_description: string;
  average_rate: number;
  rate_range_low: number | null;
  rate_range_high: number | null;
  source: string;
  sample_count: number;
}

/**
 * Look up cached benchmark for a service description + region.
 * Returns the cached data if it was updated within the last 30 days
 * and has a sample_count >= 3.
 */
export async function getCachedBenchmark(
  serviceDescription: string,
  region?: string
): Promise<CachedBenchmark | null> {
  const supabase = createServerClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let query = supabase
    .from('pricing_benchmarks')
    .select('*')
    .ilike('service_description', `%${serviceDescription}%`)
    .gte('last_updated', thirtyDaysAgo.toISOString())
    .gte('sample_count', 3)
    .order('sample_count', { ascending: false })
    .limit(1);

  if (region) {
    query = query.ilike('region', `%${region}%`);
  }

  const { data } = await query.maybeSingle();

  if (!data) return null;

  return {
    service_description: data.service_description,
    average_rate: parseFloat(data.average_rate),
    rate_range_low: data.rate_range_low ? parseFloat(data.rate_range_low) : null,
    rate_range_high: data.rate_range_high ? parseFloat(data.rate_range_high) : null,
    source: data.source || 'Cached benchmark data',
    sample_count: data.sample_count,
  };
}

/**
 * Upsert a benchmark into the cache.
 * If an existing record matches service + region, update it with a running average
 * and increment sample_count. Otherwise insert a new record.
 */
export async function upsertBenchmark(params: {
  serviceCategory: string;
  serviceDescription: string;
  region?: string;
  rate: number;
  source?: string;
}): Promise<void> {
  const supabase = createServerClient();

  // Look for existing benchmark
  let query = supabase
    .from('pricing_benchmarks')
    .select('*')
    .ilike('service_description', `%${params.serviceDescription}%`)
    .limit(1);

  if (params.region) {
    query = query.ilike('region', `%${params.region}%`);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    // Update with running average
    const newSampleCount = existing.sample_count + 1;
    const newAverage =
      (parseFloat(existing.average_rate) * existing.sample_count + params.rate) /
      newSampleCount;
    const newLow = existing.rate_range_low
      ? Math.min(parseFloat(existing.rate_range_low), params.rate)
      : params.rate;
    const newHigh = existing.rate_range_high
      ? Math.max(parseFloat(existing.rate_range_high), params.rate)
      : params.rate;

    await supabase
      .from('pricing_benchmarks')
      .update({
        average_rate: newAverage,
        rate_range_low: newLow,
        rate_range_high: newHigh,
        sample_count: newSampleCount,
        source: params.source || existing.source,
        last_updated: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Insert new record
    await supabase.from('pricing_benchmarks').insert({
      service_category: params.serviceCategory,
      service_description: params.serviceDescription,
      region: params.region || null,
      average_rate: params.rate,
      rate_range_low: params.rate,
      rate_range_high: params.rate,
      source: params.source || 'Web search',
      sample_count: 1,
    });
  }
}
