import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server-auth';
import { createServerClient } from '@/lib/supabase';
import { decrypt } from '@/lib/integrations/token-encryption';
import { fetchQuickBooksInvoices } from '@/lib/integrations/quickbooks';
import { fetchXeroInvoices } from '@/lib/integrations/xero';
import type { IntegrationProvider } from '@/types';

/**
 * GET /api/integrations/invoices?provider=quickbooks|xero
 *
 * Fetches invoices from the connected accounting provider.
 * Looks up the user's active integration, decrypts the access token,
 * and calls the appropriate provider's fetch function.
 *
 * Since the fetch functions are currently scaffolded with TODO stubs,
 * this will return a friendly error message indicating the integration
 * is not fully configured yet.
 *
 * Query params: provider (required)
 * Response: { invoices: any[] } or { error: string, invoices: [] }
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') as IntegrationProvider | null;

    if (!provider || !['quickbooks', 'xero'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid or missing provider. Use ?provider=quickbooks or ?provider=xero' },
        { status: 400 }
      );
    }

    // Look up the user's active integration for this provider
    const serverSupabase = createServerClient();
    const { data: integration, error: lookupError } = await serverSupabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('is_active', true)
      .maybeSingle();

    if (lookupError) {
      console.error('Integration lookup error:', lookupError);
      return NextResponse.json(
        { error: 'Failed to look up integration' },
        { status: 500 }
      );
    }

    if (!integration) {
      return NextResponse.json(
        { error: `No active ${provider} integration found. Please connect first.` },
        { status: 404 }
      );
    }

    // Check if token has expired
    if (new Date(integration.token_expires_at) < new Date()) {
      // TODO: Implement token refresh flow using the refresh_token
      // For now, prompt the user to reconnect
      return NextResponse.json(
        { error: 'Access token has expired. Please reconnect the integration.', invoices: [] },
        { status: 401 }
      );
    }

    // Decrypt the access token
    const accessToken = decrypt(integration.access_token_encrypted);

    // Fetch invoices from the provider
    let invoices: any[];
    try {
      if (provider === 'quickbooks') {
        if (!integration.realm_id) {
          return NextResponse.json(
            { error: 'QuickBooks realm ID is missing. Please reconnect.', invoices: [] },
            { status: 400 }
          );
        }
        invoices = await fetchQuickBooksInvoices(accessToken, integration.realm_id);
      } else {
        if (!integration.tenant_id) {
          return NextResponse.json(
            { error: 'Xero tenant ID is missing. Please reconnect.', invoices: [] },
            { status: 400 }
          );
        }
        invoices = await fetchXeroInvoices(accessToken, integration.tenant_id);
      }
    } catch (fetchError) {
      // The scaffolded TODO functions throw descriptive errors.
      // Return a user-friendly message indicating the integration isn't fully set up.
      const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      const isNotConfigured =
        message.includes('not yet configured') || message.includes('not yet implemented');

      if (isNotConfigured) {
        return NextResponse.json({
          error: 'Integration not fully configured. Invoice import will be available once the API connection is implemented.',
          invoices: [],
        });
      }

      // Unexpected error — log and return
      console.error(`${provider} invoice fetch error:`, fetchError);
      return NextResponse.json(
        { error: `Failed to fetch invoices from ${provider}`, invoices: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Invoices route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', invoices: [] },
      { status: 500 }
    );
  }
}
