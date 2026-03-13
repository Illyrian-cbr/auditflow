import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server-auth';
import { createServerClient } from '@/lib/supabase';
import type { IntegrationProvider } from '@/types';

/**
 * POST /api/integrations/disconnect
 *
 * Disconnects an accounting integration for the authenticated user.
 * Sets is_active to false and clears encrypted tokens from storage.
 *
 * Request body: { provider: 'quickbooks' | 'xero' }
 * Response: { success: true }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
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

    const body = await request.json();
    const provider = body.provider as IntegrationProvider;

    if (!provider || !['quickbooks', 'xero'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "quickbooks" or "xero".' },
        { status: 400 }
      );
    }

    const serverSupabase = createServerClient();

    // Deactivate the integration and clear sensitive token data
    const { error: updateError } = await serverSupabase
      .from('integrations')
      .update({
        is_active: false,
        access_token_encrypted: '',
        refresh_token_encrypted: '',
        token_expires_at: new Date(0).toISOString(),
      })
      .eq('user_id', user.id)
      .eq('provider', provider);

    if (updateError) {
      console.error('Failed to disconnect integration:', updateError);
      return NextResponse.json(
        { error: 'Failed to disconnect integration' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Integration disconnect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
