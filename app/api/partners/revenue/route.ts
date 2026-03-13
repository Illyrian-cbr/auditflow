import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server-auth';
import { getPartnerRevenue } from '@/lib/partner-referrals';

/**
 * GET /api/partners/revenue — Get partner revenue data.
 * Auth: cookie-based (dashboard route).
 */
export async function GET() {
  try {
    const authClient = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const revenue = await getPartnerRevenue(user.id);

    return NextResponse.json(revenue);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Partner revenue error:', message);
    return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 });
  }
}
