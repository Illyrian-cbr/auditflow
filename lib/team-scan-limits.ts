import { createServerClient } from './supabase';
import { TIER_LIMITS } from '@/types';
import type { SubscriptionTier } from '@/types';

export async function checkTeamScanLimit(teamId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: scanCount } = await supabase
    .from('team_scan_counts')
    .select('*')
    .eq('team_id', teamId)
    .lte('billing_period_start', now)
    .gte('billing_period_end', now)
    .single();

  if (!scanCount) {
    // No record for current period — get team tier and create one
    const { data: team } = await supabase
      .from('teams')
      .select('subscription_tier')
      .eq('id', teamId)
      .single();

    const tier = (team?.subscription_tier || 'team_starter') as SubscriptionTier;
    const limit = TIER_LIMITS[tier];
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabase.from('team_scan_counts').insert({
      team_id: teamId,
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

export async function incrementTeamScanCount(teamId: string): Promise<void> {
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: scanCount } = await supabase
    .from('team_scan_counts')
    .select('*')
    .eq('team_id', teamId)
    .lte('billing_period_start', now)
    .gte('billing_period_end', now)
    .single();

  if (scanCount) {
    await supabase
      .from('team_scan_counts')
      .update({ count: scanCount.count + 1 })
      .eq('team_id', scanCount.team_id)
      .eq('billing_period_start', scanCount.billing_period_start);
  }
}

export async function resetTeamScanCount(
  teamId: string,
  tier: SubscriptionTier
): Promise<void> {
  const supabase = createServerClient();
  const limit = TIER_LIMITS[tier];
  const periodStart = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Delete old period records and insert new one
  await supabase
    .from('team_scan_counts')
    .delete()
    .eq('team_id', teamId);

  await supabase.from('team_scan_counts').insert({
    team_id: teamId,
    billing_period_start: periodStart.toISOString(),
    billing_period_end: periodEnd.toISOString(),
    count: 0,
    limit,
  });
}
