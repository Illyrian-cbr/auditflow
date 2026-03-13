import crypto from 'crypto';
import { createServerClient } from './supabase';
import type { ApiKey } from '@/types';

const KEY_PREFIX = 'af_live_';

/**
 * Generate a new API key with the standard prefix + 32 random hex characters.
 */
export function generateApiKey(): string {
  return KEY_PREFIX + crypto.randomBytes(16).toString('hex');
}

/**
 * Create a SHA-256 hash of an API key for secure storage.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Create a new API key for a user.
 * Generates the key, stores the hash + prefix in the api_keys table,
 * and returns the plaintext key (shown once to the user).
 */
export async function createApiKey(
  userId: string,
  name: string
): Promise<{ key: string; id: string }> {
  const supabase = createServerClient();

  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = key.substring(0, 12) + '...';

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }

  return { key, id: data.id };
}

/**
 * Revoke an API key by setting is_active to false.
 * Verifies ownership before revoking.
 */
export async function revokeApiKey(
  keyId: string,
  userId: string
): Promise<void> {
  const supabase = createServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from('api_keys')
    .select('id, user_id')
    .eq('id', keyId)
    .single();

  if (fetchError || !existing) {
    throw new Error('API key not found');
  }

  if (existing.user_id !== userId) {
    throw new Error('Unauthorized: you do not own this API key');
  }

  const { error: updateError } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', keyId);

  if (updateError) {
    throw new Error(`Failed to revoke API key: ${updateError.message}`);
  }
}

/**
 * List all API keys for a user.
 * Never returns the key_hash field.
 */
export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, key_prefix, name, created_at, last_used_at, is_active')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list API keys: ${error.message}`);
  }

  return (data || []) as ApiKey[];
}
