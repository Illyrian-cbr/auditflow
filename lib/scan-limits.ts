import { createServerClient } from './supabase';
import { TIER_LIMITS, SubscriptionTier } from '@/types';

export async function checkScanLimit(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: scanCount } = await supabase
    .from('scan_counts')
    .select('*')
    .eq('user_id', userId)
    .lte('billing_period_start', now)
    .gte('billing_period_end', now)
    .single();

  if (!scanCount) {
    // No record for current period — get user tier and create one
    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const tier = (user?.subscription_tier || 'free') as SubscriptionTier;
    const limit = TIER_LIMITS[tier];
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabase.from('scan_counts').insert({
      user_id: userId,
      billing_period_start: periodStart.toISOString(),
      billing_period_end: periodEnd.toISOString(),
      count: 0,
      limit: limit,
    });

    return { allowed: true, used: 0, limit, remaining: limit };
  }

  const used = scanCount.count;
  const limit = scanCount.limit;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    used,
    limit,
    remaining,
  };
}

export async function incrementScanCount(userId: string): Promise<void> {
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: scanCount } = await supabase
    .from('scan_counts')
    .select('*')
    .eq('user_id', userId)
    .lte('billing_period_start', now)
    .gte('billing_period_end', now)
    .single();

  if (scanCount) {
    await supabase
      .from('scan_counts')
      .update({ count: scanCount.count + 1 })
      .eq('user_id', scanCount.user_id)
      .eq('billing_period_start', scanCount.billing_period_start);
  }
}

export async function resetScanCount(
  userId: string,
  tier: SubscriptionTier
): Promise<void> {
  const supabase = createServerClient();
  const limit = TIER_LIMITS[tier];
  const periodStart = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Upsert: delete old period records and insert new one
  await supabase
    .from('scan_counts')
    .delete()
    .eq('user_id', userId);

  await supabase.from('scan_counts').insert({
    user_id: userId,
    billing_period_start: periodStart.toISOString(),
    billing_period_end: periodEnd.toISOString(),
    count: 0,
    limit,
  });
}
