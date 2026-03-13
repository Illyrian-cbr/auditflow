import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createRouteHandlerClient } from '@/lib/supabase-server-auth';
import { createApiKey, listApiKeys } from '@/lib/api-keys';
import type { SubscriptionTier } from '@/types';

// Tiers that are allowed to create API keys
const API_ELIGIBLE_TIERS: SubscriptionTier[] = ['pro', 'team_starter', 'team_pro'];

/**
 * GET /api/keys — List the authenticated user's API keys.
 * Uses cookie-based auth (dashboard route).
 */
export async function GET() {
  try {
    const authClient = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const keys = await listApiKeys(user.id);

    return NextResponse.json({ keys });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('List API keys error:', message);
    return NextResponse.json(
      { error: 'Failed to list API keys' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/keys — Create a new API key.
 * Uses cookie-based auth (dashboard route).
 * Body: { name: string }
 * Returns: { id, key, name } — key is shown ONCE.
 */
export async function POST(request: Request) {
  try {
    const authClient = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check user tier
    const serverSupabase = createServerClient();
    const { data: dbUser } = await serverSupabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = (dbUser?.subscription_tier || 'free') as SubscriptionTier;

    if (!API_ELIGIBLE_TIERS.includes(tier)) {
      return NextResponse.json(
        { error: 'API keys are available for Pro and Team plans only. Please upgrade to access the API.' },
        { status: 403 }
      );
    }

    // Parse body
    let body: { name: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body. Expected: { name: string }' },
        { status: 400 }
      );
    }

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'A key name is required' },
        { status: 400 }
      );
    }

    const name = body.name.trim();

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Key name must be 100 characters or fewer' },
        { status: 400 }
      );
    }

    const { key, id } = await createApiKey(user.id, name);

    return NextResponse.json({ id, key, name }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Create API key error:', message);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
