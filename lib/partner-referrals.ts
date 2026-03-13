import { createServerClient } from './supabase';

const REVENUE_SHARE_PERCENT = 0.2; // 20%

export async function trackReferral(
  partnerId: string,
  clientUserId: string,
  scanId: string,
  revenueAmount: number
): Promise<void> {
  const supabase = createServerClient();

  const revenueShareAmount = revenueAmount * REVENUE_SHARE_PERCENT;

  const { error } = await supabase.from('partner_referrals').insert({
    partner_id: partnerId,
    client_user_id: clientUserId,
    scan_id: scanId,
    revenue_amount: revenueAmount,
    revenue_share_amount: revenueShareAmount,
  });

  if (error) {
    throw new Error(`Failed to track referral: ${error.message}`);
  }
}

export async function getPartnerRevenue(partnerId: string): Promise<{
  totalRevenue: number;
  totalShare: number;
  monthlyBreakdown: { month: string; revenue: number; share: number }[];
}> {
  const supabase = createServerClient();

  // Fetch all referrals for this partner
  const { data: referrals, error } = await supabase
    .from('partner_referrals')
    .select('revenue_amount, revenue_share_amount, created_at')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch partner revenue: ${error.message}`);
  }

  const rows = referrals ?? [];

  let totalRevenue = 0;
  let totalShare = 0;
  const monthlyMap = new Map<string, { revenue: number; share: number }>();

  for (const row of rows) {
    totalRevenue += row.revenue_amount;
    totalShare += row.revenue_share_amount;

    // Group by YYYY-MM
    const month = row.created_at.slice(0, 7);
    const existing = monthlyMap.get(month) ?? { revenue: 0, share: 0 };
    existing.revenue += row.revenue_amount;
    existing.share += row.revenue_share_amount;
    monthlyMap.set(month, existing);
  }

  const monthlyBreakdown = Array.from(monthlyMap.entries()).map(
    ([month, data]) => ({
      month,
      revenue: data.revenue,
      share: data.share,
    })
  );

  return { totalRevenue, totalShare, monthlyBreakdown };
}

export async function getPartnerClients(partnerId: string): Promise<
  {
    userId: string;
    email: string;
    scansCount: number;
    joinedAt: string;
  }[]
> {
  const supabase = createServerClient();

  // Get distinct client user IDs from referrals
  const { data: referrals, error: refError } = await supabase
    .from('partner_referrals')
    .select('client_user_id, created_at')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: true });

  if (refError) {
    throw new Error(`Failed to fetch partner clients: ${refError.message}`);
  }

  if (!referrals || referrals.length === 0) return [];

  // Deduplicate clients and track earliest join date
  const clientMap = new Map<string, string>();
  for (const ref of referrals) {
    if (!clientMap.has(ref.client_user_id)) {
      clientMap.set(ref.client_user_id, ref.created_at);
    }
  }

  const clientUserIds = Array.from(clientMap.keys());

  // Fetch user emails
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email')
    .in('id', clientUserIds);

  if (usersError) {
    throw new Error(`Failed to fetch client users: ${usersError.message}`);
  }

  const userMap = new Map(
    (users ?? []).map((u) => [u.id, u.email as string])
  );

  // Get scan counts for each client
  const clients = await Promise.all(
    clientUserIds.map(async (userId) => {
      const { count } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      return {
        userId,
        email: userMap.get(userId) ?? 'Unknown',
        scansCount: count ?? 0,
        joinedAt: clientMap.get(userId) ?? '',
      };
    })
  );

  return clients;
}
