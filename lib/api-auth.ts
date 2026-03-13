import { NextRequest } from 'next/server';
import { createServerClient } from './supabase';
import { hashApiKey } from './api-keys';
import type { User, SubscriptionTier } from '@/types';

// Tiers that are allowed to use the API
const API_ALLOWED_TIERS: SubscriptionTier[] = ['pro', 'team_starter', 'team_pro'];

/**
 * Authenticate an API request using a Bearer token.
 *
 * Extracts the token from the Authorization header, hashes it,
 * looks up the matching active API key, fetches the user, and
 * verifies the user's tier allows API access (Pro/Team only).
 *
 * Returns the user and their tier, or null if authentication fails.
 */
export async function authenticateApiRequest(
  request: NextRequest
): Promise<{ user: User; tier: SubscriptionTier } | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return null;
  }

  const keyHash = hashApiKey(token);
  const supabase = createServerClient();

  // Look up the API key by hash
  const { data: apiKey, error: keyError } = await supabase
    .from('api_keys')
    .select('id, user_id')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  if (keyError || !apiKey) {
    return null;
  }

  // Update last_used_at timestamp
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id);

  // Fetch the user from the users table
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', apiKey.user_id)
    .single();

  if (userError || !user) {
    return null;
  }

  const tier = (user.subscription_tier || 'free') as SubscriptionTier;

  // Only Pro/Team tier users can use the API
  if (!API_ALLOWED_TIERS.includes(tier)) {
    return null;
  }

  return { user: user as User, tier };
}
