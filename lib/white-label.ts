import { createServerClient } from './supabase';
import type { WhiteLabelConfig } from '@/types';

export async function getWhiteLabelConfig(
  partnerId: string
): Promise<WhiteLabelConfig | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('white_label_configs')
    .select('*')
    .eq('partner_user_id', partnerId)
    .single();

  if (error || !data) return null;

  return data as WhiteLabelConfig;
}

export async function getPartnerBranding(
  domain: string
): Promise<WhiteLabelConfig | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('white_label_configs')
    .select('*')
    .eq('custom_domain', domain)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  return data as WhiteLabelConfig;
}

export async function updateBrandingConfig(
  partnerId: string,
  config: Partial<WhiteLabelConfig>
): Promise<WhiteLabelConfig> {
  const supabase = createServerClient();

  // Only allow updating safe branding fields
  const allowedFields: Partial<WhiteLabelConfig> = {};
  if (config.brand_name !== undefined) allowedFields.brand_name = config.brand_name;
  if (config.logo_url !== undefined) allowedFields.logo_url = config.logo_url;
  if (config.primary_color !== undefined) allowedFields.primary_color = config.primary_color;
  if (config.accent_color !== undefined) allowedFields.accent_color = config.accent_color;

  const { data, error } = await supabase
    .from('white_label_configs')
    .update(allowedFields)
    .eq('partner_user_id', partnerId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to update branding config: ${error?.message ?? 'Unknown error'}`
    );
  }

  return data as WhiteLabelConfig;
}
